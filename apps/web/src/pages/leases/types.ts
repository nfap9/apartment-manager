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

export type LeaseRow = {
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
  leases: LeaseRow[];
};

export type Apartment = {
  id: string;
  name: string;
  address: string;
};

export type ApartmentsResponse = {
  apartments: Apartment[];
};

export type Room = {
  id: string;
  name: string;
};

export type RoomsResponse = {
  rooms: Array<Room & { pricingPlans: unknown[] }>;
};

export type Tenant = {
  id: string;
  name: string;
  phone: string;
};

export type TenantsResponse = {
  tenants: Tenant[];
};
