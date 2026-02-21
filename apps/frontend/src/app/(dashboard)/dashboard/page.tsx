/**
 * VegasDelRio - Página principal del Dashboard.
 *
 * Muestra un resumen general con tarjetas de estadísticas.
 */

import { Building2, Users, Receipt, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stats = [
  {
    title: "Total Casas",
    value: "—",
    description: "Casas registradas",
    icon: Building2,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Propietarios",
    value: "—",
    description: "Propietarios activos",
    icon: Users,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    title: "Cobros del Mes",
    value: "—",
    description: "Facturas generadas",
    icon: Receipt,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    title: "Pendientes",
    value: "—",
    description: "Cobros sin pagar",
    icon: AlertCircle,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
];

export default function DashboardPage() {
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
        {stats.map((stat) => (
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
              <div className="text-3xl font-bold">{stat.value}</div>
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
            Conecta tu base de datos Supabase para ver datos reales.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
