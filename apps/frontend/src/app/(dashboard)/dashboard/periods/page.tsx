"use client";

/**
 * VegasDelRio - Página de Gestión de Periodos de Facturación.
 *
 * CRUD completo: listar (con filtro por año), crear y editar periodos.
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  CalendarDays,
  Plus,
  Pencil,
  Filter,
  Mail,
  FileText,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { PeriodForm } from "@/components/periods/period-form";
import { DataTable } from "@/components/ui/data-table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { periodsService } from "@/lib/services/periods";
import { useAuth } from "@/components/providers/auth-provider";
import { formatCurrency } from "@/lib/utils";
import type {
  BillingPeriod,
  BillingPeriodCreate,
  BillingPeriodUpdate,
  GenerateBillsResponse,
  SendEmailsResponse,
} from "@/types";

const MESES: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: {
    label: "Abierto",
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  },
  closed: {
    label: "Cerrado",
    className: "bg-slate-100 text-slate-600",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-red-100 text-red-700",
  },
};

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

export default function PeriodsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ---- Estado UI ----
  const [yearFilter, setYearFilter] = useState<number | undefined>(undefined);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<BillingPeriod | null>(
    null,
  );
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [sendEmailTarget, setSendEmailTarget] = useState<BillingPeriod | null>(
    null,
  );
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateTarget, setGenerateTarget] = useState<BillingPeriod | null>(
    null,
  );

  // ---- Query: listar periodos ----
  const {
    data: periods = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["periods", yearFilter],
    queryFn: () => periodsService.list({ year: yearFilter }),
    placeholderData: (prev) => prev,
    enabled: !!user,
  });

  // ---- Mutation: crear ----
  const createMutation = useMutation({
    mutationFn: (payload: BillingPeriodCreate) =>
      periodsService.create(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["periods"] });
      toast.success(`Periodo "${created.descripcion}" creado correctamente.`);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const msg = err?.response?.data?.detail ?? "Error al crear el periodo.";
      toast.error(msg);
    },
  });

  // ---- Mutation: actualizar ----
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: BillingPeriodUpdate;
    }) => periodsService.update(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["periods"] });
      toast.success(`Periodo "${updated.descripcion}" actualizado.`);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const msg =
        err?.response?.data?.detail ?? "Error al actualizar el periodo.";
      toast.error(msg);
    },
  });

  // ---- Mutation: enviar emails ----
  const sendEmailsMutation = useMutation({
    mutationFn: (periodId: string) => periodsService.sendEmails(periodId),
    onSuccess: (result: SendEmailsResponse) => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      if (result.emails_enviados > 0) {
        toast.success(
          `Se enviaron ${result.emails_enviados} de ${result.total_facturas} correos correctamente.`,
        );
      }
      if (result.emails_fallidos > 0) {
        const errorDetail = result.errores?.length
          ? `\n${result.errores.join("\n")}`
          : "";
        toast.error(
          `${result.emails_fallidos} correo(s) fallaron.${errorDetail}`,
          { duration: 8000 },
        );
      }
      if (result.total_facturas === 0) {
        toast.info("No hay facturas generadas para este periodo.");
      }
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const msg = err?.response?.data?.detail ?? "Error al enviar los correos.";
      toast.error(msg);
    },
  });

  // ---- Mutation: generar cobros ----
  const generateMutation = useMutation({
    mutationFn: (periodId: string) => periodsService.generateBills(periodId),
    onSuccess: (result: GenerateBillsResponse) => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success(result.mensaje);
      if (result.errores.length > 0) {
        toast.warning(
          `${result.errores.length} propiedad(es) con problemas. Revisa que tengan propietario principal asignado.`,
        );
      }
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const msg = err?.response?.data?.detail ?? "Error al generar los cobros.";
      toast.error(msg);
    },
  });

  // ---- Handlers ----
  function openCreate() {
    setEditingPeriod(null);
    setFormOpen(true);
  }

  function openEdit(period: BillingPeriod) {
    setEditingPeriod(period);
    setFormOpen(true);
  }

  function openSendEmail(period: BillingPeriod) {
    setSendEmailTarget(period);
    setSendEmailOpen(true);
  }

  function openGenerate(period: BillingPeriod) {
    setGenerateTarget(period);
    setGenerateOpen(true);
  }

  async function handleSendEmails() {
    if (!sendEmailTarget) return;
    await sendEmailsMutation.mutateAsync(sendEmailTarget.id);
  }

  async function handleGenerate() {
    if (!generateTarget) return;
    await generateMutation.mutateAsync(generateTarget.id);
  }

  async function handleFormSubmit(
    data: BillingPeriodCreate | BillingPeriodUpdate,
  ) {
    if (editingPeriod) {
      await updateMutation.mutateAsync({
        id: editingPeriod.id,
        payload: data as BillingPeriodUpdate,
      });
    } else {
      await createMutation.mutateAsync(data as BillingPeriodCreate);
    }
  }

  // ---- Column definitions ----
  const columns = useMemo<ColumnDef<BillingPeriod, unknown>[]>(
    () => [
      {
        id: "periodo",
        header: ({ column }) => (
          <SortableHeader column={column}>Periodo</SortableHeader>
        ),
        accessorFn: (row) => `${row.anio}-${String(row.mes).padStart(2, "0")}`,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <p className="font-semibold text-foreground">
              {MESES[p.mes]} {p.anio}
            </p>
          );
        },
      },
      {
        accessorKey: "descripcion",
        header: "Descripción",
        cell: ({ row }) => (
          <span className="text-foreground">{row.original.descripcion}</span>
        ),
      },
      {
        accessorKey: "monto_base",
        header: ({ column }) => (
          <SortableHeader column={column}>Monto Base</SortableHeader>
        ),
        cell: ({ row }) => (
          <span className="font-medium text-right block">
            {formatCurrency(row.original.monto_base)}
          </span>
        ),
      },
      {
        accessorKey: "recargo_mora",
        header: "Recargo Mora",
        cell: ({ row }) => (
          <span className="font-medium text-orange-600 text-right block">
            {formatCurrency(row.original.recargo_mora)}
          </span>
        ),
      },
      {
        accessorKey: "fecha_vencimiento",
        header: "Vencimiento",
        cell: ({ row }) => (
          <span className="text-foreground">
            {new Date(
              row.original.fecha_vencimiento + "T00:00:00",
            ).toLocaleDateString("es-CO")}
          </span>
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        size: 110,
        cell: ({ row }) => {
          const status =
            STATUS_CONFIG[row.original.estado] ?? STATUS_CONFIG.open;
          return (
            <Badge variant="secondary" className={status.className}>
              {status.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "creado_en",
        header: ({ column }) => (
          <SortableHeader column={column}>Creado</SortableHeader>
        ),
        size: 120,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.creado_en).toLocaleDateString("es-CO")}
          </span>
        ),
      },
      {
        id: "acciones",
        size: 50,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <span className="sr-only">Acciones</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(p)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                {p.estado === "open" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => openGenerate(p)}
                      className="text-emerald-600 focus:text-emerald-600"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Generar cobros
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openSendEmail(p)}
                      className="text-blue-600 focus:text-blue-600"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Enviar facturas por email
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
                <BreadcrumbPage>Periodos de Facturación</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h2 className="text-2xl font-bold text-foreground">
            Periodos de Facturación
          </h2>
          <p className="text-muted-foreground">
            Gestiona los periodos mensuales de cobro.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo periodo
        </Button>
      </div>

      {/* Tarjeta principal */}
      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Listado de Periodos
              </CardTitle>
              <CardDescription>
                {periods.length > 0
                  ? `${periods.length} periodo${periods.length !== 1 ? "s" : ""}`
                  : "Sin registros"}
              </CardDescription>
            </div>

            {/* Filtro por año */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={yearFilter ? String(yearFilter) : "all"}
                onValueChange={(val) =>
                  setYearFilter(val === "all" ? undefined : parseInt(val))
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Todos los años" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los años</SelectItem>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isError ? (
            <div className="py-16 text-center text-destructive">
              Error al cargar los periodos. Verifica la conexión con el
              servidor.
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={periods}
              sorting={sorting}
              onSortingChange={setSorting}
              isLoading={isLoading}
              getRowId={(row) => row.id}
              emptyState={
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    {yearFilter
                      ? `No hay periodos registrados para el año ${yearFilter}.`
                      : "No hay periodos registrados todavía."}
                  </p>
                  {!yearFilter && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={openCreate}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Crear primer periodo
                    </Button>
                  )}
                </div>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Dialog: Crear / Editar */}
      <PeriodForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        period={editingPeriod}
      />

      {/* Dialog: Confirmar envío de emails */}
      {sendEmailTarget && (
        <ConfirmDialog
          open={sendEmailOpen}
          onClose={() => setSendEmailOpen(false)}
          onConfirm={handleSendEmails}
          title="Enviar facturas por email"
          description={`¿Deseas enviar las facturas del periodo "${sendEmailTarget.descripcion}" por correo electrónico a todos los propietarios? Se generará el PDF de cada factura y se adjuntará al correo.`}
          confirmLabel="Enviar correos"
          variant="default"
        />
      )}

      {/* Dialog: Confirmar generación de cobros */}
      {generateTarget && (
        <ConfirmDialog
          open={generateOpen}
          onClose={() => setGenerateOpen(false)}
          onConfirm={handleGenerate}
          title="Generar cobros"
          description={`¿Deseas generar las facturas para todas las casas activas del periodo "${generateTarget.descripcion}"? Se creará una factura por cada propiedad con propietario principal asignado, usando el monto base del periodo.`}
          confirmLabel="Generar cobros"
          variant="default"
        />
      )}
    </div>
  );
}
