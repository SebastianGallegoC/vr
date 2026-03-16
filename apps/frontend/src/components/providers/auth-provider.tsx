/**
 * VegasDelRio - Auth Provider.
 *
 * Provee el estado de autenticación (usuario logueado) a toda la app
 * vía React Context. Escucha cambios de sesión de Supabase Auth.
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setAuthToken } from "@/lib/api-client";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    // onAuthStateChange dispara INITIAL_SESSION de forma inmediata con la
    // sesión actual, por lo que no necesitamos una llamada extra a getSession().
    // Llamar a getSession() además de onAuthStateChange provoca dos adquisiciones
    // simultáneas del Navigator Lock de Supabase en React 18 StrictMode.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
        setAuthToken(session?.access_token ?? null);
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAuthToken(null);
    router.push("/login");
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return context;
}
