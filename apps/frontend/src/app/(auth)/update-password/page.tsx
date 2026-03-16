/**
 * VegasDelRio - Página de Actualización de Contraseña.
 *
 * Se muestra cuando el usuario hace clic en el enlace de recuperación
 * enviado por correo desde Supabase. Permite establecer una nueva contraseña.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

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

const MIN_PASSWORD_LENGTH = 8;

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Si el hash contiene el token de recovery, Supabase lo procesará automáticamente
    const hash = window.location.hash;
    const hasRecoveryToken = hash.includes("type=recovery");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (
          event === "PASSWORD_RECOVERY" ||
          (event === "SIGNED_IN" && session)
        ) {
          setSessionReady(true);
        }
      },
    );

    // Si tenemos el hash de recovery, Supabase lo procesará al inicializar.
    // También verificar si ya hay una sesión activa.
    if (!hasRecoveryToken) {
      supabase.auth
        .getSession()
        .then(
          ({ data: { session } }: { data: { session: Session | null } }) => {
            if (session) {
              setSessionReady(true);
            }
          },
        );
    }

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const validate = (): string | null => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    if (password !== confirmPassword) {
      return "Las contraseñas no coinciden.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(
        updateError.message ===
          "New password should be different from the old password."
          ? "La nueva contraseña debe ser diferente a la anterior."
          : "No se pudo actualizar la contraseña. Intenta solicitar un nuevo enlace de recuperación.",
      );
      setLoading(false);
      return;
    }

    setSuccess(true);

    // Cerrar sesión de recuperación y redirigir al login
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login"), 2000);
  };

  if (!sessionReady) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-600">
            Vegas del Río
          </CardTitle>
          <CardDescription>Verificando enlace de recuperación…</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>
            Si el enlace expiró o es inválido, puedes{" "}
            <a href="/login" className="text-blue-600 underline">
              volver al inicio de sesión
            </a>{" "}
            y solicitar uno nuevo.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-600">
            ¡Contraseña actualizada!
          </CardTitle>
          <CardDescription>
            Tu contraseña fue cambiada exitosamente. Redirigiendo al inicio de
            sesión…
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-blue-600">
          Vegas del Río
        </CardTitle>
        <CardDescription>Establece tu nueva contraseña</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
            />
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Actualizando…" : "Actualizar Contraseña"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
