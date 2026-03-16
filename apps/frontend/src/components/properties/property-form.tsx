"use client";

/**
 * VegasDelRio - Formulario de Casa (Crear / Editar).
 *
 * Dialog reutilizable para crear o editar una propiedad.
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
import type { Property, PropertyCreate, PropertyUpdate } from "@/types";

interface PropertyFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PropertyCreate | PropertyUpdate) => Promise<void>;
  property?: Property | null; // null = modo crear, Property = modo editar
}

interface FormState {
  numero_casa: string;
  notas: string;
}

const EMPTY_FORM: FormState = {
  numero_casa: "",
  notas: "",
};

export function PropertyForm({
  open,
  onClose,
  onSubmit,
  property,
}: PropertyFormProps) {
  const isEditing = Boolean(property);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  // Poblar el formulario al abrir en modo edición
  useEffect(() => {
    if (property) {
      setForm({
        numero_casa: property.numero_casa ?? "",
        notas: property.notas ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [property, open]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<FormState> = {};
    if (!form.numero_casa.trim()) {
      newErrors.numero_casa = "El número de casa es obligatorio.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload: PropertyCreate | PropertyUpdate = {
        numero_casa: form.numero_casa.trim(),
        notas: form.notas.trim() || null,
      };
      await onSubmit(payload);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Casa" : "Nueva Casa"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la propiedad."
              : "Registra una nueva casa en el conjunto residencial."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Número de casa */}
          <div className="space-y-1">
            <Label htmlFor="numero_casa">
              Número de casa <span className="text-red-500">*</span>
            </Label>
            <Input
              id="numero_casa"
              name="numero_casa"
              value={form.numero_casa}
              onChange={handleChange}
              placeholder="Ej: 1, 2A, Casa 15"
              autoFocus
            />
            {errors.numero_casa && (
              <p className="text-xs text-red-500">{errors.numero_casa}</p>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <Label htmlFor="notas">Notas</Label>
            <Input
              id="notas"
              name="notas"
              value={form.notas}
              onChange={handleChange}
              placeholder="Observaciones adicionales"
            />
          </div>

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
              {isEditing ? "Guardar cambios" : "Crear casa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
