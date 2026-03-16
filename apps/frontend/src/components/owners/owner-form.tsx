"use client";

/**
 * VegasDelRio - Formulario de Propietario (Crear / Editar).
 *
 * Dialog reutilizable para crear o editar un propietario.
 * Soporta múltiples correos y teléfonos.
 */

import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
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
import type { Owner, OwnerCreate, OwnerUpdate } from "@/types";

interface OwnerFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: OwnerCreate | OwnerUpdate) => Promise<void>;
  owner?: Owner | null;
}

interface FormState {
  nombre_completo: string;
  tipo_documento: string;
  numero_documento: string;
  correos: string[];
  telefonos: string[];
  notas: string;
}

interface FormErrors {
  nombre_completo?: string;
  numero_documento?: string;
  correos?: string;
}

const EMPTY_FORM: FormState = {
  nombre_completo: "",
  tipo_documento: "CC",
  numero_documento: "",
  correos: [""],
  telefonos: [""],
  notas: "",
};

const TIPOS_DOCUMENTO = [
  { value: "CC", label: "Cédula de Ciudadanía" },
  { value: "CE", label: "Cédula de Extranjería" },
  { value: "NIT", label: "NIT" },
  { value: "Pasaporte", label: "Pasaporte" },
];

export function OwnerForm({ open, onClose, onSubmit, owner }: OwnerFormProps) {
  const isEditing = Boolean(owner);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (owner) {
      setForm({
        nombre_completo: owner.nombre_completo ?? "",
        tipo_documento: owner.tipo_documento ?? "CC",
        numero_documento: owner.numero_documento ?? "",
        correos: owner.correos.length > 0 ? [...owner.correos] : [""],
        telefonos: owner.telefonos.length > 0 ? [...owner.telefonos] : [""],
        notas: owner.notas ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [owner, open]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  }

  // ---- Helpers para listas dinámicas ----
  function updateListItem(
    field: "correos" | "telefonos",
    index: number,
    value: string,
  ) {
    setForm((prev) => {
      const copy = [...prev[field]];
      copy[index] = value;
      return { ...prev, [field]: copy };
    });
    if (field === "correos")
      setErrors((prev) => ({ ...prev, correos: undefined }));
  }

  function addListItem(field: "correos" | "telefonos") {
    setForm((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  }

  function removeListItem(field: "correos" | "telefonos", index: number) {
    setForm((prev) => {
      const copy = prev[field].filter((_, i) => i !== index);
      return { ...prev, [field]: copy.length > 0 ? copy : [""] };
    });
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.nombre_completo.trim()) {
      newErrors.nombre_completo = "El nombre completo es obligatorio.";
    }
    if (!form.numero_documento.trim()) {
      newErrors.numero_documento = "El número de documento es obligatorio.";
    }
    const validEmails = form.correos.filter((c) => c.trim());
    if (validEmails.length === 0) {
      newErrors.correos = "Debe ingresar al menos un correo electrónico.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalid = validEmails.find((c) => !emailRegex.test(c.trim()));
      if (invalid) {
        newErrors.correos = `El correo "${invalid.trim()}" no es válido.`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const correos = form.correos.map((c) => c.trim()).filter(Boolean);
      const telefonos = form.telefonos.map((t) => t.trim()).filter(Boolean);

      const payload: OwnerCreate | OwnerUpdate = {
        nombre_completo: form.nombre_completo.trim(),
        tipo_documento: form.tipo_documento,
        numero_documento: form.numero_documento.trim(),
        correos,
        telefonos,
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
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Propietario" : "Nuevo Propietario"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del propietario."
              : "Registra un nuevo propietario en el sistema."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Nombre completo */}
          <div className="space-y-1">
            <Label htmlFor="nombre_completo">
              Nombre completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nombre_completo"
              name="nombre_completo"
              value={form.nombre_completo}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez García"
              autoFocus
            />
            {errors.nombre_completo && (
              <p className="text-xs text-red-500">{errors.nombre_completo}</p>
            )}
          </div>

          {/* Tipo y número de documento */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Tipo documento</Label>
              <Select
                value={form.tipo_documento}
                onValueChange={(val) =>
                  setForm((prev) => ({ ...prev, tipo_documento: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3 space-y-1">
              <Label htmlFor="numero_documento">
                N° Documento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="numero_documento"
                name="numero_documento"
                value={form.numero_documento}
                onChange={handleChange}
                placeholder="Ej: 1234567890"
              />
              {errors.numero_documento && (
                <p className="text-xs text-red-500">
                  {errors.numero_documento}
                </p>
              )}
            </div>
          </div>

          {/* Correos electrónicos */}
          <div className="space-y-2">
            <Label>
              Correos electrónicos <span className="text-red-500">*</span>
            </Label>
            {form.correos.map((correo, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  type="email"
                  value={correo}
                  onChange={(e) =>
                    updateListItem("correos", idx, e.target.value)
                  }
                  placeholder="Ej: juan@ejemplo.com"
                />
                {form.correos.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-gray-400 hover:text-red-500"
                    onClick={() => removeListItem("correos", idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => addListItem("correos")}
            >
              <Plus className="mr-1 h-3 w-3" />
              Agregar correo
            </Button>
            {errors.correos && (
              <p className="text-xs text-red-500">{errors.correos}</p>
            )}
          </div>

          {/* Teléfonos */}
          <div className="space-y-2">
            <Label>Teléfonos</Label>
            {form.telefonos.map((tel, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={tel}
                  onChange={(e) =>
                    updateListItem("telefonos", idx, e.target.value)
                  }
                  placeholder="Ej: +573001234567"
                />
                {form.telefonos.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-gray-400 hover:text-red-500"
                    onClick={() => removeListItem("telefonos", idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => addListItem("telefonos")}
            >
              <Plus className="mr-1 h-3 w-3" />
              Agregar teléfono
            </Button>
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
              {isEditing ? "Guardar cambios" : "Crear propietario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
