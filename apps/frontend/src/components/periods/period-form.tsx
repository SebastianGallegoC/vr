"use client";

/**
 * VegasDelRio - Formulario de Periodo de Facturación (Crear / Editar).
 */

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface FormState {
  mes: number;
  anio: number;
  descripcion: string;
  monto_base: string;
  fecha_vencimiento: string;
  estado: string;
}

interface FormErrors {
  monto_base?: string;
  fecha_vencimiento?: string;
  anio?: string;
}

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

const EMPTY_FORM: FormState = {
  mes: currentMonth,
  anio: currentYear,
  descripcion: buildDescripcion(currentMonth, currentYear),
  monto_base: "",
  fecha_vencimiento: "",
  estado: "open",
};

export function PeriodForm({
  open,
  onClose,
  onSubmit,
  period,
}: PeriodFormProps) {
  const isEditing = Boolean(period);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (period) {
      setForm({
        mes: period.mes,
        anio: period.anio,
        descripcion: period.descripcion,
        monto_base: stripNonDigits(String(Math.round(period.monto_base))),
        fecha_vencimiento: period.fecha_vencimiento,
        estado: period.estado,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [period, open]);

  function updateMesAnio(mes: number, anio: number) {
    setForm((prev) => ({
      ...prev,
      mes,
      anio,
      descripcion: buildDescripcion(mes, anio),
    }));
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};
    const monto = Number(form.monto_base);
    if (!form.monto_base || isNaN(monto) || monto <= 0) {
      newErrors.monto_base = "Ingrese un monto válido mayor a 0.";
    }
    if (!form.fecha_vencimiento) {
      newErrors.fecha_vencimiento = "La fecha de vencimiento es obligatoria.";
    }
    if (!form.anio || form.anio < 2020 || form.anio > 2099) {
      newErrors.anio = "Ingrese un año válido (2020-2099).";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (isEditing) {
        const payload: BillingPeriodUpdate = {
          descripcion: form.descripcion.trim(),
          monto_base: Number(form.monto_base),
          fecha_vencimiento: form.fecha_vencimiento,
          estado: form.estado as BillingPeriodUpdate["estado"],
        };
        await onSubmit(payload);
      } else {
        const payload: BillingPeriodCreate = {
          mes: form.mes,
          anio: form.anio,
          descripcion: form.descripcion.trim(),
          monto_base: Number(form.monto_base),
          fecha_vencimiento: form.fecha_vencimiento,
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

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Mes y Año */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>
                Mes <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(form.mes)}
                onValueChange={(val) => updateMesAnio(parseInt(val), form.anio)}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="anio">
                Año <span className="text-red-500">*</span>
              </Label>
              <Input
                id="anio"
                type="number"
                min={2020}
                max={2099}
                value={form.anio}
                onChange={(e) => {
                  const anio = parseInt(e.target.value) || currentYear;
                  updateMesAnio(form.mes, anio);
                }}
                disabled={isEditing}
              />
              {errors.anio && (
                <p className="text-xs text-red-500">{errors.anio}</p>
              )}
            </div>
          </div>

          {/* Descripción (auto-generada) */}
          <div className="space-y-1">
            <Label htmlFor="descripcion">Descripción</Label>
            <Input
              id="descripcion"
              value={form.descripcion}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, descripcion: e.target.value }))
              }
              placeholder="Ej: Cuota Enero 2025"
            />
          </div>

          {/* Monto base */}
          <div className="space-y-1">
            <Label htmlFor="monto_base">
              Monto base ($) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="monto_base"
              type="text"
              inputMode="numeric"
              value={formatWithDots(form.monto_base)}
              onChange={(e) => {
                const raw = stripNonDigits(e.target.value);
                setForm((prev) => ({ ...prev, monto_base: raw }));
                setErrors((prev) => ({ ...prev, monto_base: undefined }));
              }}
              placeholder="Ej: 150000.00"
            />
            {errors.monto_base && (
              <p className="text-xs text-red-500">{errors.monto_base}</p>
            )}
          </div>

          {/* Fecha de vencimiento */}
          <div className="space-y-1">
            <Label htmlFor="fecha_vencimiento">
              Fecha de vencimiento <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fecha_vencimiento"
              type="date"
              value={form.fecha_vencimiento}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  fecha_vencimiento: e.target.value,
                }));
                setErrors((prev) => ({
                  ...prev,
                  fecha_vencimiento: undefined,
                }));
              }}
            />
            {errors.fecha_vencimiento && (
              <p className="text-xs text-red-500">{errors.fecha_vencimiento}</p>
            )}
          </div>

          {/* Estado (solo en edición) */}
          {isEditing && (
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select
                value={form.estado}
                onValueChange={(val) =>
                  setForm((prev) => ({ ...prev, estado: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
      </DialogContent>
    </Dialog>
  );
}
