/**
 * VegasDelRio - Header del Dashboard.
 *
 * Barra superior con título de la sección actual y acciones rápidas.
 * En móvil (<md): muestra botón hamburger que abre el sidebar como Sheet.
 */

"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/components/providers/auth-provider";
import { SidebarContent } from "@/components/layout/sidebar";

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
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Buscar el título más específico que coincida
  const title =
    Object.entries(pageTitles).find(([path]) =>
      pathname.startsWith(path),
    )?.[1] || "Dashboard";

  // Iniciales del email del usuario (ej: "admin@mail.com" → "A")
  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : "?";

  return (
    <>
      <header className="flex h-16 items-center justify-between bg-background/80 backdrop-blur-sm px-4 md:px-6 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Hamburger — solo visible en <md */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>

          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="sr-only">Cambiar tema</span>
            </Button>
          )}
          {user && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline">{user.email}</span>
            </div>
          )}
        </div>
      </header>

      {/* Sheet móvil (<md) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
