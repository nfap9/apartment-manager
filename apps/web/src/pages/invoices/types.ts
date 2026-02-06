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

export type InvoiceRow = {
  id: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | 'OVERDUE';
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  totalAmountCents: number;
  hasPendingReading?: boolean;
  lease: {
    room: { name: string; apartment: { name: string } };
    tenant: { name: string; phone: string };
  };
  items: InvoiceItem[];
};

export type InvoicesResponse = {
  invoices: InvoiceRow[];
};

export type InvoiceDetailResponse = {
  invoice: (InvoiceRow & { items: InvoiceItem[] }) | null;
};
