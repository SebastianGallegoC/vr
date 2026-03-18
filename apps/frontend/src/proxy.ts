/**
 * VegasDelRio - Proxy de Next.js 16+.
 *
 * Reemplaza al antiguo middleware.ts.
 * Protege las rutas del dashboard y refresca la sesión de Supabase
 * en cada request para evitar que expire.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Leer sesión desde la cookie (sin llamada de red → más rápido).
  // Usamos getSession() aquí porque el proxy se ejecuta en CADA navegación.
  // Para operaciones sensibles (server actions, API routes) usar getUser().
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  // --- Protección de Rutas ---

  // Las rutas del portal de propietarios usan auth propia (JWT HS256),
  // no Supabase Auth — se excluyen de esta protección.
  const isPortalRoute = request.nextUrl.pathname.startsWith("/portal");

  // Si NO hay usuario y trata de acceder al dashboard → login
  if (
    !user &&
    !isPortalRoute &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    request.nextUrl.pathname !== "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Si HAY usuario y está en login → dashboard
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Ejecutar proxy en todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, archivos SVG/PNG/etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
