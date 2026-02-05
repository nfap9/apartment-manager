import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { z } from 'zod';

import { prisma } from '../../db';
import { HttpError } from '../../http/httpError';
import { getParam } from '../../http/params';
import { requireAuth } from '../../middleware/requireAuth';
import { requireOrgMember } from '../../middleware/requireOrgMember';
import { requirePermission } from '../../middleware/requirePermission';

export const apartmentRouter = Router();

apartmentRouter.use('/:orgId', requireAuth, requireOrgMember);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const apartmentBaseSchema = z.object({
  name: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(200),
  totalArea: z.number().positive().optional(),
  floor: z.number().int().optional(),
});

const roomFacilitySchema = z.object({
  name: z.string().trim().min(1).max(50),
  quantity: z.number().int().positive().default(1),
  valueCents: z.number().int().nonnegative().default(0),
});

apartmentRouter.get('/:orgId/apartments', requirePermission('apartment.read'), async (req, res) => {
  const orgId = getParam(req, 'orgId');

  const apartments = await prisma.apartment.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    include: {
      rooms: {
        where: { isActive: true },
        select: { id: true, isRented: true },
      },
    },
  });

  // 计算每个公寓的房间统计信息
  const apartmentsWithStats = apartments.map((apartment) => {
    const { rooms, ...apartmentData } = apartment;
    const totalRooms = rooms.length;
    const vacantRooms = rooms.filter((room) => !room.isRented).length;
    
    return {
      ...apartmentData,
      totalRooms,
      vacantRooms,
    };
  });

  return res.json({ apartments: apartmentsWithStats });
});

apartmentRouter.post('/:orgId/apartments', requirePermission('apartment.write'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const body = apartmentBaseSchema.parse(req.body);

  const apartment = await prisma.apartment.create({
    data: { organizationId: orgId, ...body },
  });

  return res.status(201).json({ apartment });
});

apartmentRouter.get(
  '/:orgId/apartments/:apartmentId',
  requirePermission('apartment.read'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');

    const apartment = await prisma.apartment.findFirst({
      where: { id: apartmentId, organizationId: orgId },
      include: { rooms: { include: { facilities: true } } },
    });
    if (!apartment) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    return res.json({ apartment });
  },
);

apartmentRouter.put(
  '/:orgId/apartments/:apartmentId',
  requirePermission('apartment.write'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');
    const body = apartmentBaseSchema.partial().parse(req.body);

    const exists = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
    if (!exists) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    const apartment = await prisma.apartment.update({
      where: { id: apartmentId },
      data: body,
    });

    return res.json({ apartment });
  },
);

apartmentRouter.get(
  '/:orgId/apartments/:apartmentId/upstream',
  requirePermission('apartment.upstream.read'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');

    const apartment = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
    if (!apartment) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    const upstream = await prisma.apartmentUpstream.findUnique({ where: { apartmentId } });
    return res.json({ upstream });
  },
);

apartmentRouter.put(
  '/:orgId/apartments/:apartmentId/upstream',
  requirePermission('apartment.upstream.write'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');

    const apartment = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
    if (!apartment) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    const body = z
      .object({
        transferFeeCents: z.number().int().nonnegative().optional(),
        renovationFeeCents: z.number().int().nonnegative().optional(),
        renovationDepositCents: z.number().int().nonnegative().optional(),
        upfrontOtherCents: z.number().int().nonnegative().optional(),
        upstreamDepositCents: z.number().int().nonnegative().optional(),
        upstreamRentBaseCents: z.number().int().nonnegative().optional(),
        upstreamRentIncreaseType: z.enum(['NONE', 'FIXED', 'PERCENT']).optional(),
        upstreamRentIncreaseValue: z.number().int().nonnegative().optional(),
        upstreamRentIncreaseIntervalMonths: z.number().int().positive().optional(),
        notes: z.string().max(2000).optional().nullable(),
      })
      .parse(req.body);

    const upstream = await prisma.apartmentUpstream.upsert({
      where: { apartmentId },
      update: body,
      create: { apartmentId, ...body },
    });

    return res.json({ upstream });
  },
);

