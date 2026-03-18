/**
 * VegasDelRio - Layout del Portal de Propietarios.
 *
 * Layout independiente del panel de administración.
 * Header simple con nombre del conjunto + botón de cerrar sesión.
 * Usa PortalAuthProvider en lugar de AuthProvider de Supabase.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Building2, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PortalAuthProvider,
  usePortalAuth,
} from "@/components/providers/portal-auth-provider";
import { getPortalToken } from "@/lib/portal-api-client";

function PortalHeader() {
  const { profile, signOut } = usePortalAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm shadow-sm">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-primary">Vegas del Río</h1>
            <p className="text-xs text-muted-foreground">Portal Propietarios</p>
          </div>
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
          {profile && (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {profile.propietario.nombre_completo}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={signOut}
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                Salir
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function PortalGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = usePortalAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isLoginPage = pathname === "/portal/login";
    const hasToken = Boolean(getPortalToken());

    if (!hasToken && !isLoginPage) {
      router.replace("/portal/login");
    } else if (hasToken && profile && isLoginPage) {
      router.replace("/portal");
    }
  }, [loading, profile, pathname, router]);

  const isLoginPage = pathname === "/portal/login";

  // En la página de login, no mostrar header ni proteger
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Mientras carga, mostrar indicador
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Sin perfil y no es login → se redirige en el useEffect
  if (!profile) {
    return null;
  }

  return (
    <>
      <PortalHeader />
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </>
  );
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalAuthProvider>
      <PortalGuard>{children}</PortalGuard>
    </PortalAuthProvider>
  );
}
