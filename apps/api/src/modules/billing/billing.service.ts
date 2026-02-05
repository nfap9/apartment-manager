import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

import type { Lease, LeaseCharge } from '../../../prisma/generated/prisma/client';
import { prisma } from '../../db';
import { HttpError } from '../../http/httpError';

function monthsDiff(from: Date, to: Date) {
  return dayjs(to).diff(dayjs(from), 'month');
}

function addMonths(d: Date, months: number) {
  return dayjs(d).add(months, 'month').toDate();
}

function minDate(a: Date, b: Date) {
  return a.getTime() <= b.getTime() ? a : b;
}

export function computeRentCents(lease: Lease, periodStart: Date) {
  const base = lease.baseRentCents;
  if (lease.rentIncreaseType === 'NONE') return base;

  const interval = lease.rentIncreaseIntervalMonths || 12;
  if (interval <= 0) return base;

  const m = Math.max(0, monthsDiff(lease.startDate, periodStart));
  const k = Math.floor(m / interval);
  if (k <= 0) return base;

  if (lease.rentIncreaseType === 'FIXED') {
    return base + k * (lease.rentIncreaseValue ?? 0);
  }

  // PERCENT: rentIncreaseValue is treated as integer percent, e.g. 5 => +5% each interval
  const p = (lease.rentIncreaseValue ?? 0) / 100;
  return Math.round(base * Math.pow(1 + p, k));
}

function shouldBillCharge(leaseStartDate: Date, periodStart: Date, chargeCycleMonths: number) {
  const cycle = chargeCycleMonths || 1;
  if (cycle <= 1) return true;
  const m = Math.max(0, monthsDiff(leaseStartDate, periodStart));
  return m % cycle === 0;
}

/**
 * 根据费用类型和billingTiming确定费用的账期
 * @param charge 费用项
 * @param invoicePeriodStart 账单的periodStart（通常是下个月的第一天）
 * @param invoicePeriodEnd 账单的periodEnd（通常是下个月的最后一天）
 * @returns 费用的实际账期 { start: Date, end: Date }
 */
function getChargePeriod(
  charge: LeaseCharge,
  invoicePeriodStart: Date,
  invoicePeriodEnd: Date,
): { start: Date; end: Date } {
  // 房租：预付，账期是下个月（invoicePeriodStart 到 invoicePeriodEnd）
  // 水电费：后付，账期是上个月
  // 其他费用：根据 billingTiming 配置

  // 判断是否是水电费
  const isUtility = charge.feeType === 'WATER' || charge.feeType === 'ELECTRICITY';

  // 确定 billingTiming
  let billingTiming: 'PREPAID' | 'POSTPAID';
  if (isUtility) {
    // 水电费默认后付
    billingTiming = charge.billingTiming === 'PREPAID' ? 'PREPAID' : 'POSTPAID';
  } else {
    // 其他费用默认预付，但可以配置
    billingTiming = charge.billingTiming === 'POSTPAID' ? 'POSTPAID' : 'PREPAID';
  }

  if (billingTiming === 'POSTPAID') {
    // 后付：账期是上个月
    const periodStart = addMonths(invoicePeriodStart, -1);
    const periodEnd = dayjs(invoicePeriodStart).subtract(1, 'day').toDate();
    return { start: periodStart, end: periodEnd };
  } else {
    // 预付：账期是下个月（invoicePeriodStart 到 invoicePeriodEnd）
    return { start: invoicePeriodStart, end: invoicePeriodEnd };
  }
}

type GenerateDueInvoicesOptions = {
  organizationId?: string;
  now?: Date;
};

