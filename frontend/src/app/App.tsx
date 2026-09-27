import type { JSX } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { AdminProvider } from "../features/auth/AdminAccess";
import { router } from "./router";
import Toast from "../components/ui/Toast";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const App = (): JSX.Element => {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminProvider>
        <RouterProvider router={router} />
        <Toast />
      </AdminProvider>
    </QueryClientProvider>
  );
};

export default App;
