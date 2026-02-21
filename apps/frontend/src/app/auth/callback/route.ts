/**
 * VegasDelRio - Auth Callback Route Handler.
 *
 * Maneja el callback de Supabase Auth (ej: verificación de email,
 * magic links, OAuth). Intercambia el code por una sesión.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Si hay error, redirigir al login
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