export async function generateDueInvoices(options: GenerateDueInvoicesOptions = {}) {
  const now = options.now ?? new Date();

  const leases = await prisma.lease.findMany({
    where: {
      status: 'ACTIVE',
      ...(options.organizationId ? { organizationId: options.organizationId } : {}),
    },
    include: {
      charges: { where: { isActive: true } },
      invoices: { orderBy: { periodEnd: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'asc' },
  });

  let createdCount = 0;
  const createdInvoiceIds: string[] = [];

  for (const lease of leases) {
    const lastInvoice = lease.invoices[0];
    let periodStart = lastInvoice ? lastInvoice.periodEnd : lease.startDate;

    // Catch up multiple periods if needed (cap to avoid infinite loops)
    for (let i = 0; i < 24; i++) {
      if (periodStart.getTime() > now.getTime()) break;
      if (periodStart.getTime() >= lease.endDate.getTime()) break;

      const expectedEnd = addMonths(periodStart, lease.billingCycleMonths || 1);
      const periodEnd = minDate(expectedEnd, lease.endDate);
      if (periodEnd.getTime() <= periodStart.getTime()) break;

      try {
        const invoiceId = await createInvoiceForLeasePeriod(lease, lease.charges, periodStart, periodEnd);
        createdCount += 1;
        createdInvoiceIds.push(invoiceId);
      } catch (err) {
        // If invoice already exists (unique constraint), stop generating further periods.
        const code = (err as { code?: string } | null)?.code;
        if (code === 'P2002') break;
        throw err;
      }

      periodStart = periodEnd;
    }
  }

  return { createdCount, createdInvoiceIds };
}

async function createInvoiceForLeasePeriod(
  lease: Lease,
  charges: LeaseCharge[],
  periodStart: Date,
  periodEnd: Date,
) {
  // periodStart 和 periodEnd 是账单的账期（通常是下个月）
  // 房租：预付，账期是 periodStart 到 periodEnd（下个月）
  const rentCents = computeRentCents(lease, periodStart);

  // 筛选需要计费的费用项
  // 注意：对于后付费用（如水电费），需要检查上个月的周期
  const allChargeItems = charges.filter((c) => c.isActive);

  // 分别处理固定费用和按量计费
  const fixedChargeItems: LeaseCharge[] = [];
  const meteredChargeItems: LeaseCharge[] = [];

  for (const charge of allChargeItems) {
    // 确定费用的账期
    const chargePeriod = getChargePeriod(charge, periodStart, periodEnd);
    
    // 检查是否应该计费（根据费用的计费周期）
    if (shouldBillCharge(lease.startDate, chargePeriod.start, charge.billingCycleMonths)) {
      if (charge.mode === 'FIXED') {
        fixedChargeItems.push(charge);
      } else if (charge.mode === 'METERED') {
        meteredChargeItems.push(charge);
      }
    }
  }

  const fixedChargeTotal = fixedChargeItems.reduce((sum, c) => sum + (c.fixedAmountCents ?? 0), 0);
  const totalAmountCents = rentCents + fixedChargeTotal;

  const dueDate = periodStart;

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        organizationId: lease.organizationId,
        leaseId: lease.id,
        status: 'ISSUED',
        periodStart,
        periodEnd,
        dueDate,
        totalAmountCents,
      },
    });

    // 获取上一个账期的读数，用于自动填充起度
    const previousInvoice = await tx.invoice.findFirst({
      where: {
        leaseId: lease.id,
        periodEnd: { lt: periodStart },
      },
      include: {
        items: {
          where: {
            mode: 'METERED',
            status: 'CONFIRMED',
          },
        },
      },
      orderBy: { periodEnd: 'desc' },
    });

    // 构建上一个账期的读数映射表（按leaseChargeId）
    const previousReadings = new Map<string, number>();
    if (previousInvoice) {
      for (const item of previousInvoice.items) {
        if (item.leaseChargeId && item.meterEnd != null) {
          previousReadings.set(item.leaseChargeId, item.meterEnd);
        }
      }
    }

    const items = [
      {
        invoiceId: created.id,
        name: '房租',
        kind: 'RENT' as const,
        mode: 'FIXED' as const,
        status: 'CONFIRMED' as const,
        amountCents: rentCents,
      },
      ...fixedChargeItems.map((c) => ({
        invoiceId: created.id,
        leaseChargeId: c.id,
        name: c.name,
        kind: 'CHARGE' as const,
        mode: c.mode,
        status: 'CONFIRMED' as const,
        amountCents: c.fixedAmountCents ?? 0,
      })),
      ...meteredChargeItems.map((c) => ({
        invoiceId: created.id,
        leaseChargeId: c.id,
        name: c.name,
        kind: 'CHARGE' as const,
        mode: c.mode,
        status: 'PENDING_READING' as const,
        amountCents: null,
        unitPriceCents: c.unitPriceCents ?? null,
        unitName: c.unitName ?? null,
        meterStart: previousReadings.get(c.id) ?? null, // 自动填充上一个账期的止度作为起度
      })),
    ];

    await tx.invoiceItem.createMany({ data: items });

    // Notify billing managers
    const managers = await tx.membership.findMany({
      where: {
        organizationId: lease.organizationId,
        status: 'ACTIVE',
        roles: {
          some: {
            role: {
              permissions: {
                some: { permission: { key: 'billing.manage' } },
              },
            },
          },
        },
      },
      select: { userId: true },
    });

    if (managers.length) {
      await tx.notification.createMany({
        data: managers.map((m) => ({
          organizationId: lease.organizationId,
          userId: m.userId,
          type: 'INVOICE_CREATED',
          title: '新账单已生成',
          body: `账期：${dayjs(periodStart).format('YYYY-MM-DD')} ~ ${dayjs(periodEnd).format('YYYY-MM-DD')}`,
          entityType: 'Invoice',
          entityId: created.id,
        })),
      });
    }

    return created;
  });

  return invoice.id;
}

