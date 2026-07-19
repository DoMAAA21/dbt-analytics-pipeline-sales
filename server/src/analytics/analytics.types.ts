export type DateRange = {
  from: string;
  to: string;
};

export type ProductsAnalyticsSummary = {
  grossRevenueCents: number;
  netRevenueCents: number;
  refundCents: number;
  discountCents: number;
  cogsCents: number;
  grossMarginCents: number;
  grossMarginPct: number;
  unitsSold: number;
  orderCount: number;
  lineItemCount: number;
  productCount: number;
  aovCents: number;
  refundRate: number;
  avgRating: number | null;
  reviewCount: number;
};

export type ProductsRevenuePoint = {
  date: string;
  grossRevenueCents: number;
  netRevenueCents: number;
  refundCents: number;
  discountCents: number;
  unitsSold: number;
  orderCount: number;
};

export type ProductPerformanceRow = {
  productId: string;
  productName: string;
  skuCount: number;
  grossRevenueCents: number;
  netRevenueCents: number;
  refundCents: number;
  discountCents: number;
  cogsCents: number;
  grossMarginCents: number;
  grossMarginPct: number;
  unitsSold: number;
  orderCount: number;
  revenueSharePct: number;
  avgUnitPriceCents: number;
};

export type PortfolioBucket = {
  tier: 'top10' | 'next40' | 'longTail';
  label: string;
  productCount: number;
  grossRevenueCents: number;
  revenueSharePct: number;
};

export type ProductsPortfolio = {
  herfindahlIndex: number;
  top10RevenueSharePct: number;
  top50RevenueSharePct: number;
  buckets: PortfolioBucket[];
};

export type ReimbursementPoint = {
  date: string;
  refundCents: number;
  refundedOrderCount: number;
};

export type ReimbursementProductRow = {
  productId: string;
  productName: string;
  refundCents: number;
  refundSharePct: number;
  unitsSold: number;
  refundPerUnitCents: number;
};

export type ProductsReimbursements = {
  refundCents: number;
  refundedOrderCount: number;
  refundRate: number;
  overTime: ReimbursementPoint[];
  byProduct: ReimbursementProductRow[];
};

export type ProductsAnalyticsResponse = {
  meta: {
    from: string;
    to: string;
    defaultRangeDays: number;
    source: 'gold';
    note: string;
  };
  summary: ProductsAnalyticsSummary;
  revenueOverTime: ProductsRevenuePoint[];
  topProducts: ProductPerformanceRow[];
  portfolio: ProductsPortfolio;
  reimbursements: ProductsReimbursements;
};
