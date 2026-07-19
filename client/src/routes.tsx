import { Navigate, useRoutes } from "react-router-dom";

import LoginPage from "./app/(auth)/login/page";
import RegisterPage from "./app/(auth)/register/page";
import DashboardPage from "./app/(dashboard)/page";
import ProductsAnalyticsPage from "./app/(dashboard)/analytics/products/page";
import CustomersAnalyticsPage from "./app/(dashboard)/analytics/customers/page";
import FunnelAnalyticsPage from "./app/(dashboard)/analytics/funnel/page";
import OperationsAnalyticsPage from "./app/(dashboard)/analytics/operations/page";
import { AppShell } from "./components/layout/app-shell";
import { ProtectedRoute } from "./components/protected-route";

export function useAppRoutes() {
  return useRoutes([
    {
      path: "/",
      element: <Navigate to="/dashboard" replace />,
    },
    {
      path: "/login",
      element: <LoginPage />,
    },
    {
      path: "/register",
      element: <RegisterPage />,
    },
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <AppShell />,
          children: [
            {
              path: "/dashboard",
              element: <DashboardPage />,
            },
            {
              path: "/analytics/products",
              element: <ProductsAnalyticsPage />,
            },
            {
              path: "/analytics/customers",
              element: <CustomersAnalyticsPage />,
            },
            {
              path: "/analytics/funnel",
              element: <FunnelAnalyticsPage />,
            },
            {
              path: "/analytics/operations",
              element: <OperationsAnalyticsPage />,
            },
          ],
        },
      ],
    },
  ]);
}
