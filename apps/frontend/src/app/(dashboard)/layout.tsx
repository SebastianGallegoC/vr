/**
 * Layout del Dashboard (rutas protegidas).
 *
 * Incluye Sidebar a la izquierda y Header arriba.
 * - <md: sin sidebar (se abre como Sheet desde el Header)
 * - md: sidebar colapsada (w-16, solo iconos)
 * - lg+: sidebar expandida (w-64, iconos + texto)
 */

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-muted">
      {/* Sidebar — oculta en <md, colapsada en md, expandida en lg+ */}
      <Sidebar />

      {/* Área principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
