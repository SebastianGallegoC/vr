"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail, Phone, FileText, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ownersService } from "@/lib/services/owners";

interface OwnerInfoDialogProps {
  open: boolean;
  onClose: () => void;
  ownerId: string | null;
  ownerName?: string;
}

export function OwnerInfoDialog({
  open,
  onClose,
  ownerId,
  ownerName,
}: OwnerInfoDialogProps) {
  const { data: owner, isLoading } = useQuery({
    queryKey: ["owner-detail", ownerId],
    queryFn: () => ownersService.get(ownerId!),
    enabled: open && !!ownerId,
    staleTime: 60_000,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {ownerName ?? "Propietario"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando información...
          </div>
        ) : !owner ? (
          <p className="text-sm text-muted-foreground py-4">
            No se pudo cargar la información del propietario.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Documento */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Documento</p>
                <p className="text-sm font-medium">
                  {owner.tipo_documento}: {owner.numero_documento}
                </p>
              </div>
            </div>

            <Separator />

            {/* Correos */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Correos electrónicos
                </span>
              </div>
              {owner.correos && owner.correos.length > 0 ? (
                <div className="flex flex-col gap-1.5 pl-6">
                  {owner.correos.map((correo, i) => (
                    <a
                      key={i}
                      href={`mailto:${correo}`}
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {correo}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground pl-6 italic">
                  Sin correos registrados
                </p>
              )}
            </div>

            <Separator />

            {/* Teléfonos */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Teléfonos
                </span>
              </div>
              {owner.telefonos && owner.telefonos.length > 0 ? (
                <div className="flex flex-col gap-1.5 pl-6">
                  {owner.telefonos.map((tel, i) => (
                    <a
                      key={i}
                      href={`tel:${tel}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {tel}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground pl-6 italic">
                  Sin teléfonos registrados
                </p>
              )}
            </div>

            {/* Notas */}
            {owner.notas && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Notas
                  </p>
                  <p className="text-sm text-gray-700">{owner.notas}</p>
                </div>
              </>
            )}

            {/* Estado */}
            <div className="pt-1">
              <Badge
                variant={owner.activo ? "default" : "secondary"}
                className={
                  owner.activo
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-600"
                }
              >
                {owner.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
