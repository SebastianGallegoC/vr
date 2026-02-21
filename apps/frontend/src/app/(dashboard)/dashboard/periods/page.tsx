/**
 * Página de Periodos de Facturación.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export default function PeriodsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Periodos de Facturación
          </h2>
          <p className="text-gray-500">
            Gestiona los periodos mensuales de cobro.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Periodos
          </CardTitle>
          <CardDescription>
            Crea y administra los periodos de facturación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Gestión de periodos — Próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
