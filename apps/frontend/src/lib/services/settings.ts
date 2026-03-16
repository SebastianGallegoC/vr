/**
 * VegasDelRio - Servicio API: Configuración (Email, Gmail OAuth).
 */

import { apiClient } from "@/lib/api-client";

export interface EmailStatus {
  vinculado: boolean;
  proveedor: string | null;
  email_vinculado: string | null;
  vinculado_en: string | null;
}

export interface GmailAuthUrl {
  auth_url: string;
}

export const settingsService = {
  /** Consulta el estado de vinculación de email. */
  async getEmailStatus(): Promise<EmailStatus> {
    const { data } = await apiClient.get<EmailStatus>("/settings/email/status");
    return data;
  },

  /** Obtiene la URL de consentimiento de Google OAuth. */
  async getGmailAuthUrl(): Promise<GmailAuthUrl> {
    const { data } = await apiClient.get<GmailAuthUrl>(
      "/settings/email/gmail/auth-url"
    );
    return data;
  },

  /** Envía el código de autorización de Google para vincular Gmail. */
  async linkGmail(code: string): Promise<EmailStatus> {
    const { data } = await apiClient.post<EmailStatus>(
      "/settings/email/gmail/callback",
      { code }
    );
    return data;
  },

  /** Desvincula la cuenta de Gmail. */
  async unlinkGmail(): Promise<void> {
    await apiClient.delete("/settings/email/gmail/unlink");
  },
};
