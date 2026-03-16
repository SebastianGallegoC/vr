/**
 * Tests para el servicio de Facturas (Bills).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { billsService } from "@/lib/services/bills";
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

describe("billsService", () => {
  describe("list", () => {
    it("llama al endpoint sin filtros", async () => {
      mockGet.mockResolvedValue({
        data: { items: [], total: 0, page: 1, page_size: 20 },
      });

      const result = await billsService.list();

      expect(mockGet).toHaveBeenCalledWith("/billing/bills?");
      expect(result.total).toBe(0);
    });

    it("construye query params con filtros", async () => {
      mockGet.mockResolvedValue({
        data: { items: [], total: 0, page: 1, page_size: 10 },
      });

      await billsService.list({
        page: 1,
        page_size: 10,
        period_id: "period-123",
        status: "draft",
      });

      const callUrl = mockGet.mock.calls[0][0] as string;
      expect(callUrl).toContain("page=1");
      expect(callUrl).toContain("page_size=10");
      expect(callUrl).toContain("period_id=period-123");
      expect(callUrl).toContain("status=draft");
    });
  });

  describe("get", () => {
    it("llama al endpoint con ID correcto", async () => {
      const bill = { id: "bill-1", numero_factura: "VDR-2025-06-001" };
      mockGet.mockResolvedValue({ data: bill });

      const result = await billsService.get("bill-1");

      expect(mockGet).toHaveBeenCalledWith("/billing/bills/bill-1");
      expect(result.numero_factura).toBe("VDR-2025-06-001");
    });
  });

  describe("create", () => {
    it("envía POST con payload correcto", async () => {
      const payload = {
        propiedad_id: "prop-1",
        periodo_facturacion_id: "per-1",
        propietario_id: "own-1",
        items: [{ concepto: "Administración", monto: 250000 }],
      };
      mockPost.mockResolvedValue({ data: { id: "new-bill", ...payload } });

      const result = await billsService.create(payload);

      expect(mockPost).toHaveBeenCalledWith("/billing/bills", payload);
      expect(result.id).toBe("new-bill");
    });
  });

  describe("update", () => {
    it("envía PUT con payload correcto", async () => {
      const payload = { estado: "paid" as const };
      mockPut.mockResolvedValue({ data: { id: "bill-1", estado: "paid" } });

      const result = await billsService.update("bill-1", payload);

      expect(mockPut).toHaveBeenCalledWith("/billing/bills/bill-1", payload);
      expect(result.estado).toBe("paid");
    });
  });
});
