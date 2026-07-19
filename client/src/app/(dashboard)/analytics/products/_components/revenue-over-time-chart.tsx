import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  centsToDollars,
  formatUsdCompactFromCents,
  formatUsdFromCents,
} from "@/lib/format";
import type { ProductsRevenuePoint } from "@/types/analytics-products";

const chartConfig = {
  gross: {
    label: "Gross",
    color: "var(--chart-1)",
  },
  net: {
    label: "Net",
    color: "var(--chart-2)",
  },
  refund: {
    label: "Reimbursements",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

type RevenueOverTimeChartProps = {
  data: ProductsRevenuePoint[];
};

export function RevenueOverTimeChart({ data }: RevenueOverTimeChartProps) {
  const chartData = data.map((point) => ({
    date: point.date,
    label: point.date.slice(5),
    gross: centsToDollars(point.grossRevenueCents),
    net: centsToDollars(point.netRevenueCents),
    refund: centsToDollars(point.refundCents),
    grossCents: point.grossRevenueCents,
    netCents: point.netRevenueCents,
    refundCents: point.refundCents,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue over time</CardTitle>
        <CardDescription>
          Daily gross vs net revenue and reimbursements (gold).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-[2/1] w-full">
          <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(value: number) =>
                formatUsdCompactFromCents(value * 100)
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as
                      | { date?: string }
                      | undefined;
                    return row?.date ?? "";
                  }}
                  formatter={(value, name) => {
                    const dollars = Number(value);
                    const label =
                      chartConfig[name as keyof typeof chartConfig]?.label ??
                      name;
                    return (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono font-medium tabular-nums">
                          {formatUsdFromCents(dollars * 100)}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="gross"
              stroke="var(--color-gross)"
              fill="var(--color-gross)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="net"
              stroke="var(--color-net)"
              fill="var(--color-net)"
              fillOpacity={0.1}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="refund"
              stroke="var(--color-refund)"
              fill="var(--color-refund)"
              fillOpacity={0.08}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