export async function confirmInvoiceItemReading(params: {
  organizationId: string;
  invoiceId: string;
  itemId: string;
  meterStart?: number;
  meterEnd: number;
}) {
  const item = await prisma.invoiceItem.findFirst({
    where: {
      id: params.itemId,
      invoiceId: params.invoiceId,
      invoice: { id: params.invoiceId, organizationId: params.organizationId },
    },
    include: { invoice: true },
  });

  if (!item) throw new HttpError(404, 'INVOICE_ITEM_NOT_FOUND', '账单明细不存在');
  if (item.status !== 'PENDING_READING') throw new HttpError(400, 'INVALID_STATUS', '该明细不需要记录读数');
  if (item.unitPriceCents == null) throw new HttpError(400, 'INVALID_ITEM', '缺少 unitPriceCents');

  // 如果meterStart未提供，尝试从上一个账期获取，或者使用当前item的meterStart，或者默认为0
  let meterStart = params.meterStart;
  if (meterStart == null) {
    if (item.meterStart != null) {
      // 使用当前item已保存的meterStart（可能是生成发票时自动填充的）
      meterStart = item.meterStart;
    } else if (item.leaseChargeId) {
      // 从上一个账期获取止度作为起度
      const previousItem = await prisma.invoiceItem.findFirst({
        where: {
          leaseChargeId: item.leaseChargeId,
          invoice: {
            leaseId: item.invoice.leaseId,
            periodEnd: { lt: item.invoice.periodStart },
          },
          status: 'CONFIRMED',
          meterEnd: { not: null },
        },
        include: { invoice: true },
        orderBy: { invoice: { periodEnd: 'desc' } },
      });
      meterStart = previousItem?.meterEnd ?? 0;
    } else {
      meterStart = 0;
    }
  }

  const meterEnd = params.meterEnd;
  if (meterEnd < meterStart) throw new HttpError(400, 'INVALID_READING', 'meterEnd 必须大于等于 meterStart');

  const quantity = meterEnd - meterStart;
  const amountCents = Math.round(quantity * item.unitPriceCents);

  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.update({
      where: { id: item.id },
      data: {
        meterStart,
        meterEnd,
        quantity,
        amountCents,
        status: 'CONFIRMED',
      },
    });

    const items = await tx.invoiceItem.findMany({
      where: { invoiceId: item.invoiceId },
      select: { amountCents: true, status: true },
    });

    const total = items.reduce((sum, it) => sum + (it.status === 'CONFIRMED' ? (it.amountCents ?? 0) : 0), 0);

    await tx.invoice.update({
      where: { id: item.invoiceId },
      data: { totalAmountCents: total },
    });
  });

  return { ok: true };
}

/**
 * 确认账单：检查所有读数是否已确认，确认后更新账单状态
 */
export async function confirmInvoice(params: { organizationId: string; invoiceId: string }) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: params.invoiceId,
      organizationId: params.organizationId,
    },
    include: {
      items: true,
    },
  });

  if (!invoice) throw new HttpError(404, 'INVOICE_NOT_FOUND', '账单不存在');
  if (invoice.status === 'PAID') throw new HttpError(400, 'INVALID_STATUS', '账单已支付，无需确认');
  if (invoice.status === 'VOID') throw new HttpError(400, 'INVALID_STATUS', '账单已作废，无法确认');

  // 检查是否所有读数都已确认
  const pendingReadings = invoice.items.filter(
    (item) => item.mode === 'METERED' && item.status === 'PENDING_READING',
  );

  if (pendingReadings.length > 0) {
    throw new HttpError(400, 'PENDING_READINGS', '存在待确认的读数，请先确认所有读数');
  }

  // 更新账单状态为 ISSUED（如果还不是）
  if (invoice.status === 'DRAFT') {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'ISSUED' },
    });
  }

  return { ok: true };
}

