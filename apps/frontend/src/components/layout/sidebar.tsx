/**
 * VegasDelRio - Sidebar del Dashboard.
 *
 * Navegación principal de la aplicación.
 * - lg+: sidebar expandida (w-64) con iconos + texto
 * - md: sidebar colapsada (w-16) solo iconos con Tooltip
 * - <md: oculta, se abre como Sheet desde el Header
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Building2,
  Receipt,
  CalendarDays,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/components/providers/auth-provider";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Casas",
    href: "/dashboard/properties",
    icon: Building2,
  },
  {
    title: "Propietarios",
    href: "/dashboard/owners",
    icon: Users,
  },
  {
    title: "Periodos",
    href: "/dashboard/periods",
    icon: CalendarDays,
  },
  {
    title: "Cobros",
    href: "/dashboard/bills",
    icon: Receipt,
  },
];

/* ── Contenido reutilizable del sidebar (desktop + mobile sheet) ── */

interface SidebarContentProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

function SidebarContent({
  collapsed = false,
  onNavigate,
}: SidebarContentProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <>
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "gap-2 px-6",
        )}
      >
        <Building2 className="h-6 w-6 shrink-0 text-primary" />
        {!collapsed && (
          <span className="text-lg font-bold text-primary">Vegas del Río</span>
        )}
      </div>

      {/* Navegación */}
      <nav className={cn("flex-1 space-y-1 py-4", collapsed ? "px-2" : "px-3")}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          const link = (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center rounded-xl text-sm font-medium transition-all duration-200",
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && item.title}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>

      <Separator className={collapsed ? "mx-2" : "mx-3"} />

      {/* Footer con configuración y logout */}
      <div className={cn("py-4 space-y-1", collapsed ? "px-2" : "px-3")}>
        {(() => {
          const settingsLink = (
            <Link
              href="/dashboard/settings"
              onClick={onNavigate}
              className={cn(
                "flex items-center rounded-xl text-sm font-medium transition-all duration-200",
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                pathname === "/dashboard/settings"
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Settings className="h-5 w-5 shrink-0" />
              {!collapsed && "Configuración"}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip>
                <TooltipTrigger asChild>{settingsLink}</TooltipTrigger>
                <TooltipContent side="right">Configuración</TooltipContent>
              </Tooltip>
            );
          }

          return settingsLink;
        })()}

        {(() => {
          const logoutBtn = (
            <Button
              variant="ghost"
              className={cn(
                "w-full rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                collapsed ? "justify-center px-0" : "justify-start gap-3 px-3",
              )}
              onClick={() => {
                onNavigate?.();
                signOut();
              }}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && "Cerrar Sesión"}
            </Button>
          );

          if (collapsed) {
            return (
              <Tooltip>
                <TooltipTrigger asChild>{logoutBtn}</TooltipTrigger>
                <TooltipContent side="right">Cerrar Sesión</TooltipContent>
              </Tooltip>
            );
          }

          return logoutBtn;
        })()}
      </div>
    </>
  );
}

/* ── Sidebar desktop (md+): colapsada md, expandida lg+ ── */

export function Sidebar() {
  return (
    <aside
      className={cn(
        "hidden md:flex h-screen flex-col border-r border-border bg-card",
        "md:w-16 lg:w-64",
      )}
    >
      {/* md: collapsed, lg+: expanded */}
      <div className="hidden lg:flex h-full flex-col">
        <SidebarContent collapsed={false} />
      </div>
      <div className="flex lg:hidden h-full flex-col">
        <SidebarContent collapsed />
      </div>
    </aside>
  );
}

/* ── Sidebar móvil (Sheet) ── */

export { SidebarContent, navItems };
