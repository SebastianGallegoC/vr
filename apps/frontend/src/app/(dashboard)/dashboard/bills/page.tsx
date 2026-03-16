"use client";

/**
 * VegasDelRio - Página de Gestión de Cobros y Facturas.
 *
 * Listar, filtrar, ver detalle y cambiar estado de facturas.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Receipt, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import { BillDetail } from "@/components/bills/bill-detail";
import {
  BillTableRow,
  STATUS_OPTIONS,
} from "@/components/bills/bill-table-row";
import { billsService } from "@/lib/services/bills";
import { periodsService } from "@/lib/services/periods";
import type { Bill, BillUpdate, BillStatus } from "@/types";

const PAGE_SIZE = 20;

export default function BillsPage() {
  const queryClient = useQueryClient();

  // ---- Estado UI ----
  const [page, setPage] = useState(1);
  const [periodFilter, setPeriodFilter] = useState<string | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );

  // Dialogs
  const [detailBill, setDetailBill] = useState<Bill | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    bill: Bill;
    status: BillStatus;
    label: string;
  } | null>(null);

  // ---- Queries ----
  const { data, isLoading, isError } = useQuery({
    queryKey: ["bills", page, periodFilter, statusFilter],
    queryFn: () =>
      billsService.list({
        page,
        page_size: PAGE_SIZE,
        period_id: periodFilter,
        status: statusFilter,
      }),
    placeholderData: (prev) => prev,
  });

  const bills = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Periodos para el filtro del select
  const { data: periods = [] } = useQuery({
    queryKey: ["periods"],
    queryFn: () => periodsService.list(),
  });

  // ---- Mutation: actualizar estado ----
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BillUpdate }) =>
      billsService.update(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success(`Factura ${updated.numero_factura} actualizada.`);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const msg =
        err?.response?.data?.detail ?? "Error al actualizar la factura.";
      toast.error(msg);
    },
  });

  // ---- Handlers ----
  function openDetail(bill: Bill) {
    setDetailBill(bill);
    setDetailOpen(true);
  }

  function openStatusChange(bill: Bill, newStatus: BillStatus, label: string) {
    setConfirmAction({ bill, status: newStatus, label });
    setConfirmOpen(true);
  }

  async function handleStatusChange() {
    if (!confirmAction) return;
    const payload: BillUpdate = { estado: confirmAction.status };
    if (confirmAction.status === "paid") {
      payload.pagado_en = new Date().toISOString();
    }
    await updateMutation.mutateAsync({
      id: confirmAction.bill.id,
      payload,
    });
  }

  function handlePeriodFilter(val: string) {
    setPeriodFilter(val === "all" ? undefined : val);
    setPage(1);
  }

  function handleStatusFilter(val: string) {
    setStatusFilter(val === "all" ? undefined : val);
    setPage(1);
  }

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Cobros y Facturas
          </h2>
          <p className="text-gray-500">
            Administra los cobros generados por periodo.
          </p>
        </div>
      </div>

      {/* Tarjeta principal */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Listado de Facturas
              </CardTitle>
              <CardDescription>
                {total > 0
                  ? `${total} factura${total !== 1 ? "s" : ""}`
                  : "Sin registros"}
              </CardDescription>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="h-4 w-4 text-gray-400" />

              {/* Filtro por periodo */}
              <Select
                value={periodFilter ?? "all"}
                onValueChange={handlePeriodFilter}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos los periodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los periodos</SelectItem>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro por estado */}
              <Select
                value={statusFilter ?? "all"}
                onValueChange={handleStatusFilter}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando facturas...
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-red-500">
              Error al cargar las facturas. Verifica la conexión con el
              servidor.
            </div>
          ) : bills.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              {periodFilter || statusFilter
                ? "No se encontraron facturas con los filtros seleccionados."
                : "No hay facturas generadas todavía."}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold">N° Factura</TableHead>
                    <TableHead className="font-semibold">Casa</TableHead>
                    <TableHead className="font-semibold">Propietario</TableHead>
                    <TableHead className="font-semibold">Periodo</TableHead>
                    <TableHead className="font-semibold text-right">
                      Monto
                    </TableHead>
                    <TableHead className="w-[110px] text-center font-semibold">
                      Estado
                    </TableHead>
                    <TableHead className="w-[100px] text-right text-xs text-gray-500 font-medium">
                      Fecha
                    </TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((b) => (
                    <BillTableRow
                      key={b.id}
                      bill={b}
                      onViewDetail={openDetail}
                      onChangeStatus={openStatusChange}
                    />
                  ))}
                </TableBody>
              </Table>

              <TablePagination
                page={page}
                totalPages={totalPages}
                total={total}
                onPrev={() => setPage((p) => p - 1)}
                onNext={() => setPage((p) => p + 1)}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Detalle de factura */}
      <BillDetail
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        bill={detailBill}
      />

      {/* Dialog: Confirmar cambio de estado */}
      {confirmAction && (
        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleStatusChange}
          title={confirmAction.label}
          description={`¿Seguro que deseas ${confirmAction.label.toLowerCase()} la factura ${confirmAction.bill.numero_factura}?`}
          confirmLabel={confirmAction.label}
          variant={
            confirmAction.status === "cancelled" ? "destructive" : "default"
          }
        />
      )}
    </div>
  );
}
