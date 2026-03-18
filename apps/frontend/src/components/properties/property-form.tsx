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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Property, PropertyCreate, PropertyUpdate } from "@/types";

interface PropertyFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PropertyCreate | PropertyUpdate) => Promise<void>;
  property?: Property | null;
}

const DIGITS_ONLY = /^\d*$/;

const propertySchema = z.object({
  manzana: z
    .string()
    .min(1, "La manzana es obligatoria.")
    .regex(/^\d+$/, "Solo se permiten dígitos."),
  numero_casa: z
    .string()
    .min(1, "El número de casa es obligatorio.")
    .regex(/^\d+$/, "Solo se permiten dígitos."),
  notas: z.string(),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

export function PropertyForm({
  open,
  onClose,
  onSubmit,
  property,
}: PropertyFormProps) {
  const isEditing = Boolean(property);
  const [loading, setLoading] = useState(false);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: { manzana: "", numero_casa: "", notas: "" },
  });

  useEffect(() => {
    if (property) {
      const [manzana = "", numero = ""] = (property.numero_casa ?? "").split(
        "-",
      );
      form.reset({ manzana, numero_casa: numero, notas: property.notas ?? "" });
    } else {
      form.reset({ manzana: "", numero_casa: "", notas: "" });
    }
  }, [property, open, form]);

  async function handleValid(data: PropertyFormValues) {
    setLoading(true);
    try {
      const payload: PropertyCreate | PropertyUpdate = {
        numero_casa: `${data.manzana.trim()}-${data.numero_casa.trim()}`,
        notas: data.notas.trim() || null,
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

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleValid)}
            className="space-y-4 py-2"
          >
            {/* Manzana y Número de casa */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="manzana"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Manzana <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: 6"
                        inputMode="numeric"
                        autoFocus
                        {...field}
                        onChange={(e) => {
                          if (DIGITS_ONLY.test(e.target.value)) {
                            field.onChange(e);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numero_casa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      N° Casa <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: 21"
                        inputMode="numeric"
                        {...field}
                        onChange={(e) => {
                          if (DIGITS_ONLY.test(e.target.value)) {
                            field.onChange(e);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                {isEditing ? "Guardar cambios" : "Crear casa"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
