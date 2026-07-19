import { BrowserRouter } from "react-router-dom";
import { useAppRoutes } from "./routes";

function AppRoutes() {
  return useAppRoutes();
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
