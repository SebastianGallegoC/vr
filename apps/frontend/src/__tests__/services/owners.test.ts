/**
 * Tests para el servicio de Propietarios (Owners).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ownersService } from "@/lib/services/owners";
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

describe("ownersService", () => {
  describe("list", () => {
    it("llama al endpoint correcto sin filtros", async () => {
      mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20 } });

      const result = await ownersService.list();

      expect(mockGet).toHaveBeenCalledWith("/owners?");
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("construye query params con filtros", async () => {
      mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 2, page_size: 10 } });

      await ownersService.list({ page: 2, page_size: 10, search: "Carlos", activo: true });

      const callUrl = mockGet.mock.calls[0][0] as string;
      expect(callUrl).toContain("page=2");
      expect(callUrl).toContain("page_size=10");
      expect(callUrl).toContain("search=Carlos");
      expect(callUrl).toContain("activo=true");
    });

    it("incluye filtro sin_propiedad", async () => {
      mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20 } });

      await ownersService.list({ sin_propiedad: true });

      const callUrl = mockGet.mock.calls[0][0] as string;
      expect(callUrl).toContain("sin_propiedad=true");
    });
  });

  describe("get", () => {
    it("llama al endpoint con el ID correcto", async () => {
      const owner = { id: "abc-123", nombre_completo: "Carlos" };
      mockGet.mockResolvedValue({ data: owner });

      const result = await ownersService.get("abc-123");

      expect(mockGet).toHaveBeenCalledWith("/owners/abc-123");
      expect(result.nombre_completo).toBe("Carlos");
    });
  });

  describe("create", () => {
    it("envía los datos al endpoint correcto", async () => {
      const payload = {
        nombre_completo: "Ana García",
        tipo_documento: "CC",
        numero_documento: "987654321",
        correos: ["ana@test.com"],
        telefonos: ["+573001111111"],
      };
      mockPost.mockResolvedValue({ data: { id: "new-id", ...payload } });

      const result = await ownersService.create(payload);

      expect(mockPost).toHaveBeenCalledWith("/owners", payload);
      expect(result.id).toBe("new-id");
    });
  });

  describe("update", () => {
    it("envía PUT al endpoint correcto", async () => {
      const payload = { nombre_completo: "Carlos Actualizado" };
      mockPut.mockResolvedValue({ data: { id: "abc", ...payload } });

      const result = await ownersService.update("abc", payload);

      expect(mockPut).toHaveBeenCalledWith("/owners/abc", payload);
      expect(result.nombre_completo).toBe("Carlos Actualizado");
    });
  });

  describe("deactivate / activate", () => {
    it("deactivate envía activo=false", async () => {
      mockPut.mockResolvedValue({ data: { id: "x", activo: false } });

      const result = await ownersService.deactivate("x");

      expect(mockPut).toHaveBeenCalledWith("/owners/x", { activo: false });
      expect(result.activo).toBe(false);
    });

    it("activate envía activo=true", async () => {
      mockPut.mockResolvedValue({ data: { id: "x", activo: true } });

      const result = await ownersService.activate("x");

      expect(mockPut).toHaveBeenCalledWith("/owners/x", { activo: true });
      expect(result.activo).toBe(true);
    });
  });
});
