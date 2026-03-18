/**
 * VegasDelRio - Página de Login.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Detectar si el usuario viene de un enlace de recuperación de contraseña
  useEffect(() => {
    // Verificar directamente el hash de la URL (más fiable que solo el evento)
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      router.replace("/update-password" + hash);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/update-password");
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const message = authError.message.toLowerCase();

      if (message.includes("invalid login credentials")) {
        setError("Credenciales inválidas. Verifica tu email y contraseña.");
      } else if (message.includes("email not confirmed")) {
        setError(
          "Tu correo no está confirmado. Revisa tu bandeja o solicita reenvío del enlace.",
        );
      } else {
        setError(`No se pudo iniciar sesión: ${authError.message}`);
      }

      console.error("Supabase login error:", authError);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-primary">
          Vegas del Río
        </CardTitle>
        <CardDescription>
          Sistema de Administración — Iniciar Sesión
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@vegasdelrio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
