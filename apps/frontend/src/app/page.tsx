/**
 * VegasDelRio - Página raíz.
 * Redirige al dashboard (el middleware maneja auth).
 */

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}

