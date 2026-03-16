/**
 * VegasDelRio - Provider de React Query.
 *
 * Envuelve la aplicación para proveer el QueryClient de TanStack Query.
 * Debe ser un Client Component ("use client").
 */

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // No refetch automático al cambiar de pestaña en admin panel
            refetchOnWindowFocus: false,
            // Reintentar solo 1 vez en caso de error
            retry: 1,
            // Los datos se consideran "frescos" por 5 minutos
            staleTime: 5 * 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
