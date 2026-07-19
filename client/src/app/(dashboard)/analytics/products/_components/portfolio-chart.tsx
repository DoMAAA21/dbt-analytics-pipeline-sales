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
import { formatPercentPoints } from "@/lib/format";
import type { ProductsPortfolio } from "@/types/analytics-products";

const chartConfig = {
  share: {
    label: "Revenue share",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

type PortfolioChartProps = {
  portfolio: ProductsPortfolio;
};

export function PortfolioChart({ portfolio }: PortfolioChartProps) {
  const chartData = portfolio.buckets.map((bucket) => ({
    label: bucket.label,
    share: bucket.revenueSharePct,
    products: bucket.productCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue portfolio</CardTitle>
        <CardDescription>
          Concentration — top 10 share{" "}
          {formatPercentPoints(portfolio.top10RevenueSharePct)} · HHI{" "}
          {portfolio.herfindahlIndex.toFixed(4)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-[4/3] w-full">
          <BarChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(value: number) => `${value}%`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const row = item?.payload as
                      | { products?: number }
                      | undefined;
                    return (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-medium tabular-nums">
                          {Number(value).toFixed(2)}%
                        </span>
                        <span className="text-muted-foreground">
                          {row?.products ?? 0} products
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Bar
              dataKey="share"
              fill="var(--color-share)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
