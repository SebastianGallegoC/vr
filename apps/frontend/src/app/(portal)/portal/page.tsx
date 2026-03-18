/**
 * VegasDelRio - Panel Principal del Portal de Propietarios.
 *
 * Muestra la información de la propiedad y el historial de facturas
 * de la casa con la que el propietario se autenticó.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Home,
  Receipt,
  FileText,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalAuth } from "@/components/providers/portal-auth-provider";
import { portalService } from "@/lib/services/portal";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PortalBill, BillStatus } from "@/types";

const STATUS_CONFIG: Record<BillStatus, { label: string; className: string }> =
  {
    draft: {
      label: "Borrador",
      className:
        "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-300",
    },
    pending: {
      label: "Pendiente",
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300",
    },
    paid: {
      label: "Pagada",
      className:
        "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300",
    },
    overdue: {
      label: "Vencida",
      className: "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300",
    },
    cancelled: {
      label: "Cancelada",
      className:
        "bg-gray-100 text-gray-500 dark:bg-gray-500/10 dark:text-gray-400",
    },
  };

export default function PortalPage() {
  const { profile } = usePortalAuth();
  const [bills, setBills] = useState<PortalBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalService
      .getBills()
      .then(setBills)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const pendingBills = bills.filter(
      (b) => b.estado === "pending" || b.estado === "overdue",
    );
    const paidBills = bills.filter((b) => b.estado === "paid");
    return {
      total: bills.length,
      pendingAmount: pendingBills.reduce((sum, b) => sum + b.monto_total, 0),
      pendingCount: pendingBills.length,
      paidCount: paidBills.length,
    };
  }, [bills]);

  return (
    <div className="space-y-6">
      {/* Información de la propiedad */}
      {profile && (
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-primary/10 p-2">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Mi Propiedad</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Propietario</p>
                <p className="font-medium">
                  {profile.propietario.nombre_completo}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Casa</p>
                <p className="font-medium">{profile.propiedad.numero_casa}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen de facturas */}
      {!loading && bills.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Facturas
                  </p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="rounded-xl bg-primary/10 p-3">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Pendiente por Pagar
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.pendingCount > 0
                      ? formatCurrency(stats.pendingAmount)
                      : "$0"}
                  </p>
                </div>
                <div className="rounded-xl bg-yellow-100/60 dark:bg-yellow-500/10 p-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Facturas Pagadas
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.paidCount}
                  </p>
                </div>
                <div className="rounded-xl bg-green-100/60 dark:bg-green-500/10 p-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Historial de facturas */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-primary/10 p-2">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Historial de Facturas</CardTitle>
              <CardDescription>
                Todas las facturas de tu propiedad
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : bills.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-3 text-muted-foreground">
                No tienes facturas registradas todavía.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="font-semibold">Periodo</TableHead>
                    <TableHead className="font-semibold">N° Factura</TableHead>
                    <TableHead className="font-semibold text-right">
                      Monto
                    </TableHead>
                    <TableHead className="w-[120px] text-center font-semibold">
                      Estado
                    </TableHead>
                    <TableHead className="font-semibold">
                      Fecha de Pago
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground">
                      Creada
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => {
                    const status =
                      STATUS_CONFIG[bill.estado] ?? STATUS_CONFIG.pending;
                    return (
                      <TableRow
                        key={bill.id}
                        className="hover:bg-accent transition-colors"
                      >
                        <TableCell className="py-3 font-medium">
                          {bill.periodo_descripcion ?? "—"}
                        </TableCell>
                        <TableCell className="py-3 text-muted-foreground">
                          {bill.numero_factura}
                        </TableCell>
                        <TableCell className="py-3 text-right font-medium">
                          {formatCurrency(bill.monto_total)}
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <Badge
                            variant="secondary"
                            className={status.className}
                          >
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-muted-foreground">
                          {bill.pagado_en ? formatDate(bill.pagado_en) : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground">
                          {formatDate(bill.creado_en)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
