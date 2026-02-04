import dayjs from 'dayjs';

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
  const rentCents = computeRentCents(lease, periodStart);

  const fixedChargeItems = charges
    .filter((c) => c.isActive)
    .filter((c) => shouldBillCharge(lease.startDate, periodStart, c.billingCycleMonths))
    .filter((c) => c.mode === 'FIXED');

  const meteredChargeItems = charges
    .filter((c) => c.isActive)
    .filter((c) => shouldBillCharge(lease.startDate, periodStart, c.billingCycleMonths))
    .filter((c) => c.mode === 'METERED');

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
  if (item.status !== 'PENDING_READING') throw new HttpError(400, 'INVALID_STATUS', '该明细不需要抄表确认');
  if (item.unitPriceCents == null) throw new HttpError(400, 'INVALID_ITEM', '缺少 unitPriceCents');

  const meterStart = params.meterStart ?? 0;
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

