/**
 * VegasDelRio - Cliente Supabase (Servidor).
 *
 * Crea un cliente de Supabase para usar en Server Components,
 * Server Actions y Route Handlers de Next.js.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll puede fallar en Server Components (no se pueden escribir cookies).
            // Se ignora porque el middleware se encarga de refrescar la sesión.
          }
        },
      },
    }
  );
}
