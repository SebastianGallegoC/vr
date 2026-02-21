/**
 * Página de Gestión de Casas.
 * Se implementará el CRUD completo con tabla y formularios.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function PropertiesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Casas</h2>
          <p className="text-gray-500">
            Administra las casas del conjunto residencial.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Listado de Casas
          </CardTitle>
          <CardDescription>
            Conecta la base de datos para visualizar las casas registradas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Tabla de casas con CRUD — Próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
