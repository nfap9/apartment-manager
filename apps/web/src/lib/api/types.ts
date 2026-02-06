/**
 * API 请求和响应的类型定义
 */

// 公寓相关类型
export type Apartment = {
  id: string;
  name: string;
  address: string;
  totalArea?: number | null;
  floor?: number | null;
  createdAt: string;
  rooms?: Room[];
  totalRooms?: number;
  vacantRooms?: number;
};

export type ApartmentsResponse = {
  apartments: Apartment[];
};

export type ApartmentResponse = {
  apartment: Apartment;
};

// 房间相关类型
export type Room = {
  id: string;
  apartmentId: string;
  name: string;
  layout?: string | null;
  area?: number | null;
  notes?: string | null;
  isActive: boolean;
  isRented: boolean;
  facilities?: RoomFacility[];
};

export type RoomFacility = {
  id: string;
  roomId: string;
  type: string; // 设施类型：空调、洗衣机、冰箱等
  name: string; // 设施名称（默认与type相同，可自定义）
  quantity: number;
  originalPriceCents: number; // 原价（分）
  yearsInUse: number; // 已使用年限（支持小数）
  notes?: string | null; // 备注
};

export type RoomsResponse = {
  rooms: Array<Room & { pricingPlans?: unknown[] }>;
};

export type PricingPlan = {
  id?: string;
  durationMonths: number;
  rentCents: number;
  depositCents: number;
};

export type PricingPlansResponse = {
  pricingPlans: PricingPlan[];
};

export type FacilitiesResponse = {
  facilities: RoomFacility[];
};

// 上游信息类型
export type Upstream = {
  apartmentId: string;
  transferFeeCents: number;
  renovationFeeCents: number;
  renovationDepositCents: number;
  upfrontOtherCents: number;
  upstreamDepositCents: number;
  upstreamRentBaseCents: number;
  upstreamRentIncreaseType: 'NONE' | 'FIXED' | 'PERCENT';
  upstreamRentIncreaseValue: number;
  upstreamRentIncreaseIntervalMonths: number;
  notes?: string | null;
};

export type UpstreamResponse = {
  upstream: Upstream | null;
};

// 费用规格类型
export type FeePricingSpec = {
  id: string;
  name: string;
  description?: string | null;
  fixedAmountCents?: number | null;
  unitPriceCents?: number | null;
  unitName?: string | null;
  isActive: boolean;
  sortOrder: number;
};

// 费用定价类型
export type FeePricing = {
  id: string;
  feeType: 'WATER' | 'ELECTRICITY' | 'MANAGEMENT' | 'INTERNET' | 'GAS' | 'OTHER';
  mode: 'FIXED' | 'METERED';
  fixedAmountCents?: number | null;
  unitPriceCents?: number | null;
  unitName?: string | null;
  notes?: string | null;
  billingTiming?: 'PREPAID' | 'POSTPAID' | null;
  hasSpecs: boolean;
  specs?: FeePricingSpec[];
};

export type FeePricingResponse = {
  feePricings: FeePricing[];
};

// 费用项目类型（组织级别）
export type FeeItemSpec = {
  id: string;
  name: string;
  description?: string | null;
  fixedAmountCents?: number | null;
  unitPriceCents?: number | null;
  unitName?: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type FeeItem = {
  id: string;
  organizationId: string;
  feeType: 'WATER' | 'ELECTRICITY' | 'MANAGEMENT' | 'INTERNET' | 'GAS' | 'OTHER';
  name: string;
  mode: 'FIXED' | 'METERED';
  defaultFixedAmountCents?: number | null;
  defaultUnitPriceCents?: number | null;
  defaultUnitName?: string | null;
  defaultBillingTiming?: 'PREPAID' | 'POSTPAID' | null;
  hasSpecs: boolean;
  notes?: string | null;
  isActive: boolean;
  sortOrder: number;
  specs?: FeeItemSpec[];
};

// 租客相关类型
export type Tenant = {
  id: string;
  name: string;
  phone: string;
  idNumber?: string | null;
  createdAt?: string;
};

export type TenantsResponse = {
  tenants: Tenant[];
};

// 租约相关类型
export type LeaseCharge = {
  id: string;
  name: string;
  mode: 'FIXED' | 'METERED';
  fixedAmountCents?: number | null;
  unitPriceCents?: number | null;
  unitName?: string | null;
  billingCycleMonths: number;
  isActive: boolean;
};

export type Lease = {
  id: string;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'TERMINATED';
  startDate: string;
  endDate: string;
  billingCycleMonths: number;
  depositCents: number;
  baseRentCents: number;
  rentIncreaseType: 'NONE' | 'FIXED' | 'PERCENT';
  rentIncreaseValue: number;
  rentIncreaseIntervalMonths: number;
  notes?: string | null;
  room: { id: string; name: string; apartment: { id: string; name: string } };
  tenant: { id: string; name: string; phone: string };
  charges: LeaseCharge[];
};

export type LeasesResponse = {
  leases: Lease[];
};

// 账单相关类型
export type InvoiceItem = {
  id: string;
  name: string;
  kind: 'RENT' | 'DEPOSIT' | 'CHARGE';
  mode?: 'FIXED' | 'METERED' | null;
  status: 'PENDING_READING' | 'CONFIRMED';
  amountCents?: number | null;
  unitPriceCents?: number | null;
  unitName?: string | null;
  meterStart?: number | null;
  meterEnd?: number | null;
  quantity?: number | null;
};

export type Invoice = {
  id: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | 'OVERDUE';
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  totalAmountCents: number;
  lease: {
    room: { name: string; apartment: { name: string } };
    tenant: { name: string; phone: string };
  };
  items: InvoiceItem[];
};

export type InvoicesResponse = {
  invoices: Invoice[];
};

export type InvoiceDetailResponse = {
  invoice: Invoice | null;
};

// 签约相关类型
export type AvailableRoom = {
  id: string;
  name: string;
  layout: string | null;
  area: number | null;
  notes: string | null;
  apartment: { id: string; name: string; address: string };
  pricingPlans: PricingPlan[];
  facilities: RoomFacility[];
};

export type AvailableRoomsResponse = {
  rooms: AvailableRoom[];
};

export type ChargeItem = {
  name: string;
  feeType?: string | null;
  mode: 'FIXED' | 'METERED';
  fixedAmountCents?: number | null;
  unitPriceCents?: number | null;
  unitName?: string | null;
  billingCycleMonths: number;
  isActive: boolean;
};

export type FeeTemplateResponse = {
  charges: ChargeItem[];
};

// 看板相关类型
export type KpisResponse = {
  asOf: string;
  kpis: {
    apartmentCount: number;
    totalRoomCount: number;
    occupiedRoomCount: number;
    occupancyRate: number;
    invoiceIssuedCount: number;
    invoiceIssuedTotalCents: number;
    invoiceOverdueCount: number;
    invoiceOverdueTotalCents: number;
  };
};

export type VacantRoomsResponse = {
  asOf: string;
  rooms: Array<{
    id: string;
    name: string;
    apartment: { id: string; name: string; address: string };
  }>;
};

export type LeaseExpiringResponse = {
  now: string;
  until: string;
  leases: Array<{
    id: string;
    endDate: string;
    room: { id: string; name: string; apartment: { id: string; name: string } };
    tenant: { id: string; name: string; phone: string };
  }>;
};
