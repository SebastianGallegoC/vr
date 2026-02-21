/**
 * Página de Gestión de Propietarios.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users } from "lucide-react";

export default function OwnersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Propietarios</h2>
          <p className="text-gray-500">
            Administra los propietarios del conjunto.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Listado de Propietarios
          </CardTitle>
          <CardDescription>
            Conecta la base de datos para visualizar los propietarios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Tabla de propietarios con CRUD — Próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