apartmentRouter.get(
  '/:orgId/apartments/:apartmentId/fee-pricings',
  requirePermission('apartment.read'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');

    const apartment = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
    if (!apartment) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    const feePricings = await prisma.apartmentFeePricing.findMany({
      where: { apartmentId },
      orderBy: { feeType: 'asc' },
    });
    return res.json({ feePricings });
  },
);

apartmentRouter.put(
  '/:orgId/apartments/:apartmentId/fee-pricings',
  requirePermission('apartment.write'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');

    const apartment = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
    if (!apartment) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    const items = z
      .array(
        z.object({
          feeType: z.enum(['WATER', 'ELECTRICITY', 'MANAGEMENT', 'INTERNET', 'GAS', 'OTHER']),
          mode: z.enum(['FIXED', 'METERED']),
          fixedAmountCents: z.number().int().nonnegative().optional().nullable(),
          unitPriceCents: z.number().int().nonnegative().optional().nullable(),
          unitName: z.string().trim().max(20).optional().nullable(),
        }),
      )
      .max(50)
      .parse(req.body);

    for (const it of items) {
      if (it.mode === 'FIXED' && (it.fixedAmountCents == null || it.fixedAmountCents < 0)) {
        throw new HttpError(400, 'INVALID_FEE_PRICING', '固定收费必须提供 fixedAmountCents');
      }
      if (it.mode === 'METERED' && (it.unitPriceCents == null || it.unitPriceCents < 0)) {
        throw new HttpError(400, 'INVALID_FEE_PRICING', '按用量计费必须提供 unitPriceCents');
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.apartmentFeePricing.deleteMany({ where: { apartmentId } });
      if (items.length) {
        await tx.apartmentFeePricing.createMany({
          data: items.map((it) => ({
            apartmentId,
            feeType: it.feeType,
            mode: it.mode,
            fixedAmountCents: it.fixedAmountCents ?? null,
            unitPriceCents: it.unitPriceCents ?? null,
            unitName: it.unitName ?? null,
          })),
        });
      }
    });

    const feePricings = await prisma.apartmentFeePricing.findMany({
      where: { apartmentId },
      orderBy: { feeType: 'asc' },
    });

    return res.json({ feePricings });
  },
);

apartmentRouter.get(
  '/:orgId/apartments/:apartmentId/rooms',
  requirePermission('room.read'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');

    const apartment = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
    if (!apartment) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    const rooms = await prisma.room.findMany({
      where: { apartmentId },
      include: { pricingPlans: true, facilities: true },
      orderBy: { name: 'asc' },
    });

    return res.json({ rooms });
  },
);

apartmentRouter.post(
  '/:orgId/apartments/:apartmentId/rooms',
  requirePermission('room.write'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');

    const apartment = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
    if (!apartment) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    const body = z
      .object({
        name: z.string().trim().min(1).max(50),
        layout: z.string().trim().max(50).optional().nullable(),
        area: z.number().positive().optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
        isActive: z.boolean().optional(),
        isRented: z.boolean().optional(),
        facilities: z.array(roomFacilitySchema).optional(),
      })
      .parse(req.body);

    const room = await prisma.$transaction(async (tx) => {
      const newRoom = await tx.room.create({
        data: {
          apartmentId,
          name: body.name,
          layout: body.layout ?? null,
          area: body.area ?? null,
          notes: body.notes ?? null,
          isActive: body.isActive ?? true,
          isRented: body.isRented ?? false,
        },
      });

      if (body.facilities?.length) {
        await tx.roomFacility.createMany({
          data: body.facilities.map((f) => ({
            roomId: newRoom.id,
            name: f.name,
            quantity: f.quantity,
            valueCents: f.valueCents,
          })),
        });
      }

      return tx.room.findUnique({
        where: { id: newRoom.id },
        include: { facilities: true },
      });
    });

    return res.status(201).json({ room });
  },
);

