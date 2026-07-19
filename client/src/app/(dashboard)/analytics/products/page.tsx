import { isAxiosError } from "axios";

import { DateRangeFilters } from "./_components/date-range-filters";
import { KpiGrid } from "./_components/kpi-grid";
import { PortfolioChart } from "./_components/portfolio-chart";
import { ReimbursementsChart } from "./_components/reimbursements-chart";
import { RevenueOverTimeChart } from "./_components/revenue-over-time-chart";
import { TopProductsChart } from "./_components/top-products-chart";
import { useProductsAnalytics } from "@/hooks/use-products-analytics";
import { useQueryString } from "@/hooks/use-query-string";
import { defaultDateRange } from "@/lib/format";

export default function ProductsAnalyticsPage() {
  const { getParam, setParams } = useQueryString();
  const defaults = defaultDateRange(60);
  const from = getParam("from") ?? defaults.from;
  const to = getParam("to") ?? defaults.to;

  const { data, isLoading, isFetching, isError, error, refetch } =
    useProductsAnalytics({ from, to, limit: 15 });

  const errorMessage = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message ??
      error.message
    : error instanceof Error
      ? error.message
      : "Failed to load products analytics";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Revenue, portfolio concentration, and reimbursements from DuckDB
            bronze (raw joins — not gold marts yet).
          </p>
        </div>
        <DateRangeFilters
          from={from}
          to={to}
          onChange={(range) => setParams(range)}
        />
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Loading products analytics…
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm">
          <p className="font-medium text-destructive">{errorMessage}</p>
          <button
            type="button"
            className="mt-3 text-sm underline underline-offset-2"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </div>
      ) : data ? (
        <>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {data.meta.from} → {data.meta.to} · source {data.meta.source}
              {isFetching ? " · refreshing…" : ""}
            </span>
          </div>

          <KpiGrid summary={data.summary} />

          <RevenueOverTimeChart data={data.revenueOverTime} />

          <div className="grid gap-4 xl:grid-cols-2">
            <TopProductsChart data={data.topProducts} />
            <div className="flex flex-col gap-4">
              <PortfolioChart portfolio={data.portfolio} />
              <ReimbursementsChart data={data.reimbursements} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
