/**
 * VegasDelRio - Página principal del Dashboard.
 *
 * Muestra un resumen general con tarjetas de estadísticas reales.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Users, Receipt, AlertCircle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { billsService } from "@/lib/services/bills";

const statsMeta = [
  {
    key: "total_propiedades" as const,
    title: "Total Casas",
    description: "Casas registradas",
    icon: Building2,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    key: "total_propietarios_activos" as const,
    title: "Propietarios",
    description: "Propietarios activos",
    icon: Users,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    key: "facturas_mes" as const,
    title: "Cobros del Mes",
    description: "Facturas generadas",
    icon: Receipt,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    key: "facturas_pendientes" as const,
    title: "Pendientes",
    description: "Cobros sin pagar",
    icon: AlertCircle,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
];

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: billsService.getDashboardStats,
  });

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Bienvenido al Panel de Administración
        </h2>
        <p className="text-gray-500">
          Conjunto Residencial Vegas del Río — Resumen General
        </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsMeta.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                ) : (
                  (stats?.[stat.key] ?? "—")
                )}
              </div>
              <CardDescription>{stat.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder para contenido futuro */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>
            Aquí se mostrarán las últimas acciones del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Próximamente: historial de acciones recientes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
