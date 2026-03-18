"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Owner, OwnerCreate, OwnerUpdate } from "@/types";

interface OwnerFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: OwnerCreate | OwnerUpdate) => Promise<void>;
  owner?: Owner | null;
}

const TIPOS_DOCUMENTO = [
  { value: "CC", label: "Cédula de Ciudadanía" },
  { value: "CE", label: "Cédula de Extranjería" },
  { value: "NIT", label: "NIT" },
  { value: "Pasaporte", label: "Pasaporte" },
];

const ownerSchema = z.object({
  nombre_completo: z.string().min(1, "El nombre completo es obligatorio."),
  tipo_documento: z.string().default("CC"),
  numero_documento: z.string().min(1, "El número de documento es obligatorio."),
  correos: z
    .array(z.object({ value: z.string() }))
    .transform((arr) => arr.filter((c) => c.value.trim()))
    .pipe(
      z
        .array(
          z.object({
            value: z.string().email("Correo electrónico no válido."),
          }),
        )
        .min(1, "Debe ingresar al menos un correo electrónico."),
    ),
  telefonos: z.array(z.object({ value: z.string() })),
  notas: z.string(),
});

type OwnerFormValues = z.input<typeof ownerSchema>;

export function OwnerForm({ open, onClose, onSubmit, owner }: OwnerFormProps) {
  const isEditing = Boolean(owner);
  const [loading, setLoading] = useState(false);

  const form = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerSchema),
    defaultValues: {
      nombre_completo: "",
      tipo_documento: "CC",
      numero_documento: "",
      correos: [{ value: "" }],
      telefonos: [{ value: "" }],
      notas: "",
    },
  });

  const correos = useFieldArray({ control: form.control, name: "correos" });
  const telefonos = useFieldArray({ control: form.control, name: "telefonos" });

  useEffect(() => {
    if (owner) {
      form.reset({
        nombre_completo: owner.nombre_completo ?? "",
        tipo_documento: owner.tipo_documento ?? "CC",
        numero_documento: owner.numero_documento ?? "",
        correos:
          owner.correos.length > 0
            ? owner.correos.map((c) => ({ value: c }))
            : [{ value: "" }],
        telefonos:
          owner.telefonos.length > 0
            ? owner.telefonos.map((t) => ({ value: t }))
            : [{ value: "" }],
        notas: owner.notas ?? "",
      });
    } else {
      form.reset({
        nombre_completo: "",
        tipo_documento: "CC",
        numero_documento: "",
        correos: [{ value: "" }],
        telefonos: [{ value: "" }],
        notas: "",
      });
    }
  }, [owner, open, form]);

  async function handleValid(data: OwnerFormValues) {
    setLoading(true);
    try {
      const parsed = ownerSchema.parse(data);
      const payload: OwnerCreate | OwnerUpdate = {
        nombre_completo: parsed.nombre_completo.trim(),
        tipo_documento: parsed.tipo_documento,
        numero_documento: parsed.numero_documento.trim(),
        correos: parsed.correos.map((c) => c.value.trim()),
        telefonos: parsed.telefonos.map((t) => t.value.trim()).filter(Boolean),
        notas: parsed.notas.trim() || null,
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

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleValid)}
            className="space-y-4 py-2"
          >
            {/* Nombre completo */}
            <FormField
              control={form.control}
              name="nombre_completo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre completo <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Juan Pérez García"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo y número de documento */}
            <div className="grid grid-cols-5 gap-3">
              <FormField
                control={form.control}
                name="tipo_documento"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Tipo documento</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIPOS_DOCUMENTO.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
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
                name="numero_documento"
                render={({ field }) => (
                  <FormItem className="col-span-3">
                    <FormLabel>
                      N° Documento <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Correos electrónicos */}
            <div className="space-y-2">
              <FormLabel>
                Correos electrónicos <span className="text-destructive">*</span>
              </FormLabel>
              {correos.fields.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`correos.${idx}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Ej: juan@ejemplo.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {correos.fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => correos.remove(idx)}
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
                onClick={() => correos.append({ value: "" })}
              >
                <Plus className="mr-1 h-3 w-3" />
                Agregar correo
              </Button>
              {form.formState.errors.correos?.root && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.correos.root.message}
                </p>
              )}
            </div>

            {/* Teléfonos */}
            <div className="space-y-2">
              <FormLabel>Teléfonos</FormLabel>
              {telefonos.fields.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`telefonos.${idx}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Ej: +573001234567" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {telefonos.fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => telefonos.remove(idx)}
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
                onClick={() => telefonos.append({ value: "" })}
              >
                <Plus className="mr-1 h-3 w-3" />
                Agregar teléfono
              </Button>
            </div>

            {/* Notas */}
            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones adicionales"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
