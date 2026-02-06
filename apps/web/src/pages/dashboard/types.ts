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

export type RentStatusData = {
  pendingCount: number;
  pendingAmount: number;
  paidCount: number;
  paidAmount: number;
  soonDueCount: number;
  soonDueAmount: number;
  soonDueList: any[];
};

export type TabType = 'apartment-status' | 'data-analysis';