// 下载Excel模板
apartmentRouter.get(
  '/:orgId/apartments/:apartmentId/rooms/import-template',
  requirePermission('room.write'),
  async (req, res) => {
    try {
      const orgId = getParam(req, 'orgId');
      const apartmentId = getParam(req, 'apartmentId');

      const apartment = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
      if (!apartment) {
        throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
      }

      const wb = XLSX.utils.book_new();

      // 添加说明sheet - 放在最前面，方便用户查看
      const instructionData = [
        ['批量导入房间模板使用说明'],
        [''],
        ['字段说明：'],
        ['房间名称*', '必填，房间编号或名称，如：101、A101等'],
        ['户型', '可选，如：一室一厅、两室一厅等'],
        ['面积', '可选，房间面积（平方米），支持小数'],
        ['备注', '可选，房间的备注信息'],
        ['是否启用(是/否)', '必填，默认为"是"。填写"是"表示启用该房间，"否"表示禁用'],
        ['是否已租出(是/否)', '必填，默认为"否"。填写"是"表示已租出，"否"表示未租出'],
        [''],
        ['注意事项：'],
        ['1. 标有"*"的字段为必填项'],
        ['2. "是否启用"和"是否已租出"字段只能填写"是"或"否"'],
        ['3. "是否启用"默认为"是"，如果为空将自动设置为"是"'],
        ['4. "是否已租出"默认为"否"，如果为空将自动设置为"否"'],
        ['5. 房间名称在同一公寓内不能重复'],
        ['6. 面积字段只填写数字，不需要单位'],
        [''],
        ['设施表说明：'],
        ['1. 设施表为可选，如果房间没有设施可以不填写'],
        ['2. 房间名称必须与房间表中的房间名称一致'],
        ['3. 设施名称、数量、价值为必填项'],
        ['4. 价值单位为元，支持小数'],
      ];
      const instructionWs = XLSX.utils.aoa_to_sheet(instructionData);
      instructionWs['!cols'] = [
        { wch: 50 },
      ];
      XLSX.utils.book_append_sheet(wb, instructionWs, '使用说明');

      // 房间表 - 第二个sheet
      const roomData = [
        ['房间名称*', '户型', '面积', '备注', '是否启用(是/否)', '是否已租出(是/否)'],
        ['101', '一室一厅', '30', '朝南采光好', '是', '否'],
        ['102', '两室一厅', '50', '', '是', '否'],
        ['103', '三室一厅', '80', '精装修', '是', '否'],
      ];
      const roomWs = XLSX.utils.aoa_to_sheet(roomData);
      roomWs['!cols'] = [
        { wch: 15 },
        { wch: 12 },
        { wch: 10 },
        { wch: 30 },
        { wch: 20 },
        { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, roomWs, '房间');

      // 设施表 - 第三个sheet
      const facilityData = [
        ['房间名称*', '设施名称*', '数量', '价值(元)'],
        ['101', '空调', '1', '3000'],
        ['101', '洗衣机', '1', '2000'],
        ['102', '冰箱', '1', '1500'],
      ];
      const facilityWs = XLSX.utils.aoa_to_sheet(facilityData);
      facilityWs['!cols'] = [
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, facilityWs, '设施');

      const buffer = XLSX.write(wb, { 
        type: 'buffer', 
        bookType: 'xlsx',
        cellStyles: false,
        compression: true,
      });

      res.setHeader('Content-Disposition', 'attachment; filename="room_import_template.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', buffer.length.toString());
      return res.send(buffer);
    } catch (error) {
      throw error;
    }
  },
);

// 批量导入房间
apartmentRouter.post(
  '/:orgId/apartments/:apartmentId/rooms/import',
  requirePermission('room.write'),
  upload.single('file'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');

    const apartment = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
    if (!apartment) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    const file = req.file;
    if (!file) {
      throw new HttpError(400, 'NO_FILE', '请上传Excel文件');
    }

    const wb = XLSX.read(file.buffer, { type: 'buffer' });

    // 读取房间sheet
    const roomSheet = wb.Sheets['房间'] || wb.Sheets[wb.SheetNames[0]];
    if (!roomSheet) {
      throw new HttpError(400, 'INVALID_EXCEL', '未找到"房间"工作表');
    }

    const roomRows = XLSX.utils.sheet_to_json(roomSheet, { header: 1 }) as unknown[][];
    if (roomRows.length < 2) {
      throw new HttpError(400, 'EMPTY_DATA', '房间数据为空');
    }

    // 读取设施sheet
    const facilitySheet = wb.Sheets['设施'];
    let facilityRows: unknown[][] = [];
    if (facilitySheet) {
      facilityRows = XLSX.utils.sheet_to_json(facilitySheet, { header: 1 }) as unknown[][];
    }

    // 解析房间数据 (跳过标题行)
    const rooms: Array<{
      name: string;
      layout: string | null;
      area: number | null;
      notes: string | null;
      isActive: boolean;
      isRented: boolean;
    }> = [];

    for (let i = 1; i < roomRows.length; i++) {
      const row = roomRows[i];
      if (!row || !row[0]) continue;

      const name = String(row[0] || '').trim();
      if (!name) continue;

      const layout = row[1] ? String(row[1]).trim() : null;
      const area = row[2] ? parseFloat(String(row[2])) : null;
      const notes = row[3] ? String(row[3]).trim() : null;
      const isActiveStr = String(row[4] || '是').trim();
      const isRentedStr = String(row[5] || '否').trim();

      rooms.push({
        name,
        layout,
        area: area && !isNaN(area) ? area : null,
        notes,
        isActive: isActiveStr === '是' || isActiveStr === 'true' || isActiveStr === '1',
        isRented: isRentedStr === '是' || isRentedStr === 'true' || isRentedStr === '1',
      });
    }

    if (rooms.length === 0) {
      throw new HttpError(400, 'EMPTY_DATA', '没有有效的房间数据');
    }

    // 解析设施数据 (跳过标题行)
    const facilitiesMap: Map<string, Array<{ name: string; quantity: number; valueCents: number }>> = new Map();
    for (let i = 1; i < facilityRows.length; i++) {
      const row = facilityRows[i];
      if (!row || !row[0] || !row[1]) continue;

      const roomName = String(row[0]).trim();
      const facilityName = String(row[1]).trim();
      const quantity = row[2] ? parseInt(String(row[2]), 10) : 1;
      const valueYuan = row[3] ? parseFloat(String(row[3])) : 0;
      const valueCents = Math.round(valueYuan * 100);

      if (!facilitiesMap.has(roomName)) {
        facilitiesMap.set(roomName, []);
      }
      facilitiesMap.get(roomName)!.push({
        name: facilityName,
        quantity: isNaN(quantity) ? 1 : quantity,
        valueCents: isNaN(valueCents) ? 0 : valueCents,
      });
    }

    // 检查重复房间名
    const existingRooms = await prisma.room.findMany({
      where: { apartmentId },
      select: { id: true, name: true },
    });
    const existingNames = new Set(existingRooms.map((r) => r.name));
    const existingRoomsMap = new Map(existingRooms.map((r) => [r.name, r.id]));
    const duplicates = rooms.filter((r) => existingNames.has(r.name));
    
    // 获取处理策略：skip（跳过）、overwrite（覆盖）、cancel（取消）
    // 从查询参数中读取，确保是字符串类型
    const duplicateStrategyRaw = req.query.duplicateStrategy;
    let duplicateStrategy: 'skip' | 'overwrite' | 'cancel' | undefined = undefined;
    if (typeof duplicateStrategyRaw === 'string' && ['skip', 'overwrite', 'cancel'].includes(duplicateStrategyRaw)) {
      duplicateStrategy = duplicateStrategyRaw as 'skip' | 'overwrite' | 'cancel';
    }

    // 如果存在重复房间且没有指定处理策略，返回重复房间列表
    if (duplicates.length > 0 && !duplicateStrategy) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_ROOMS',
          message: '存在重复的房间名',
          duplicateRooms: duplicates.map((r) => r.name),
        },
      });
    }

    // 如果策略是取消，直接返回
    if (duplicateStrategy === 'cancel') {
      return res.status(400).json({
        error: {
          code: 'IMPORT_CANCELLED',
          message: '导入已取消',
        },
      });
    }

    // 批量创建或更新
    const result = await prisma.$transaction(async (tx) => {
      const created: Array<{ id: string; name: string }> = [];
      const updated: Array<{ id: string; name: string }> = [];
      const skipped: Array<{ name: string }> = [];

      for (const room of rooms) {
        const existingRoomId = existingRoomsMap.get(room.name);
        
        if (existingRoomId) {
          // 房间已存在
          if (duplicateStrategy === 'skip') {
            // 跳过已存在的房间
            skipped.push({ name: room.name });
            continue;
          } else if (duplicateStrategy === 'overwrite') {
            // 覆盖已存在的房间
            // 先删除原有设施
            await tx.roomFacility.deleteMany({
              where: { roomId: existingRoomId },
            });
            
            // 更新房间信息
            const updatedRoom = await tx.room.update({
              where: { id: existingRoomId },
              data: {
                layout: room.layout,
                area: room.area,
                notes: room.notes,
                isActive: room.isActive,
                isRented: room.isRented,
              },
            });
            updated.push({ id: updatedRoom.id, name: updatedRoom.name });

            // 添加新设施
            const facilities = facilitiesMap.get(room.name);
            if (facilities?.length) {
              await tx.roomFacility.createMany({
                data: facilities.map((f) => ({
                  roomId: existingRoomId,
                  name: f.name,
                  quantity: f.quantity,
                  valueCents: f.valueCents,
                })),
              });
            }
            continue;
          }
        }

        // 创建新房间
        const newRoom = await tx.room.create({
          data: {
            apartmentId,
            name: room.name,
            layout: room.layout,
            area: room.area,
            notes: room.notes,
            isActive: room.isActive,
            isRented: room.isRented,
          },
        });
        created.push({ id: newRoom.id, name: newRoom.name });

        const facilities = facilitiesMap.get(room.name);
        if (facilities?.length) {
          await tx.roomFacility.createMany({
            data: facilities.map((f) => ({
              roomId: newRoom.id,
              name: f.name,
              quantity: f.quantity,
              valueCents: f.valueCents,
            })),
          });
        }
      }

      return { created, updated, skipped };
    });

    const totalProcessed = result.created.length + result.updated.length;
    let message = `成功导入 ${totalProcessed} 个房间`;
    if (result.created.length > 0) {
      message += `（新增 ${result.created.length} 个`;
    }
    if (result.updated.length > 0) {
      message += result.created.length > 0 ? `，更新 ${result.updated.length} 个` : `（更新 ${result.updated.length} 个`;
    }
    if (result.created.length > 0 || result.updated.length > 0) {
      message += '）';
    }
    if (result.skipped.length > 0) {
      message += `，跳过 ${result.skipped.length} 个已存在的房间`;
    }

    return res.status(201).json({
      message,
      rooms: result.created,
      updated: result.updated,
      skipped: result.skipped,
    });
  },
);

