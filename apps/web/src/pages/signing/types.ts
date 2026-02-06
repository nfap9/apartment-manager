import type dayjs from 'dayjs';

export type PricingPlan = {
  id: string;
  durationMonths: number;
  rentCents: number;
  depositCents: number;
};

export type RoomFacility = {
  id: string;
  type: string;
  name: string;
  quantity: number;
  originalPriceCents: number;
  yearsInUse: number;
  notes?: string | null;
};

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

export type Tenant = {
  id: string;
  name: string;
  phone: string;
  idNumber?: string | null;
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

export type LeaseFormData = {
  period: [dayjs.Dayjs, dayjs.Dayjs];
  billingCycleMonths: number;
  depositCents: number;
  baseRentCents: number;
  rentIncreaseType: 'NONE' | 'FIXED' | 'PERCENT';
  rentIncreaseValue: number;
  rentIncreaseIntervalMonths: number;
  // 水费
  waterMode?: 'FIXED' | 'METERED';
  waterFixedAmountCents?: number;
  waterUnitPriceCents?: number;
  waterUnitName?: string;
  // 电费
  electricityMode?: 'FIXED' | 'METERED';
  electricityFixedAmountCents?: number;
  electricityUnitPriceCents?: number;
  electricityUnitName?: string;
  notes?: string;
  charges?: Array<{ name: string; feeType?: string | null; fixedAmountCents?: number | null }>;
};
