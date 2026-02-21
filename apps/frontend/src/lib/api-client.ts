/**
 * VegasDelRio - Cliente API (Axios).
 *
 * Instancia preconfigurada de Axios para comunicarse con el backend FastAPI.
 * Incluye interceptores para agregar tokens de autenticación automáticamente.
 */

import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 segundos
});

// ---- Interceptor: Agregar token JWT a cada request ----
apiClient.interceptors.request.use(
  async (config) => {
    // TODO: Obtener token de Supabase Auth cuando se implemente
    // const { data: { session } } = await supabase.auth.getSession();
    // if (session?.access_token) {
    //   config.headers.Authorization = `Bearer ${session.access_token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- Interceptor: Manejar errores de respuesta ----
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o no autorizado
      // TODO: Redirigir a login
      console.error("No autorizado - sesión expirada");
    }
    return Promise.reject(error);
  }
);
