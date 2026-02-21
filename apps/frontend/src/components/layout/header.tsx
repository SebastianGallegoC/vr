/**
 * VegasDelRio - Header del Dashboard.
 *
 * Barra superior con título de la sección actual y acciones rápidas.
 */

"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  "/dashboard": "Panel Principal",
  "/dashboard/properties": "Gestión de Casas",
  "/dashboard/owners": "Gestión de Propietarios",
  "/dashboard/periods": "Periodos de Facturación",
  "/dashboard/bills": "Cobros y Facturas",
  "/dashboard/settings": "Configuración",
};

export function Header() {
  const pathname = usePathname();

  // Buscar el título más específico que coincida
  const title =
    Object.entries(pageTitles).find(([path]) => pathname.startsWith(path))?.[1] ||
    "Dashboard";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-500" />
        </Button>
      </div>
    </header>
  );
}
