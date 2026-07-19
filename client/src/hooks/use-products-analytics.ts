import { useQuery } from "@tanstack/react-query";

import { http } from "@/lib/http";
import type { ProductsAnalyticsResponse } from "@/types/analytics-products";

export type ProductsAnalyticsParams = {
  from: string;
  to: string;
  limit?: number;
};

export function useProductsAnalytics(params: ProductsAnalyticsParams) {
  return useQuery({
    queryKey: ["analytics", "products", params],
    queryFn: async () => {
      const { data } = await http.get<ProductsAnalyticsResponse>(
        "/analytics/products",
        {
          params: {
            from: params.from,
            to: params.to,
            limit: params.limit ?? 15,
          },
        },
      );
      return data;
    },
    enabled: Boolean(params.from && params.to),
  });
}
