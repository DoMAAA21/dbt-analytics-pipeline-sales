import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
  formatPercent,
  formatUsdCompactFromCents,
  formatUsdFromCents,
} from "@/lib/format";
import type { ProductsReimbursements } from "@/types/analytics-products";

const chartConfig = {
  refund: {
    label: "Reimbursements",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

type ReimbursementsChartProps = {
  data: ProductsReimbursements;
};

export function ReimbursementsChart({ data }: ReimbursementsChartProps) {
  const chartData = data.byProduct
    .slice(0, 8)
    .reverse()
    .map((row) => ({
      name:
        row.productName.length > 24
          ? `${row.productName.slice(0, 22)}…`
          : row.productName,
      fullName: row.productName,
      refund: centsToDollars(row.refundCents),
      share: row.refundSharePct,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reimbursements by product</CardTitle>
        <CardDescription>
          {formatUsdFromCents(data.refundCents)} refunded · rate{" "}
          {formatPercent(data.refundRate)} · {data.refundedOrderCount} orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[320px] w-full"
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={120}
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
                    const row = item?.payload as { share?: number } | undefined;
                    return (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-medium tabular-nums">
                          {formatUsdFromCents(Number(value) * 100)}
                        </span>
                        <span className="text-muted-foreground">
                          {row?.share?.toFixed(2)}% of refunds
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Bar
              dataKey="refund"
              fill="var(--color-refund)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
