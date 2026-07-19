import { useRoutes } from "react-router-dom";
import Login from "./app/(auth)/login";

export function useAppRoutes() {
  return useRoutes([
    {
      path: "/",
      element: <Login />,
    },
  ]);
}
