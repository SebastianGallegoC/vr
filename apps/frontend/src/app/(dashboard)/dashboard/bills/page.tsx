"use client";

/**
 * VegasDelRio - Página de Gestión de Cobros y Facturas.
 *
 * Listar, filtrar, ver detalle y cambiar estado de facturas.
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  ColumnDef,
  SortingState,
  RowSelectionState,
} from "@tanstack/react-table";
import {
  Receipt,
  Filter,
  Eye,
  CheckCircle2,
  Send,
  Clock,
  XCircle,
  MoreVertical,
  CheckCheck,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DataTable } from "@/components/ui/data-table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { TablePagination } from "@/components/ui/table-pagination";
import { BillDetail } from "@/components/bills/bill-detail";
import {
  STATUS_CONFIG,
  STATUS_OPTIONS,
} from "@/components/bills/bill-table-row";
import { billsService } from "@/lib/services/bills";
import { periodsService } from "@/lib/services/periods";
import { useAuth } from "@/components/providers/auth-provider";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Bill, BillUpdate, BillStatus } from "@/types";

const DEFAULT_PAGE_SIZE = 20;

export default function BillsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ---- Estado UI ----
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [periodFilter, setPeriodFilter] = useState<string | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Dialogs
  const [detailBill, setDetailBill] = useState<Bill | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    bill: Bill;
    status: BillStatus;
    label: string;
  } | null>(null);
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [batchAction, setBatchAction] = useState<{
    type: "paid";
    label: string;
  } | null>(null);

  // ---- Queries ----
  const { data, isLoading, isError } = useQuery({
    queryKey: ["bills", page, pageSize, periodFilter, statusFilter],
    queryFn: () =>
      billsService.list({
        page,
        page_size: pageSize,
        period_id: periodFilter,
        status: statusFilter,
      }),
    placeholderData: (prev) => prev,
    enabled: !!user,
  });

  const bills = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Periodos para el filtro del select
  const { data: periods = [] } = useQuery({
    queryKey: ["periods"],
    queryFn: () => periodsService.list(),
    enabled: !!user,
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

  // ---- Batch handlers ----
  const selectedBills = useMemo(
    () => bills.filter((b) => rowSelection[b.id]),
    [bills, rowSelection],
  );

  function openBatchMarkPaid() {
    setBatchAction({ type: "paid", label: "Marcar como pagadas" });
    setBatchConfirmOpen(true);
  }

  async function handleBatchAction() {
    if (!batchAction) return;
    const eligible = selectedBills.filter(
      (b) => b.estado !== "paid" && b.estado !== "cancelled",
    );
    let successCount = 0;
    for (const bill of eligible) {
      try {
        await updateMutation.mutateAsync({
          id: bill.id,
          payload: { estado: "paid", pagado_en: new Date().toISOString() },
        });
        successCount++;
      } catch {
        // individual errors handled by mutation onError
      }
    }
    if (successCount > 0) {
      toast.success(
        `${successCount} factura${successCount !== 1 ? "s" : ""} marcada${successCount !== 1 ? "s" : ""} como pagada${successCount !== 1 ? "s" : ""}.`,
      );
    }
    setRowSelection({});
  }

  // ---- Column definitions ----
  const columns = useMemo<ColumnDef<Bill, unknown>[]>(
    () => [
      {
        id: "select",
        size: 40,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Seleccionar todos"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar fila"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "numero_factura",
        header: ({ column }) => (
          <SortableHeader column={column}>N° Factura</SortableHeader>
        ),
        cell: ({ row }) => (
          <p className="font-mono font-semibold text-sm">
            {row.original.numero_factura}
          </p>
        ),
      },
      {
        id: "casa",
        header: "Casa",
        cell: ({ row }) => {
          const b = row.original;
          return b.numero_casa
            ? `Casa ${b.numero_casa}`
            : b.propiedad_id.slice(0, 8);
        },
      },
      {
        id: "propietario",
        header: "Propietario",
        cell: ({ row }) => {
          const b = row.original;
          return (
            <p className="text-sm text-foreground">
              {b.nombre_propietario ?? b.propietario_id.slice(0, 8)}
            </p>
          );
        },
      },
      {
        id: "periodo",
        header: "Periodo",
        cell: ({ row }) => {
          const b = row.original;
          return (
            <span className="text-sm text-foreground">
              {b.periodo_descripcion ?? b.periodo_facturacion_id.slice(0, 8)}
            </span>
          );
        },
      },
      {
        accessorKey: "monto_total",
        header: ({ column }) => (
          <SortableHeader column={column}>Monto</SortableHeader>
        ),
        cell: ({ row }) => (
          <span className="font-medium text-right block">
            {formatCurrency(row.original.monto_total)}
          </span>
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        size: 110,
        cell: ({ row }) => {
          const statusCfg =
            STATUS_CONFIG[row.original.estado] ?? STATUS_CONFIG.draft;
          return (
            <Badge variant="secondary" className={statusCfg.className}>
              {statusCfg.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "creado_en",
        header: ({ column }) => (
          <SortableHeader column={column}>Fecha</SortableHeader>
        ),
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.creado_en)}
          </span>
        ),
      },
      {
        id: "acciones",
        size: 50,
        cell: ({ row }) => {
          const bill = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <span className="sr-only">Acciones</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openDetail(bill)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalle
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                {bill.estado !== "paid" && bill.estado !== "cancelled" && (
                  <DropdownMenuItem
                    onClick={() =>
                      openStatusChange(bill, "paid", "Marcar como pagada")
                    }
                    className="text-emerald-700 focus:text-emerald-700"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Marcar como pagada
                  </DropdownMenuItem>
                )}

                {bill.estado === "draft" && (
                  <DropdownMenuItem
                    onClick={() =>
                      openStatusChange(bill, "pending", "Marcar como pendiente")
                    }
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Marcar como pendiente
                  </DropdownMenuItem>
                )}

                {bill.estado === "pending" && (
                  <DropdownMenuItem
                    onClick={() =>
                      openStatusChange(bill, "overdue", "Marcar como vencida")
                    }
                    className="text-red-600 focus:text-red-600"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Marcar como vencida
                  </DropdownMenuItem>
                )}

                {bill.estado !== "cancelled" && bill.estado !== "paid" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        openStatusChange(bill, "cancelled", "Cancelar factura")
                      }
                      className="text-red-600 focus:text-red-600"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancelar factura
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">
                  Panel Principal
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Cobros y Facturas</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h2 className="text-2xl font-bold text-foreground">
            Cobros y Facturas
          </h2>
          <p className="text-muted-foreground">
            Administra los cobros generados por periodo.
          </p>
        </div>
      </div>

      {/* Tarjeta principal */}
      <Card className="shadow-md">
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
              <Filter className="h-4 w-4 text-muted-foreground" />

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
          {/* Batch actions bar */}
          {selectedBills.length > 0 && (
            <div className="flex items-center gap-3 border-b bg-muted/50 px-6 py-3">
              <span className="text-sm font-medium">
                {selectedBills.length} factura
                {selectedBills.length !== 1 ? "s" : ""} seleccionada
                {selectedBills.length !== 1 ? "s" : ""}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={openBatchMarkPaid}
                disabled={
                  selectedBills.filter(
                    (b) => b.estado !== "paid" && b.estado !== "cancelled",
                  ).length === 0
                }
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Marcar como pagadas
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRowSelection({})}
              >
                Deseleccionar
              </Button>
            </div>
          )}

          {isError ? (
            <div className="py-16 text-center text-destructive">
              Error al cargar las facturas. Verifica la conexión con el
              servidor.
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={bills}
                sorting={sorting}
                onSortingChange={setSorting}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                isLoading={isLoading}
                getRowId={(row) => row.id}
                emptyState={
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Receipt className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      {periodFilter || statusFilter
                        ? "No se encontraron facturas con los filtros seleccionados."
                        : "No hay facturas generadas todavía."}
                    </p>
                    {!periodFilter && !statusFilter && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Genera cobros desde la página de Periodos →
                      </p>
                    )}
                  </div>
                }
              />
              {totalPages > 0 && (
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  selectedCount={Object.keys(rowSelection).length}
                />
              )}
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

      {/* Dialog: Confirmar acción masiva */}
      {batchAction && (
        <ConfirmDialog
          open={batchConfirmOpen}
          onClose={() => setBatchConfirmOpen(false)}
          onConfirm={handleBatchAction}
          title={batchAction.label}
          description={`¿Seguro que deseas marcar ${selectedBills.filter((b) => b.estado !== "paid" && b.estado !== "cancelled").length} factura(s) como pagadas?`}
          confirmLabel={batchAction.label}
          variant="default"
        />
      )}
    </div>
  );
}
