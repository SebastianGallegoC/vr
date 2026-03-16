"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, UserPlus, UserX, Search, Home } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ownersService } from "@/lib/services/owners";
import type { Property } from "@/types";

type OwnerFilter = "todos" | "sin_casa" | "con_casa";

interface AssignOwnerDialogProps {
  open: boolean;
  onClose: () => void;
  onAssign: (ownerId: string) => Promise<void>;
  onRemove: () => Promise<void>;
  property: Property | null;
}

export function AssignOwnerDialog({
  open,
  onClose,
  onAssign,
  onRemove,
  property,
}: AssignOwnerDialogProps) {
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState<OwnerFilter>("todos");

  const currentOwner = property?.propietario_actual;

  // Cargar todos los propietarios activos
  const { data: allOwnersData, isLoading: loadingAll } = useQuery({
    queryKey: ["owners-for-assign", "all"],
    queryFn: () =>
      ownersService.list({ page: 1, page_size: 100, activo: true }),
    enabled: open,
    staleTime: 60_000,
  });

  // Cargar propietarios sin casa asignada
  const { data: noPropertyOwnersData, isLoading: loadingNoProperty } = useQuery(
    {
      queryKey: ["owners-for-assign", "sin_propiedad"],
      queryFn: () =>
        ownersService.list({
          page: 1,
          page_size: 100,
          activo: true,
          sin_propiedad: true,
        }),
      enabled: open,
      staleTime: 60_000,
    },
  );

  const allOwners = allOwnersData?.items ?? [];
  const noPropertyOwners = new Set(
    (noPropertyOwnersData?.items ?? []).map((o) => o.id),
  );

  // Filtrar según tipo + búsqueda por texto
  const filteredOwners = useMemo(() => {
    let list = allOwners;

    if (filterType === "sin_casa") {
      list = list.filter((o) => noPropertyOwners.has(o.id));
    } else if (filterType === "con_casa") {
      list = list.filter((o) => !noPropertyOwners.has(o.id));
    }

    if (searchText.trim()) {
      const term = searchText.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.nombre_completo.toLowerCase().includes(term) ||
          o.numero_documento.toLowerCase().includes(term),
      );
    }

    return list;
  }, [allOwners, noPropertyOwners, filterType, searchText]);

  useEffect(() => {
    if (open) {
      setSelectedOwnerId("");
      setSearchText("");
      setFilterType("todos");
    }
  }, [open]);

  async function handleAssign() {
    if (!selectedOwnerId) return;
    setLoading(true);
    try {
      await onAssign(selectedOwnerId);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setLoading(true);
    try {
      await onRemove();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const isLoading = loadingAll || loadingNoProperty;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {currentOwner ? "Cambiar propietario" : "Asignar propietario"}
          </DialogTitle>
          <DialogDescription>
            Casa <strong>{property?.numero_casa}</strong>
            {currentOwner
              ? ` — Propietario actual: ${currentOwner.nombre_completo}`
              : " — Sin propietario asignado"}
          </DialogDescription>
        </DialogHeader>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o cédula..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          {(
            [
              { key: "todos", label: "Todos" },
              { key: "sin_casa", label: "Sin casa asignada" },
              { key: "con_casa", label: "Con casa asignada" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterType(key)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                filterType === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-accent"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground self-center">
            {filteredOwners.length} resultado
            {filteredOwners.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Lista de propietarios */}
        <ScrollArea className="flex-1 min-h-0 max-h-[400px] border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando propietarios...
            </div>
          ) : filteredOwners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No se encontraron propietarios</p>
              {searchText && (
                <p className="text-xs mt-1">
                  Intenta con otro término de búsqueda
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredOwners.map((owner) => {
                const isSelected = selectedOwnerId === owner.id;
                const hasProp = !noPropertyOwners.has(owner.id);
                return (
                  <button
                    key={owner.id}
                    type="button"
                    onClick={() => setSelectedOwnerId(owner.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-accent/50 ${
                      isSelected
                        ? "bg-primary/10 border-l-2 border-l-primary"
                        : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {owner.nombre_completo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {owner.tipo_documento}: {owner.numero_documento}
                        {owner.correos?.[0] && (
                          <span className="ml-2">· {owner.correos[0]}</span>
                        )}
                      </p>
                    </div>
                    {hasProp ? (
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px]"
                      >
                        <Home className="h-3 w-3 mr-1" />
                        Con casa
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        Sin casa
                      </Badge>
                    )}
                    {isSelected && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <div>
            {currentOwner && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRemove}
                disabled={loading}
                className="text-red-600 hover:text-red-700"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserX className="mr-2 h-4 w-4" />
                )}
                Desasignar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedOwnerId || loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Asignar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
