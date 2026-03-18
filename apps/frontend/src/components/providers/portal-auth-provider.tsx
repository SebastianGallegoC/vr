/**
 * VegasDelRio - Auth Provider del Portal de Propietarios.
 *
 * Gestiona la autenticación del portal usando JWT propio (HS256)
 * almacenado en localStorage. Completamente independiente del
 * AuthProvider de Supabase usado por el panel de administración.
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  getPortalToken,
  setPortalToken,
  getPortalProfile,
} from "@/lib/portal-api-client";
import { portalService } from "@/lib/services/portal";
import type { PortalProfile } from "@/types";

interface PortalAuthContextType {
  profile: PortalProfile | null;
  loading: boolean;
  signIn: (profile: PortalProfile) => void;
  signOut: () => void;
}

const PortalAuthContext = createContext<PortalAuthContextType>({
  profile: null,
  loading: true,
  signIn: () => {},
  signOut: () => {},
});

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getPortalToken();
    if (!token) {
      setLoading(false);
      return;
    }

    // Usar perfil cacheado del login para carga instantánea
    const cached = getPortalProfile<PortalProfile>();
    if (cached) {
      setProfile(cached);
      setLoading(false);
      return;
    }

    // Fallback: token existe pero sin cache (ej. recarga de pestaña)
    portalService
      .getProfile()
      .then((data) => setProfile(data))
      .catch(() => {
        setPortalToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback((data: PortalProfile) => {
    setProfile(data);
  }, []);

  const signOut = useCallback(() => {
    portalService.logout();
    setProfile(null);
    router.push("/portal/login");
  }, [router]);

  return (
    <PortalAuthContext.Provider value={{ profile, loading, signIn, signOut }}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  return useContext(PortalAuthContext);
}
