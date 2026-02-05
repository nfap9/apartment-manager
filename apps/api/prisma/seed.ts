import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';

import { PERMISSION_KEYS } from '../src/rbac/permissionKeys';

import { PrismaClient } from './generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPhone = process.env.SEED_ADMIN_PHONE ?? '13800000000';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin123456';
  const orgName = process.env.SEED_ORG_NAME ?? '示例组织';

  await Promise.all(
    PERMISSION_KEYS.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key },
      }),
    ),
  );

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      passwordHash,
      displayName: '管理员',
    },
    create: {
      phone: adminPhone,
      passwordHash,
      displayName: '管理员',
    },
  });

  const org =
    (await prisma.organization.findFirst({ where: { name: orgName } })) ??
    (await prisma.organization.create({ data: { name: orgName } }));

  const membership = await prisma.membership.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
    update: { status: 'ACTIVE' },
    create: { userId: admin.id, organizationId: org.id, status: 'ACTIVE' },
  });

  const adminRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Admin' } },
    update: { isSystem: true },
    create: { organizationId: org.id, name: 'Admin', isSystem: true },
  });

  const permissions = await prisma.permission.findMany({
    where: { key: { in: [...PERMISSION_KEYS] } },
  });

  await prisma.rolePermission.createMany({
    data: permissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  await prisma.membershipRole.createMany({
    data: [{ membershipId: membership.id, roleId: adminRole.id }],
    skipDuplicates: true,
  });

  console.log('[seed] 基础数据创建完成');

  // 创建测试数据
  console.log('[seed] 开始创建测试数据...');

  // 创建公寓
  const apartment1 = await prisma.apartment.upsert({
    where: { id: 'apartment-1' },
    update: {},
    create: {
      id: 'apartment-1',
      organizationId: org.id,
      name: '阳光小区A栋',
      address: '北京市朝阳区阳光路123号A栋',
      totalArea: 1200.5,
      floor: 6,
      upstream: {
        create: {
          transferFeeCents: 50000, // 500元
          renovationFeeCents: 100000, // 1000元
          renovationDepositCents: 200000, // 2000元
          upstreamDepositCents: 500000, // 5000元
          upstreamRentBaseCents: 800000, // 8000元
          upstreamRentIncreaseType: 'PERCENT',
          upstreamRentIncreaseValue: 5, // 5%
          upstreamRentIncreaseIntervalMonths: 12,
          notes: '房东要求每年涨租5%',
        },
      },
      feePricings: {
        create: [
          {
            feeType: 'WATER',
            mode: 'METERED',
            unitPriceCents: 500, // 5元/吨
            unitName: '吨',
          },
          {
            feeType: 'ELECTRICITY',
            mode: 'METERED',
            unitPriceCents: 80, // 0.8元/度
            unitName: '度',
          },
          {
            feeType: 'MANAGEMENT',
            mode: 'FIXED',
            fixedAmountCents: 20000, // 200元/月
          },
        ],
      },
    },
  });

  const apartment2 = await prisma.apartment.upsert({
    where: { id: 'apartment-2' },
    update: {},
    create: {
      id: 'apartment-2',
      organizationId: org.id,
      name: '阳光小区B栋',
      address: '北京市朝阳区阳光路123号B栋',
      totalArea: 1500.0,
      floor: 8,
      feePricings: {
        create: [
          {
            feeType: 'WATER',
            mode: 'METERED',
            unitPriceCents: 500,
            unitName: '吨',
          },
          {
            feeType: 'ELECTRICITY',
            mode: 'METERED',
            unitPriceCents: 80,
            unitName: '度',
          },
          {
            feeType: 'INTERNET',
            mode: 'FIXED',
            fixedAmountCents: 10000, // 100元/月
          },
        ],
      },
    },
  });

  console.log('[seed] 公寓创建完成');

  // 创建房间
  const rooms = [];
  const roomNames1 = ['101', '102', '201', '202', '301'];
  const roomNames2 = ['101', '102', '201', '301', '401', '501'];

  for (let i = 0; i < roomNames1.length; i++) {
    const room = await prisma.room.create({
      data: {
        apartmentId: apartment1.id,
        name: roomNames1[i],
        layout: i % 2 === 0 ? '一室一厅' : '两室一厅',
        area: 30 + i * 5,
        notes: `房间${roomNames1[i]}，采光良好`,
        isActive: true,
        isRented: i < 3, // 前3个房间已出租
        facilities: {
          create: [
            { name: '空调', quantity: 1, valueCents: 200000 }, // 2000元
            { name: '热水器', quantity: 1, valueCents: 150000 }, // 1500元
            { name: '床', quantity: 1, valueCents: 80000 }, // 800元
          ],
        },
        pricingPlans: {
          create: [
            {
              durationMonths: 6,
              rentCents: 250000, // 2500元/月
              depositCents: 500000, // 5000元押金
              isActive: true,
            },
            {
              durationMonths: 12,
              rentCents: 230000, // 2300元/月（年付优惠）
              depositCents: 460000, // 4600元押金
              isActive: true,
            },
          ],
        },
      },
    });
    rooms.push(room);
  }

  for (let i = 0; i < roomNames2.length; i++) {
    const room = await prisma.room.create({
      data: {
        apartmentId: apartment2.id,
        name: roomNames2[i],
        layout: i % 3 === 0 ? '一室一厅' : i % 3 === 1 ? '两室一厅' : '三室一厅',
        area: 35 + i * 3,
        notes: `房间${roomNames2[i]}，精装修`,
        isActive: true,
        isRented: i < 2, // 前2个房间已出租
        facilities: {
          create: [
            { name: '空调', quantity: 2, valueCents: 400000 },
            { name: '热水器', quantity: 1, valueCents: 150000 },
            { name: '冰箱', quantity: 1, valueCents: 300000 },
            { name: '床', quantity: 2, valueCents: 160000 },
          ],
        },
        pricingPlans: {
          create: [
            {
              durationMonths: 6,
              rentCents: 300000, // 3000元/月
              depositCents: 600000, // 6000元押金
              isActive: true,
            },
            {
              durationMonths: 12,
              rentCents: 280000, // 2800元/月
              depositCents: 560000, // 5600元押金
              isActive: true,
            },
          ],
        },
      },
    });
    rooms.push(room);
  }

  console.log('[seed] 房间创建完成');

  // 创建租客
  const tenants = [];
  const tenantData = [
    { name: '张三', phone: '13900000001', idNumber: '110101199001011234' },
    { name: '李四', phone: '13900000002', idNumber: '110101199002021234' },
    { name: '王五', phone: '13900000003', idNumber: '110101199003031234' },
    { name: '赵六', phone: '13900000004', idNumber: '110101199004041234' },
    { name: '钱七', phone: '13900000005', idNumber: '110101199005051234' },
    { name: '孙八', phone: '13900000006', idNumber: '110101199006061234' },
  ];

  for (const data of tenantData) {
    let tenant = await prisma.tenant.findFirst({
      where: {
        organizationId: org.id,
        phone: data.phone,
      },
    });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          organizationId: org.id,
          name: data.name,
          phone: data.phone,
          idNumber: data.idNumber,
        },
      });
    }
    tenants.push(tenant);
  }

  console.log('[seed] 租客创建完成');

  // 创建租约
  const now = dayjs();
  const leases = [];

  // 活跃租约1
  const lease1 = await prisma.lease.create({
    data: {
      organizationId: org.id,
      roomId: rooms[0].id,
      tenantId: tenants[0].id,
      status: 'ACTIVE',
      startDate: now.subtract(3, 'month').toDate(),
      endDate: now.add(9, 'month').toDate(),
      billingCycleMonths: 1,
      depositCents: 500000, // 5000元
      baseRentCents: 250000, // 2500元/月
      rentIncreaseType: 'NONE',
      notes: '租客按时交租，无不良记录',
      charges: {
        create: [
          {
            name: '水费',
            feeType: 'WATER',
            mode: 'METERED',
            unitPriceCents: 500,
            unitName: '吨',
            billingCycleMonths: 1,
            isActive: true,
          },
          {
            name: '电费',
            feeType: 'ELECTRICITY',
            mode: 'METERED',
            unitPriceCents: 80,
            unitName: '度',
            billingCycleMonths: 1,
            isActive: true,
          },
          {
            name: '管理费',
            feeType: 'MANAGEMENT',
            mode: 'FIXED',
            fixedAmountCents: 20000, // 200元/月
            billingCycleMonths: 1,
            isActive: true,
          },
        ],
      },
    },
  });
  leases.push(lease1);

  // 活跃租约2
  const lease2 = await prisma.lease.create({
    data: {
      organizationId: org.id,
      roomId: rooms[1].id,
      tenantId: tenants[1].id,
      status: 'ACTIVE',
      startDate: now.subtract(1, 'month').toDate(),
      endDate: now.add(11, 'month').toDate(),
      billingCycleMonths: 1,
      depositCents: 500000,
      baseRentCents: 250000,
      rentIncreaseType: 'PERCENT',
      rentIncreaseValue: 5,
      rentIncreaseIntervalMonths: 12,
      notes: '年付优惠，每年涨租5%',
      charges: {
        create: [
          {
            name: '水费',
            feeType: 'WATER',
            mode: 'METERED',
            unitPriceCents: 500,
            unitName: '吨',
            billingCycleMonths: 1,
            isActive: true,
          },
          {
            name: '电费',
            feeType: 'ELECTRICITY',
            mode: 'METERED',
            unitPriceCents: 80,
            unitName: '度',
            billingCycleMonths: 1,
            isActive: true,
          },
        ],
      },
    },
  });
  leases.push(lease2);

  // 活跃租约3
  const lease3 = await prisma.lease.create({
    data: {
      organizationId: org.id,
      roomId: rooms[5].id, // B栋101
      tenantId: tenants[2].id,
      status: 'ACTIVE',
      startDate: now.subtract(6, 'month').toDate(),
      endDate: now.add(6, 'month').toDate(),
      billingCycleMonths: 1,
      depositCents: 600000, // 6000元
      baseRentCents: 300000, // 3000元/月
      rentIncreaseType: 'FIXED',
      rentIncreaseValue: 10000, // 每年涨100元
      rentIncreaseIntervalMonths: 12,
      notes: 'B栋精装房',
      charges: {
        create: [
          {
            name: '水费',
            feeType: 'WATER',
            mode: 'METERED',
            unitPriceCents: 500,
            unitName: '吨',
            billingCycleMonths: 1,
            isActive: true,
          },
          {
            name: '电费',
            feeType: 'ELECTRICITY',
            mode: 'METERED',
            unitPriceCents: 80,
            unitName: '度',
            billingCycleMonths: 1,
            isActive: true,
          },
          {
            name: '网费',
            feeType: 'INTERNET',
            mode: 'FIXED',
            fixedAmountCents: 10000, // 100元/月
            billingCycleMonths: 1,
            isActive: true,
          },
        ],
      },
    },
  });
  leases.push(lease3);

  // 草稿租约
  const lease4 = await prisma.lease.create({
    data: {
      organizationId: org.id,
      roomId: rooms[2].id,
      tenantId: tenants[3].id,
      status: 'DRAFT',
      startDate: now.add(1, 'month').toDate(),
      endDate: now.add(13, 'month').toDate(),
      billingCycleMonths: 1,
      depositCents: 500000,
      baseRentCents: 250000,
      rentIncreaseType: 'NONE',
      notes: '待签约',
    },
  });
  leases.push(lease4);

  // 已结束租约
  const lease5 = await prisma.lease.create({
    data: {
      organizationId: org.id,
      roomId: rooms[6].id, // B栋102
      tenantId: tenants[4].id,
      status: 'ENDED',
      startDate: now.subtract(15, 'month').toDate(),
      endDate: now.subtract(3, 'month').toDate(),
      billingCycleMonths: 1,
      depositCents: 600000,
      baseRentCents: 300000,
      rentIncreaseType: 'NONE',
      notes: '租期已满，已退租',
    },
  });
  leases.push(lease5);

  console.log('[seed] 租约创建完成');

  // 为活跃租约创建发票
  const activeLeases = leases.filter((l) => l.status === 'ACTIVE');

  for (const lease of activeLeases) {
    // 获取租约的费用
    const charges = await prisma.leaseCharge.findMany({
      where: { leaseId: lease.id, isActive: true },
    });

    // 为每个租约维护读数历史记录（按leaseChargeId）
    const meterReadings = new Map<string, number>();
    
    // 初始化每个METERED费用的起始读数
    for (const charge of charges) {
      if (charge.mode === 'METERED') {
        // 根据费用类型设置不同的起始读数
        if (charge.feeType === 'WATER') {
          meterReadings.set(charge.id, 0); // 水表从0开始
        } else if (charge.feeType === 'ELECTRICITY') {
          meterReadings.set(charge.id, 0); // 电表从0开始
        } else {
          meterReadings.set(charge.id, 0);
        }
      }
    }

    // 创建最近6个月的发票（提供更多历史数据）
    for (let i = 0; i < 6; i++) {
      const periodStart = now.subtract(i, 'month').startOf('month').toDate();
      const periodEnd = now.subtract(i, 'month').endOf('month').toDate();
      const dueDate = now.subtract(i, 'month').add(7, 'day').toDate();

      // 检查发票是否已存在
      const existingInvoice = await prisma.invoice.findUnique({
        where: {
          leaseId_periodStart_periodEnd: {
            leaseId: lease.id,
            periodStart,
            periodEnd,
          },
        },
      });

      if (existingInvoice) {
        // 如果发票已存在，更新读数历史记录
        const existingItems = await prisma.invoiceItem.findMany({
          where: {
            invoiceId: existingInvoice.id,
            mode: 'METERED',
            status: 'CONFIRMED',
            meterEnd: { not: null },
          },
        });
        for (const item of existingItems) {
          if (item.leaseChargeId && item.meterEnd != null) {
            meterReadings.set(item.leaseChargeId, item.meterEnd);
          }
        }
        continue;
      }

      const invoiceItems = [];
      let totalAmount = 0;

      // 租金
      const rentAmount = lease.baseRentCents;
      invoiceItems.push({
        name: '租金',
        kind: 'RENT' as const,
        mode: 'FIXED' as const,
        status: 'CONFIRMED' as const,
        amountCents: rentAmount,
      });
      totalAmount += rentAmount;

      // 各项费用
      for (const charge of charges) {
        if (charge.mode === 'FIXED' && charge.fixedAmountCents) {
          invoiceItems.push({
            name: charge.name,
            kind: 'CHARGE' as const,
            mode: 'FIXED' as const,
            status: 'CONFIRMED' as const,
            amountCents: charge.fixedAmountCents,
            leaseChargeId: charge.id,
          });
          totalAmount += charge.fixedAmountCents;
        } else if (charge.mode === 'METERED') {
          const meterStart = meterReadings.get(charge.id) ?? 0;
          
          // 根据费用类型生成更真实的用量
          let usage: number;
          if (charge.feeType === 'WATER') {
            // 水费：每月5-15吨，夏季稍高
            const isSummer = i <= 2; // 最近3个月是夏季
            usage = isSummer ? 8 + Math.floor(Math.random() * 7) : 5 + Math.floor(Math.random() * 5);
          } else if (charge.feeType === 'ELECTRICITY') {
            // 电费：每月50-150度，夏季和冬季较高
            const isSummerOrWinter = i <= 2 || i >= 4;
            usage = isSummerOrWinter ? 100 + Math.floor(Math.random() * 50) : 50 + Math.floor(Math.random() * 50);
          } else {
            usage = 10 + Math.floor(Math.random() * 20);
          }
          
          const meterEnd = meterStart + usage;
          const amount = Math.round(usage * (charge.unitPriceCents || 0));
          
          // 最近一个月待确认读数，其他月份已确认
          const itemStatus = i === 0 ? 'PENDING_READING' : 'CONFIRMED';
          
          invoiceItems.push({
            name: charge.name,
            kind: 'CHARGE' as const,
            mode: 'METERED' as const,
            status: itemStatus as 'PENDING_READING' | 'CONFIRMED',
            amountCents: itemStatus === 'CONFIRMED' ? amount : null,
            quantity: itemStatus === 'CONFIRMED' ? usage : null,
            unitPriceCents: charge.unitPriceCents || 0,
            unitName: charge.unitName || '',
            meterStart: itemStatus === 'CONFIRMED' ? meterStart : meterStart, // 已确认的保存起度，待确认的也保存起度以便前端显示
            meterEnd: itemStatus === 'CONFIRMED' ? meterEnd : null,
            leaseChargeId: charge.id,
          });
          
          if (itemStatus === 'CONFIRMED') {
            totalAmount += amount;
            // 更新读数历史记录
            meterReadings.set(charge.id, meterEnd);
          }
        }
      }

      // 创建发票
      const invoice = await prisma.invoice.create({
        data: {
          organizationId: org.id,
          leaseId: lease.id,
          status: i === 0 ? 'ISSUED' : i <= 2 ? 'PAID' : 'PAID', // 最近一个月已发出，前两个月已支付
          periodStart,
          periodEnd,
          dueDate,
          totalAmountCents: totalAmount,
          issuedAt: periodStart,
          paidAt: i > 0 ? periodEnd : null,
          items: {
            create: invoiceItems,
          },
        },
      });

      // 创建通知（针对最近一个月的发票）
      if (i === 0) {
        const room = rooms.find((r) => r.id === lease.roomId);
        await prisma.notification.create({
          data: {
            organizationId: org.id,
            userId: admin.id,
            type: 'INVOICE_CREATED',
            title: `新发票已生成 - ${room?.name || '未知房间'}`,
            body: `租客 ${tenants.find((t) => t.id === lease.tenantId)?.name} 的${now.subtract(i, 'month').format('YYYY年MM月')}账单已生成，金额：¥${(totalAmount / 100).toFixed(2)}`,
            entityType: 'Invoice',
            entityId: invoice.id,
          },
        });
      }
    }
  }

  console.log('[seed] 发票创建完成');

  // 创建租约即将到期通知
  const expiringLease = leases.find((l) => l.status === 'ACTIVE');
  if (expiringLease) {
    const daysUntilExpiry = dayjs(expiringLease.endDate).diff(now, 'day');
    if (daysUntilExpiry <= 60) {
      await prisma.notification.create({
        data: {
          organizationId: org.id,
          userId: admin.id,
          type: 'LEASE_EXPIRING',
          title: `租约即将到期 - ${rooms.find((r) => r.id === expiringLease.roomId)?.name}`,
          body: `租约将在${daysUntilExpiry}天后到期，请及时处理`,
          entityType: 'Lease',
          entityId: expiringLease.id,
        },
      });
    }
  }

  console.log('[seed] 通知创建完成');

  console.log('[seed] 所有测试数据创建完成！', {
    adminPhone,
    adminPassword,
    organizationId: org.id,
    organizationName: org.name,
    apartments: 2,
    rooms: rooms.length,
    tenants: tenants.length,
    leases: leases.length,
  });
}

main()
  .catch((err) => {
    console.error('[seed] failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

