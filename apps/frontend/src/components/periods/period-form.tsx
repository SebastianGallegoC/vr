"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import type {
  BillingPeriod,
  BillingPeriodCreate,
  BillingPeriodUpdate,
} from "@/types";

interface PeriodFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: BillingPeriodCreate | BillingPeriodUpdate) => Promise<void>;
  period?: BillingPeriod | null;
}

const MESES = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

const ESTADOS = [
  { value: "open", label: "Abierto" },
  { value: "closed", label: "Cerrado" },
  { value: "cancelled", label: "Cancelado" },
];

function buildDescripcion(mes: number, anio: number): string {
  const mesLabel = MESES.find((m) => m.value === mes)?.label ?? "";
  return `Cuota ${mesLabel} ${anio}`;
}

/** Quita todo lo que no sea dígito. */
function stripNonDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Formatea un string numérico con puntos como separador de miles. */
function formatWithDots(raw: string): string {
  if (!raw) return "";
  return Number(raw).toLocaleString("es-CO");
}

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const periodSchema = z.object({
  mes: z.number().min(1).max(12),
  anio: z
    .number({ message: "Ingrese un año válido." })
    .min(2020, "El año mínimo es 2020.")
    .max(2099, "El año máximo es 2099."),
  descripcion: z.string(),
  monto_base: z.string().min(1, "Ingrese un monto válido mayor a 0."),
  recargo_mora: z.string(),
  fecha_vencimiento: z
    .string()
    .min(1, "La fecha de vencimiento es obligatoria."),
  estado: z.string(),
});

type PeriodFormValues = z.infer<typeof periodSchema>;

export function PeriodForm({
  open,
  onClose,
  onSubmit,
  period,
}: PeriodFormProps) {
  const isEditing = Boolean(period);
  const [loading, setLoading] = useState(false);

  const form = useForm<PeriodFormValues>({
    resolver: zodResolver(periodSchema),
    defaultValues: {
      mes: currentMonth,
      anio: currentYear,
      descripcion: buildDescripcion(currentMonth, currentYear),
      monto_base: "",
      recargo_mora: "",
      fecha_vencimiento: "",
      estado: "open",
    },
  });

  useEffect(() => {
    if (period) {
      form.reset({
        mes: period.mes,
        anio: period.anio,
        descripcion: period.descripcion,
        monto_base: stripNonDigits(String(Math.round(period.monto_base))),
        recargo_mora: stripNonDigits(
          String(Math.round(period.recargo_mora ?? 0)),
        ),
        fecha_vencimiento: period.fecha_vencimiento,
        estado: period.estado,
      });
    } else {
      form.reset({
        mes: currentMonth,
        anio: currentYear,
        descripcion: buildDescripcion(currentMonth, currentYear),
        monto_base: "",
        recargo_mora: "",
        fecha_vencimiento: "",
        estado: "open",
      });
    }
  }, [period, open, form]);

  function updateMesAnio(mes: number, anio: number) {
    form.setValue("mes", mes);
    form.setValue("anio", anio);
    form.setValue("descripcion", buildDescripcion(mes, anio));
  }

  async function handleValid(data: PeriodFormValues) {
    const monto = Number(data.monto_base);
    if (isNaN(monto) || monto <= 0) {
      form.setError("monto_base", {
        message: "Ingrese un monto válido mayor a 0.",
      });
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        const payload: BillingPeriodUpdate = {
          descripcion: data.descripcion.trim(),
          monto_base: monto,
          recargo_mora: Number(data.recargo_mora || "0"),
          fecha_vencimiento: data.fecha_vencimiento,
          estado: data.estado as BillingPeriodUpdate["estado"],
        };
        await onSubmit(payload);
      } else {
        const payload: BillingPeriodCreate = {
          mes: data.mes,
          anio: data.anio,
          descripcion: data.descripcion.trim(),
          monto_base: monto,
          recargo_mora: Number(data.recargo_mora || "0"),
          fecha_vencimiento: data.fecha_vencimiento,
        };
        await onSubmit(payload);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Periodo" : "Nuevo Periodo de Facturación"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del periodo."
              : "Crea un nuevo periodo de cobro mensual."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleValid)}
            className="space-y-4 py-2"
          >
            {/* Mes y Año */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="mes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Mes <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(val) =>
                        updateMesAnio(parseInt(val), form.getValues("anio"))
                      }
                      disabled={isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MESES.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="anio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Año <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2020}
                        max={2099}
                        value={field.value}
                        onChange={(e) => {
                          const anio = parseInt(e.target.value) || currentYear;
                          updateMesAnio(form.getValues("mes"), anio);
                        }}
                        disabled={isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Descripción (auto-generada) */}
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Cuota Enero 2025" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Monto base */}
            <FormField
              control={form.control}
              name="monto_base"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Monto base ($) <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={formatWithDots(field.value)}
                      onChange={(e) => {
                        const raw = stripNonDigits(e.target.value);
                        field.onChange(raw);
                      }}
                      placeholder="Ej: 150.000"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recargo por mora */}
            <FormField
              control={form.control}
              name="recargo_mora"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recargo por mora ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={formatWithDots(field.value)}
                      onChange={(e) => {
                        const raw = stripNonDigits(e.target.value);
                        field.onChange(raw);
                      }}
                      placeholder="Ej: 50.000"
                    />
                  </FormControl>
                  <FormDescription>
                    Se aplica cuando se supera la fecha de vencimiento.
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Fecha de vencimiento */}
            <FormField
              control={form.control}
              name="fecha_vencimiento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Fecha de vencimiento{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Seleccionar fecha de vencimiento"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estado (solo en edición) */}
            {isEditing && (
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ESTADOS.map((e) => (
                          <SelectItem key={e.value} value={e.value}>
                            {e.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Guardar cambios" : "Crear periodo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