apartmentRouter.get('/:orgId/rooms/:roomId', requirePermission('room.read'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const roomId = getParam(req, 'roomId');

  const room = await prisma.room.findFirst({
    where: { id: roomId, apartment: { organizationId: orgId } },
    include: { pricingPlans: true, facilities: true },
  });
  if (!room) {
    throw new HttpError(404, 'ROOM_NOT_FOUND', '房间不存在');
  }
  return res.json({ room });
});

apartmentRouter.put('/:orgId/rooms/:roomId', requirePermission('room.write'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const roomId = getParam(req, 'roomId');

  const exists = await prisma.room.findFirst({ where: { id: roomId, apartment: { organizationId: orgId } } });
  if (!exists) {
    throw new HttpError(404, 'ROOM_NOT_FOUND', '房间不存在');
  }

  const body = z
    .object({
      name: z.string().trim().min(1).max(50).optional(),
      layout: z.string().trim().max(50).optional().nullable(),
      area: z.number().positive().optional().nullable(),
      notes: z.string().max(2000).optional().nullable(),
      isActive: z.boolean().optional(),
      isRented: z.boolean().optional(),
    })
    .parse(req.body);

  const room = await prisma.room.update({
    where: { id: roomId },
    data: {
      name: body.name,
      layout: body.layout,
      area: body.area,
      notes: body.notes,
      isActive: body.isActive,
      isRented: body.isRented,
    },
    include: { facilities: true },
  });
  return res.json({ room });
});

