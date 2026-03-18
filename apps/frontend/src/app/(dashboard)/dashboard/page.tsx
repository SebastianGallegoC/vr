/**
 * VegasDelRio - Página principal del Dashboard.
 *
 * Muestra un resumen general con tarjetas de estadísticas reales.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Users, Receipt, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
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
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100/60 dark:bg-blue-500/10",
  },
  {
    key: "total_propietarios_activos" as const,
    title: "Propietarios",
    description: "Propietarios activos",
    icon: Users,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100/60 dark:bg-green-500/10",
  },
  {
    key: "facturas_mes" as const,
    title: "Cobros del Mes",
    description: "Facturas generadas",
    icon: Receipt,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100/60 dark:bg-purple-500/10",
  },
  {
    key: "facturas_pendientes" as const,
    title: "Pendientes",
    description: "Cobros sin pagar",
    icon: AlertCircle,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100/60 dark:bg-orange-500/10",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: billsService.getDashboardStats,
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Bienvenido al Panel de Administración
        </h2>
        <p className="text-muted-foreground">
          Conjunto Residencial Vegas del Río — Resumen General
        </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsMeta.map((stat) => (
          <Card
            key={stat.title}
            className="shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.bg}`}
              >
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    (stats?.[stat.key] ?? "—")
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder para contenido futuro */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>
            Aquí se mostrarán las últimas acciones del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Próximamente: historial de acciones recientes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