/**
 * 标记账单为已支付
 */
export async function markInvoiceAsPaid(params: { organizationId: string; invoiceId: string }) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: params.invoiceId,
      organizationId: params.organizationId,
    },
  });

  if (!invoice) throw new HttpError(404, 'INVOICE_NOT_FOUND', '账单不存在');
  if (invoice.status === 'PAID') throw new HttpError(400, 'INVALID_STATUS', '账单已支付');
  if (invoice.status === 'VOID') throw new HttpError(400, 'INVALID_STATUS', '账单已作废，无法标记为已支付');

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
    },
  });

  return { ok: true };
}



/**
 * 导出账单为Excel文件
 */
export async function exportInvoiceToExcel(params: { organizationId: string; invoiceId: string }) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: params.invoiceId,
      organizationId: params.organizationId,
    },
    include: {
      lease: {
        include: {
          room: {
            include: {
              apartment: true,
            },
          },
          tenant: true,
        },
      },
      items: {
        orderBy: [
          { kind: 'asc' },
          { createdAt: 'asc' },
        ],
      },
    },
  });

  if (!invoice) throw new HttpError(404, 'INVOICE_NOT_FOUND', '账单不存在');

  // 创建工作簿
  const workbook = XLSX.utils.book_new();

  // 创建账单基本信息
  const basicInfo = [
    ['账单信息', ''],
    ['账单编号', invoice.id],
    ['公寓', invoice.lease.room.apartment.name],
    ['房间', invoice.lease.room.name],
    ['租客', invoice.lease.tenant.name],
    ['租客电话', invoice.lease.tenant.phone],
    ['账期开始', dayjs(invoice.periodStart).format('YYYY-MM-DD')],
    ['账期结束', dayjs(invoice.periodEnd).format('YYYY-MM-DD')],
    ['到期日期', dayjs(invoice.dueDate).format('YYYY-MM-DD')],
    ['账单状态', invoice.status],
    ['总金额', `¥${(invoice.totalAmountCents / 100).toFixed(2)}`],
    ['生成时间', dayjs(invoice.issuedAt).format('YYYY-MM-DD HH:mm:ss')],
    invoice.paidAt ? ['支付时间', dayjs(invoice.paidAt).format('YYYY-MM-DD HH:mm:ss')] : ['支付时间', '未支付'],
  ];

  const basicInfoSheet = XLSX.utils.aoa_to_sheet(basicInfo);
  XLSX.utils.book_append_sheet(workbook, basicInfoSheet, '账单信息');

  // 创建账单明细
  const itemsData = [
    ['项目名称', '类型', '计费模式', '起度', '止度', '用量', '单价', '单位', '金额', '状态'],
  ];

  for (const item of invoice.items) {
    const row = [
      item.name,
      item.kind === 'RENT' ? '房租' : item.kind === 'DEPOSIT' ? '押金' : '费用',
      item.mode === 'FIXED' ? '固定' : item.mode === 'METERED' ? '按量' : '-',
      item.meterStart != null ? item.meterStart.toFixed(2) : '-',
      item.meterEnd != null ? item.meterEnd.toFixed(2) : '-',
      item.quantity != null ? item.quantity.toFixed(2) : '-',
      item.unitPriceCents != null ? `¥${(item.unitPriceCents / 100).toFixed(2)}` : '-',
      item.unitName || '-',
      item.amountCents != null ? `¥${(item.amountCents / 100).toFixed(2)}` : '-',
      item.status === 'PENDING_READING' ? '待确认读数' : '已确认',
    ];
    itemsData.push(row);
  }

  // 添加合计
  itemsData.push([
    '合计',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    `¥${(invoice.totalAmountCents / 100).toFixed(2)}`,
    '',
  ]);

  const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
  
  // 设置列宽
  itemsSheet['!cols'] = [
    { wch: 15 }, // 项目名称
    { wch: 8 },  // 类型
    { wch: 10 }, // 计费模式
    { wch: 10 }, // 起度
    { wch: 10 }, // 止度
    { wch: 10 }, // 用量
    { wch: 12 }, // 单价
    { wch: 8 },  // 单位
    { wch: 12 }, // 金额
    { wch: 12 }, // 状态
  ];

  XLSX.utils.book_append_sheet(workbook, itemsSheet, '账单明细');

  // 生成Excel文件缓冲区
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return excelBuffer;
}
