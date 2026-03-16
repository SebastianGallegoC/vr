/**
 * Tests para el servicio de Periodos de Facturación.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { periodsService } from "@/lib/services/periods";
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
const mockPut = vi.mocked(apiClient.put);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("periodsService", () => {
  describe("list", () => {
    it("llama al endpoint sin filtros", async () => {
      mockGet.mockResolvedValue({ data: [] });

      const result = await periodsService.list();

      expect(mockGet).toHaveBeenCalledWith("/billing/periods?");
      expect(result).toEqual([]);
    });

    it("filtra por año", async () => {
      mockGet.mockResolvedValue({ data: [{ id: "p1", anio: 2025 }] });

      await periodsService.list({ year: 2025 });

      const callUrl = mockGet.mock.calls[0][0] as string;
      expect(callUrl).toContain("year=2025");
    });
  });

  describe("create", () => {
    it("envía POST con payload correcto", async () => {
      const payload = {
        mes: 6,
        anio: 2025,
        descripcion: "Junio 2025",
        monto_base: 250000,
        fecha_vencimiento: "2025-06-30",
      };
      mockPost.mockResolvedValue({ data: { id: "new-period", ...payload } });

      const result = await periodsService.create(payload);

      expect(mockPost).toHaveBeenCalledWith("/billing/periods", payload);
      expect(result.id).toBe("new-period");
    });
  });

  describe("update", () => {
    it("envía PUT con payload correcto", async () => {
      const payload = { descripcion: "Actualizado" };
      mockPut.mockResolvedValue({ data: { id: "p1", ...payload } });

      const result = await periodsService.update("p1", payload);

      expect(mockPut).toHaveBeenCalledWith("/billing/periods/p1", payload);
      expect(result.descripcion).toBe("Actualizado");
    });
  });

  describe("sendEmails", () => {
    it("envía POST al endpoint de envío de emails", async () => {
      const response = { total_facturas: 5, emails_enviados: 4, emails_fallidos: 1, errores: [] };
      mockPost.mockResolvedValue({ data: response });

      const result = await periodsService.sendEmails("p1");

      expect(mockPost).toHaveBeenCalledWith("/billing/periods/p1/send-emails");
      expect(result.emails_enviados).toBe(4);
    });
  });

  describe("generateBills", () => {
    it("envía POST con periodo_facturacion_id", async () => {
      const response = { facturas_generadas: 10, facturas_omitidas: 0, mensaje: "OK", errores: [] };
      mockPost.mockResolvedValue({ data: response });

      const result = await periodsService.generateBills("p1");

      expect(mockPost).toHaveBeenCalledWith("/billing/generate", {
        periodo_facturacion_id: "p1",
      });
      expect(result.facturas_generadas).toBe(10);
    });
  });
});
