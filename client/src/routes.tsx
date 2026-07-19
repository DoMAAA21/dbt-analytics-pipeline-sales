import { Navigate, useRoutes } from "react-router-dom";

import LoginPage from "./app/(auth)/login/page";
import RegisterPage from "./app/(auth)/register/page";
import DashboardPage from "./app/(dashboard)/page";
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
          path: "/dashboard",
          element: <DashboardPage />,
        },
      ],
    },
  ]);
}
