/**
 * VegasDelRio - Servicio API: Portal de Propietarios.
 */

import { portalClient, setPortalToken, setPortalProfile } from "@/lib/portal-api-client";
import type {
  PortalBill,
  PortalLoginResponse,
  PortalProfile,
} from "@/types";

export const portalService = {
  async login(
    email: string,
    password: string,
  ): Promise<PortalLoginResponse> {
    const { data } = await portalClient.post<PortalLoginResponse>(
      "/portal/login",
      { email, password },
    );
    setPortalToken(data.access_token);
    setPortalProfile({
      propietario: data.propietario,
      propiedad: data.propiedad,
    });
    return data;
  },

  async getProfile(): Promise<PortalProfile> {
    const { data } = await portalClient.get<PortalProfile>("/portal/profile");
    return data;
  },

  async getBills(): Promise<PortalBill[]> {
    const { data } = await portalClient.get<PortalBill[]>("/portal/bills");
    return data;
  },

  logout() {
    setPortalToken(null);
  },
};
