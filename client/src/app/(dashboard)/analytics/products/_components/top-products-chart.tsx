import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  centsToDollars,
  formatUsdCompactFromCents,
  formatUsdFromCents,
} from "@/lib/format";
import type { ProductPerformanceRow } from "@/types/analytics-products";

const chartConfig = {
  revenue: {
    label: "Gross revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

type TopProductsChartProps = {
  data: ProductPerformanceRow[];
};

export function TopProductsChart({ data }: TopProductsChartProps) {
  const chartData = [...data]
    .slice(0, 10)
    .reverse()
    .map((row) => ({
      name:
        row.productName.length > 28
          ? `${row.productName.slice(0, 26)}…`
          : row.productName,
      fullName: row.productName,
      revenue: centsToDollars(row.grossRevenueCents),
      revenueCents: row.grossRevenueCents,
      share: row.revenueSharePct,
      units: row.unitsSold,
      marginPct: row.grossMarginPct,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top products by revenue</CardTitle>
        <CardDescription>
          Highest grossing products in the selected range.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[380px] w-full"
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 8, right: 48, top: 8, bottom: 8 }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={140}
            />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) =>
                formatUsdCompactFromCents(value * 100)
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as
                      | { fullName?: string }
                      | undefined;
                    return row?.fullName ?? "";
                  }}
                  formatter={(value, _name, item) => {
                    const row = item?.payload as
                      | {
                          revenueCents?: number;
                          share?: number;
                          units?: number;
                          marginPct?: number;
                        }
                      | undefined;
                    return (
                      <div className="flex flex-col gap-1">
                        <span className="font-mono font-medium tabular-nums">
                          {formatUsdFromCents(Number(value) * 100)}
                        </span>
                        <span className="text-muted-foreground">
                          Share {row?.share?.toFixed(2)}% · {row?.units} units ·
                          margin {row?.marginPct?.toFixed(1)}%
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Bar
              dataKey="revenue"
              fill="var(--color-revenue)"
              radius={[0, 4, 4, 0]}
            >
              <LabelList
                dataKey="revenueCents"
                position="right"
                className="fill-foreground text-[10px]"
                formatter={(value) =>
                  formatUsdCompactFromCents(Number(value ?? 0))
                }
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
