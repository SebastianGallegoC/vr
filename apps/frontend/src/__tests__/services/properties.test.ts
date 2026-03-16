/**
 * Tests para el servicio de Propiedades (Properties).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { propertiesService } from "@/lib/services/properties";
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
const mockDelete = vi.mocked(apiClient.delete);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("propertiesService", () => {
  describe("list", () => {
    it("llama al endpoint correcto sin filtros", async () => {
      mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20 } });

      const result = await propertiesService.list();

      expect(mockGet).toHaveBeenCalledWith("/properties?");
      expect(result.total).toBe(0);
    });

    it("construye query params con filtros", async () => {
      mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20 } });

      await propertiesService.list({ page: 1, search: "A-10", activo: true });

      const callUrl = mockGet.mock.calls[0][0] as string;
      expect(callUrl).toContain("page=1");
      expect(callUrl).toContain("search=A-10");
      expect(callUrl).toContain("activo=true");
    });
  });

  describe("get", () => {
    it("llama al endpoint con ID correcto", async () => {
      const property = { id: "prop-1", numero_casa: "101" };
      mockGet.mockResolvedValue({ data: property });

      const result = await propertiesService.get("prop-1");

      expect(mockGet).toHaveBeenCalledWith("/properties/prop-1");
      expect(result.numero_casa).toBe("101");
    });
  });

  describe("create", () => {
    it("envía POST con el payload correcto", async () => {
      const payload = { numero_casa: "101", direccion: "Mz1", area_m2: 120 };
      mockPost.mockResolvedValue({ data: { id: "new-id", ...payload } });

      const result = await propertiesService.create(payload);

      expect(mockPost).toHaveBeenCalledWith("/properties", payload);
      expect(result.id).toBe("new-id");
    });
  });

  describe("update", () => {
    it("envía PUT con el payload correcto", async () => {
      const payload = { direccion: "Nueva dirección" };
      mockPut.mockResolvedValue({ data: { id: "prop-1", ...payload } });

      const result = await propertiesService.update("prop-1", payload);

      expect(mockPut).toHaveBeenCalledWith("/properties/prop-1", payload);
      expect(result.direccion).toBe("Nueva dirección");
    });
  });

  describe("deactivate / activate", () => {
    it("deactivate envía activo=false", async () => {
      mockPut.mockResolvedValue({ data: { id: "x", activo: false } });
      await propertiesService.deactivate("x");
      expect(mockPut).toHaveBeenCalledWith("/properties/x", { activo: false });
    });

    it("activate envía activo=true", async () => {
      mockPut.mockResolvedValue({ data: { id: "x", activo: true } });
      await propertiesService.activate("x");
      expect(mockPut).toHaveBeenCalledWith("/properties/x", { activo: true });
    });
  });

  describe("assignOwner / removeOwner", () => {
    it("assignOwner envía POST con propietario_id", async () => {
      mockPost.mockResolvedValue({ data: {} });

      await propertiesService.assignOwner("prop-1", "owner-1");

      expect(mockPost).toHaveBeenCalledWith("/properties/prop-1/owner", {
        propietario_id: "owner-1",
      });
    });

    it("removeOwner envía DELETE", async () => {
      mockDelete.mockResolvedValue({ data: {} });

      await propertiesService.removeOwner("prop-1");

      expect(mockDelete).toHaveBeenCalledWith("/properties/prop-1/owner");
    });
  });
});
