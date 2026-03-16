"use client";

/**
 * VegasDelRio - Página de Gestión de Periodos de Facturación.
 *
 * CRUD completo: listar (con filtro por año), crear y editar periodos.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  Plus,
  Pencil,
  Loader2,
  Filter,
  Mail,
  FileText,
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
  Table,
  TableBody,
  TableCell,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PeriodForm } from "@/components/periods/period-form";
import { periodsService } from "@/lib/services/periods";
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

  // ---- Estado UI ----
  const [yearFilter, setYearFilter] = useState<number | undefined>(undefined);

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

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Periodos de Facturación
          </h2>
          <p className="text-gray-500">
            Gestiona los periodos mensuales de cobro.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo periodo
        </Button>
      </div>

      {/* Tarjeta principal */}
      <Card>
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
              <Filter className="h-4 w-4 text-gray-400" />
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
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando periodos...
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-red-500">
              Error al cargar los periodos. Verifica la conexión con el
              servidor.
            </div>
          ) : periods.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              {yearFilter
                ? `No hay periodos registrados para el año ${yearFilter}.`
                : "No hay periodos registrados todavía. ¡Crea el primero!"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-semibold">Periodo</TableHead>
                  <TableHead className="font-semibold">Descripción</TableHead>
                  <TableHead className="font-semibold text-right">
                    Monto Base
                  </TableHead>
                  <TableHead className="font-semibold">Vencimiento</TableHead>
                  <TableHead className="w-[110px] text-center font-semibold">
                    Estado
                  </TableHead>
                  <TableHead className="w-[120px] text-right text-xs text-gray-500 font-medium">
                    Creado
                  </TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => {
                  const status = STATUS_CONFIG[p.estado] ?? STATUS_CONFIG.open;
                  return (
                    <TableRow
                      key={p.id}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      <TableCell className="py-4">
                        <p className="font-semibold text-gray-900">
                          {MESES[p.mes]} {p.anio}
                        </p>
                      </TableCell>
                      <TableCell className="py-4 text-gray-700">
                        {p.descripcion}
                      </TableCell>
                      <TableCell className="py-4 text-right font-medium">
                        {formatCurrency(p.monto_base)}
                      </TableCell>
                      <TableCell className="py-4 text-gray-700">
                        {new Date(
                          p.fecha_vencimiento + "T00:00:00",
                        ).toLocaleDateString("es-CO")}
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Badge variant="secondary" className={status.className}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-right text-xs text-gray-500">
                        {new Date(p.creado_en).toLocaleDateString("es-CO")}
                      </TableCell>
                      <TableCell className="py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <span className="sr-only">Acciones</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <circle cx="12" cy="5" r="1.5" />
                                <circle cx="12" cy="12" r="1.5" />
                                <circle cx="12" cy="19" r="1.5" />
                              </svg>
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
