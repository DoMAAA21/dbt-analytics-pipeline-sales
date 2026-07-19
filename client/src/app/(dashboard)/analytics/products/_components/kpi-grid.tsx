import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatNumber,
  formatPercent,
  formatPercentPoints,
  formatUsdFromCents,
} from "@/lib/format";
import type { ProductsAnalyticsSummary } from "@/types/analytics-products";

type KpiGridProps = {
  summary: ProductsAnalyticsSummary;
};

export function KpiGrid({ summary }: KpiGridProps) {
  const items = [
    {
      label: "Gross revenue",
      value: formatUsdFromCents(summary.grossRevenueCents),
      hint: `${formatNumber(summary.orderCount)} orders`,
    },
    {
      label: "Net revenue",
      value: formatUsdFromCents(summary.netRevenueCents),
      hint: "After reimbursements",
    },
    {
      label: "Reimbursements",
      value: formatUsdFromCents(summary.refundCents),
      hint: `Rate ${formatPercent(summary.refundRate)}`,
    },
    {
      label: "Gross margin",
      value: formatUsdFromCents(summary.grossMarginCents),
      hint: `${formatPercentPoints(summary.grossMarginPct)} of gross`,
    },
    {
      label: "AOV",
      value: formatUsdFromCents(summary.aovCents),
      hint: `${formatNumber(summary.unitsSold)} units`,
    },
    {
      label: "Products sold",
      value: formatNumber(summary.productCount),
      hint:
        summary.avgRating != null
          ? `Avg rating ${summary.avgRating.toFixed(2)} (${formatNumber(summary.reviewCount)} reviews)`
          : `${formatNumber(summary.reviewCount)} reviews`,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} size="sm">
          <CardHeader className="pb-2">
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {item.value}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{item.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
