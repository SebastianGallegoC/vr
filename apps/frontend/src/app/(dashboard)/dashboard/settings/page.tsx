/**
 * Página de Configuración.
 *
 * Permite vincular/desvincular Gmail para envío de correos
 * y consultar el estado del servicio de email.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Mail, Settings, Unlink } from "lucide-react";
import { settingsService, type EmailStatus } from "@/lib/services/settings";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [linking, setLinking] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  // Query: estado de vinculación
  const { data: emailStatus, isLoading } = useQuery<EmailStatus>({
    queryKey: ["email-status"],
    queryFn: settingsService.getEmailStatus,
  });

  // Escuchar postMessage del popup de Gmail OAuth
  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "gmail-oauth-code") {
        setLinking(true);
        try {
          await settingsService.linkGmail(event.data.code);
          await queryClient.invalidateQueries({ queryKey: ["email-status"] });
          toast.success("Gmail vinculado correctamente.");
        } catch (err: unknown) {
          const detail =
            (err as { response?: { data?: { detail?: string } } })?.response
              ?.data?.detail || "Error vinculando Gmail. Intenta de nuevo.";
          toast.error(detail);
        } finally {
          setLinking(false);
        }
      }

      if (event.data?.type === "gmail-oauth-error") {
        toast.error("Se canceló la autorización de Google.");
      }
    },
    [queryClient],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // Abrir popup de consentimiento de Google
  async function handleLinkGmail() {
    try {
      const { auth_url } = await settingsService.getGmailAuthUrl();

      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      window.open(
        auth_url,
        "gmail-oauth",
        `width=${width},height=${height},left=${left},top=${top},popup=yes`,
      );
    } catch {
      toast.error(
        "Error obteniendo URL de autorización. Verifica la configuración de Google OAuth.",
      );
    }
  }

  // Desvincular Gmail (con useMutation)
  const unlinkMutation = useMutation({
    mutationFn: () => settingsService.unlinkGmail(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-status"] });
      toast.success("Gmail desvinculado.");
    },
    onError: () => {
      toast.error("Error desvinculando Gmail.");
    },
  });

  const isLinked = emailStatus?.vinculado ?? false;

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Panel Principal</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Configuración</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h2 className="text-2xl font-bold text-foreground">Configuración</h2>
        <p className="text-muted-foreground">Ajustes generales del sistema.</p>
      </div>

      {/* ---- Card: Email ---- */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Servicio de Email</CardTitle>
                <CardDescription>
                  Vincula tu cuenta de Gmail para enviar recibos a los
                  propietarios desde tu correo personal.
                </CardDescription>
              </div>
            </div>
            {!isLoading && (
              <Badge variant={isLinked ? "default" : "outline"}>
                {isLinked ? "Vinculado" : "Sin vincular"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Consultando estado...
            </div>
          ) : isLinked ? (
            /* --- Estado: Vinculado --- */
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border bg-accent p-4">
                <GoogleIcon className="h-8 w-8 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Cuenta vinculada
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {emailStatus?.email_vinculado}
                  </p>
                  {emailStatus?.vinculado_en && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Vinculado el{" "}
                      {new Date(emailStatus.vinculado_en).toLocaleDateString(
                        "es-CO",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Los recibos de administración se enviarán desde esta cuenta. Si
                deseas cambiar la cuenta, desvincula primero.
              </p>

              <Button
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setConfirmUnlink(true)}
                disabled={unlinkMutation.isPending}
              >
                {unlinkMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="mr-2 h-4 w-4" />
                )}
                Desvincular Gmail
              </Button>
            </div>
          ) : (
            /* --- Estado: Sin vincular --- */
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed border-border bg-muted p-6 text-center">
                <Mail className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium text-foreground">
                  No hay cuenta de Gmail vinculada
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vincula tu cuenta de Google para enviar correos directamente
                  desde tu Gmail. No necesitas configurar contraseñas de
                  aplicación.
                </p>
              </div>

              <Button onClick={handleLinkGmail} disabled={linking}>
                {linking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon className="mr-2 h-4 w-4" />
                )}
                {linking ? "Vinculando..." : "Vincular cuenta de Gmail"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Card: Información General ---- */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Información del Sistema
          </CardTitle>
          <CardDescription>Datos generales del aplicativo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sistema</span>
              <span className="font-medium">Vegas del Río</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Versión</span>
              <span className="font-medium">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entorno</span>
              <Badge variant="outline">Desarrollo</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmación para desvincular */}
      <ConfirmDialog
        open={confirmUnlink}
        onClose={() => setConfirmUnlink(false)}
        onConfirm={() => unlinkMutation.mutateAsync()}
        title="Desvincular Gmail"
        description="¿Estás seguro de desvincular esta cuenta de Gmail? Los correos del sistema dejarán de enviarse hasta que vincules otra cuenta o configures SMTP manualmente."
        confirmLabel="Desvincular"
        variant="destructive"
      />
    </div>
  );
}
