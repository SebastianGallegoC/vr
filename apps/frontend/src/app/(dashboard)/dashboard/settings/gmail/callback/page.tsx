/**
 * VegasDelRio - Gmail OAuth Callback Page.
 *
 * Esta página se abre como popup durante el flujo de vinculación de Gmail.
 * Captura el código de autorización de la URL y lo envía al opener
 * vía postMessage, luego se cierra automáticamente.
 */

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function GmailCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      // Informar al opener que hubo un error
      if (window.opener) {
        window.opener.postMessage(
          { type: "gmail-oauth-error", error },
          window.location.origin,
        );
      }
      setTimeout(() => window.close(), 2000);
      return;
    }

    if (code) {
      setStatus("success");
      // Enviar el código al opener (la página de Settings)
      if (window.opener) {
        window.opener.postMessage(
          { type: "gmail-oauth-code", code },
          window.location.origin,
        );
      }
      setTimeout(() => window.close(), 1500);
      return;
    }

    setStatus("error");
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Procesando autorización...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-gray-600">
              ¡Gmail vinculado! Cerrando ventana...
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-gray-600">
              Error en la autorización. Cerrando ventana...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
