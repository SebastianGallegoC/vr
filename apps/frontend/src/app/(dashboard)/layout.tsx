/**
 * Layout del Dashboard (rutas protegidas).
 *
 * Incluye Sidebar a la izquierda y Header arriba.
 * El contenido de cada página se renderiza en el área principal.
 */

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar fija */}
      <Sidebar />

      {/* Área principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
