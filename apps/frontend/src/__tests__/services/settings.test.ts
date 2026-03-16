/**
 * Tests para el servicio de Configuración de Email (Settings).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { settingsService } from "@/lib/services/settings";
import { apiClient } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockDelete = vi.mocked(apiClient.delete);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("settingsService", () => {
  describe("getEmailStatus", () => {
    it("llama al endpoint correcto", async () => {
      const status = { vinculado: false, proveedor: null, email_vinculado: null, vinculado_en: null };
      mockGet.mockResolvedValue({ data: status });

      const result = await settingsService.getEmailStatus();

      expect(mockGet).toHaveBeenCalledWith("/settings/email/status");
      expect(result.vinculado).toBe(false);
    });

    it("retorna datos cuando hay Gmail vinculado", async () => {
      const status = {
        vinculado: true,
        proveedor: "google",
        email_vinculado: "admin@gmail.com",
        vinculado_en: "2025-01-15T10:00:00Z",
      };
      mockGet.mockResolvedValue({ data: status });

      const result = await settingsService.getEmailStatus();

      expect(result.vinculado).toBe(true);
      expect(result.email_vinculado).toBe("admin@gmail.com");
    });
  });

  describe("getGmailAuthUrl", () => {
    it("retorna la URL de autorización", async () => {
      mockGet.mockResolvedValue({ data: { auth_url: "https://accounts.google.com/..." } });

      const result = await settingsService.getGmailAuthUrl();

      expect(mockGet).toHaveBeenCalledWith("/settings/email/gmail/auth-url");
      expect(result.auth_url).toContain("https://accounts.google.com");
    });
  });

  describe("linkGmail", () => {
    it("envía el código OAuth al callback", async () => {
      const response = { vinculado: true, proveedor: "google", email_vinculado: "x@gmail.com", vinculado_en: "now" };
      mockPost.mockResolvedValue({ data: response });

      const result = await settingsService.linkGmail("auth-code-123");

      expect(mockPost).toHaveBeenCalledWith("/settings/email/gmail/callback", {
        code: "auth-code-123",
      });
      expect(result.vinculado).toBe(true);
    });
  });

  describe("unlinkGmail", () => {
    it("envía DELETE al endpoint correcto", async () => {
      mockDelete.mockResolvedValue({ data: {} });

      await settingsService.unlinkGmail();

      expect(mockDelete).toHaveBeenCalledWith("/settings/email/gmail/unlink");
    });
  });
});
