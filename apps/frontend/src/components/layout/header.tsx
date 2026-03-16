/**
 * VegasDelRio - Header del Dashboard.
 *
 * Barra superior con título de la sección actual y acciones rápidas.
 */

"use client";

import { usePathname } from "next/navigation";
import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";

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
  const { user } = useAuth();

  // Buscar el título más específico que coincida
  const title =
    Object.entries(pageTitles).find(([path]) =>
      pathname.startsWith(path),
    )?.[1] || "Dashboard";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
              <User className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <span className="hidden sm:inline">{user.email}</span>
          </div>
        )}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-500" />
        </Button>
      </div>
    </header>
  );
}