// 房间设施管理
apartmentRouter.get('/:orgId/rooms/:roomId/facilities', requirePermission('room.read'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const roomId = getParam(req, 'roomId');

  const room = await prisma.room.findFirst({ where: { id: roomId, apartment: { organizationId: orgId } } });
  if (!room) {
    throw new HttpError(404, 'ROOM_NOT_FOUND', '房间不存在');
  }

  const facilities = await prisma.roomFacility.findMany({
    where: { roomId },
    orderBy: { name: 'asc' },
  });

  return res.json({ facilities });
});

apartmentRouter.put('/:orgId/rooms/:roomId/facilities', requirePermission('room.write'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const roomId = getParam(req, 'roomId');

  const room = await prisma.room.findFirst({ where: { id: roomId, apartment: { organizationId: orgId } } });
  if (!room) {
    throw new HttpError(404, 'ROOM_NOT_FOUND', '房间不存在');
  }

  const facilities = z.array(roomFacilitySchema).max(100).parse(req.body);

  await prisma.$transaction(async (tx) => {
    await tx.roomFacility.deleteMany({ where: { roomId } });
    if (facilities.length) {
      await tx.roomFacility.createMany({
        data: facilities.map((f) => ({
          roomId,
          name: f.name,
          quantity: f.quantity,
          valueCents: f.valueCents,
        })),
      });
    }
  });

  const updatedFacilities = await prisma.roomFacility.findMany({
    where: { roomId },
    orderBy: { name: 'asc' },
  });

  return res.json({ facilities: updatedFacilities });
});

