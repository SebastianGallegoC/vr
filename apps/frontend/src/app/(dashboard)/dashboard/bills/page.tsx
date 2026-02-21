/**
 * Página de Cobros y Facturas.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Receipt } from "lucide-react";

export default function BillsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Cobros y Facturas
          </h2>
          <p className="text-gray-500">
            Genera y administra los cobros de administración.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Facturas
          </CardTitle>
          <CardDescription>
            Genera cobros masivos y envía notificaciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Gestión de cobros — Próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
