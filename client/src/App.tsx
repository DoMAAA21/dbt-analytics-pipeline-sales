import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { useAppRoutes } from "./routes";

const queryClient = new QueryClient();

function AppRoutes() {
  return useAppRoutes();
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster richColors position="top-center" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