apartmentRouter.get('/:orgId/rooms/:roomId/pricing-plans', requirePermission('room.read'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const roomId = getParam(req, 'roomId');

  const room = await prisma.room.findFirst({ where: { id: roomId, apartment: { organizationId: orgId } } });
  if (!room) {
    throw new HttpError(404, 'ROOM_NOT_FOUND', '房间不存在');
  }

  const pricingPlans = await prisma.roomPricingPlan.findMany({
    where: { roomId, isActive: true },
    orderBy: { durationMonths: 'asc' },
  });

  return res.json({ pricingPlans });
});

apartmentRouter.put(
  '/:orgId/rooms/:roomId/pricing-plans',
  requirePermission('room.pricing.manage'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const roomId = getParam(req, 'roomId');

    const room = await prisma.room.findFirst({ where: { id: roomId, apartment: { organizationId: orgId } } });
    if (!room) {
      throw new HttpError(404, 'ROOM_NOT_FOUND', '房间不存在');
    }

    const plans = z
      .array(
        z.object({
          durationMonths: z.number().int().positive().max(120),
          rentCents: z.number().int().nonnegative(),
          depositCents: z.number().int().nonnegative().optional(),
        }),
      )
      .max(50)
      .parse(req.body);

    await prisma.$transaction(async (tx) => {
      await tx.roomPricingPlan.deleteMany({ where: { roomId } });
      if (plans.length) {
        await tx.roomPricingPlan.createMany({
          data: plans.map((p) => ({
            roomId,
            durationMonths: p.durationMonths,
            rentCents: p.rentCents,
            depositCents: p.depositCents ?? 0,
            isActive: true,
          })),
        });
      }
    });

    const pricingPlans = await prisma.roomPricingPlan.findMany({
      where: { roomId, isActive: true },
      orderBy: { durationMonths: 'asc' },
    });

    return res.json({ pricingPlans });
  },
);
