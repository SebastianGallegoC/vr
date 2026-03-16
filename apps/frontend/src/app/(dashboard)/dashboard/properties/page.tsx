"use client";

/**
 * VegasDelRio - Página de Gestión de Casas.
 *
 * CRUD completo: listar, crear, editar y activar/desactivar propiedades.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  PowerOff,
  Power,
  Loader2,
  UserPlus,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PropertyForm } from "@/components/properties/property-form";
import { AssignOwnerDialog } from "@/components/properties/assign-owner-dialog";
import { OwnerInfoDialog } from "@/components/properties/owner-info-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import { propertiesService } from "@/lib/services/properties";
import { formatDate } from "@/lib/utils";
import type { Property, PropertyCreate, PropertyUpdate } from "@/types";

const PAGE_SIZE = 20;

export default function PropertiesPage() {
  const queryClient = useQueryClient();

  // ---- Estado UI ----
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Property | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Property | null>(null);
  const [ownerInfoOpen, setOwnerInfoOpen] = useState(false);
  const [ownerInfoTarget, setOwnerInfoTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // ---- Query: listar casas ----
  const { data, isLoading, isError } = useQuery({
    queryKey: ["properties", page, search],
    queryFn: () =>
      propertiesService.list({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const properties = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ---- Mutation: crear ----
  const createMutation = useMutation({
    mutationFn: (payload: PropertyCreate) => propertiesService.create(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success(`Casa "${created.numero_casa}" creada correctamente.`);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const msg = err?.response?.data?.detail ?? "Error al crear la casa.";
      toast.error(msg);
    },
  });

  // ---- Mutation: actualizar ----
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PropertyUpdate }) =>
      propertiesService.update(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success(`Casa "${updated.numero_casa}" actualizada.`);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const msg = err?.response?.data?.detail ?? "Error al actualizar la casa.";
      toast.error(msg);
    },
  });

  // ---- Handlers ----
  function openCreate() {
    setEditingProperty(null);
    setFormOpen(true);
  }

  function openEdit(property: Property) {
    setEditingProperty(property);
    setFormOpen(true);
  }

  function openConfirm(property: Property) {
    setConfirmTarget(property);
    setConfirmOpen(true);
  }

  function openAssign(property: Property) {
    setAssignTarget(property);
    setAssignOpen(true);
  }

  async function handleFormSubmit(data: PropertyCreate | PropertyUpdate) {
    if (editingProperty) {
      await updateMutation.mutateAsync({
        id: editingProperty.id,
        payload: data,
      });
    } else {
      await createMutation.mutateAsync(data as PropertyCreate);
    }
  }

  async function handleToggleActive() {
    if (!confirmTarget) return;
    const payload: PropertyUpdate = { activo: !confirmTarget.activo };
    await updateMutation.mutateAsync({ id: confirmTarget.id, payload });
  }

  async function handleAssignOwner(ownerId: string) {
    if (!assignTarget) return;
    await propertiesService.assignOwner(assignTarget.id, ownerId);
    queryClient.invalidateQueries({ queryKey: ["properties"] });
    toast.success(`Propietario asignado a casa "${assignTarget.numero_casa}".`);
  }

  async function handleRemoveOwner() {
    if (!assignTarget) return;
    await propertiesService.removeOwner(assignTarget.id);
    queryClient.invalidateQueries({ queryKey: ["properties"] });
    toast.success(
      `Propietario desasignado de casa "${assignTarget.numero_casa}".`,
    );
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Casas</h2>
          <p className="text-gray-500">
            Administra las casas del conjunto residencial.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva casa
        </Button>
      </div>

      {/* Tarjeta principal */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Propiedades
              </CardTitle>
              <CardDescription>
                {total > 0
                  ? `${total} casa${total !== 1 ? "s" : ""} registrada${total !== 1 ? "s" : ""}`
                  : "Sin registros"}
              </CardDescription>
            </div>

            {/* Buscador */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar por número..."
                  className="pl-8 w-52"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Buscar
              </Button>
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                >
                  Limpiar
                </Button>
              )}
            </form>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando casas...
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-red-500">
              Error al cargar las casas. Verifica la conexión con el servidor.
            </div>
          ) : properties.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              {search
                ? `No se encontraron casas con "${search}".`
                : "No hay casas registradas todavía. ¡Crea la primera!"}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="w-[120px] font-semibold">
                      N° Casa
                    </TableHead>
                    <TableHead className="font-semibold">Propietario</TableHead>
                    <TableHead className="font-semibold">Descripción</TableHead>
                    <TableHead className="w-[100px] text-center font-semibold">
                      Estado
                    </TableHead>
                    <TableHead className="w-[120px] text-right text-xs text-gray-500 font-medium">
                      Creado
                    </TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((p) => (
                    <TableRow
                      key={p.id}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      <TableCell className="py-4 font-bold text-lg text-blue-600">
                        {p.numero_casa}
                      </TableCell>
                      <TableCell className="py-4">
                        {p.propietario_actual ? (
                          <button
                            type="button"
                            onClick={() => {
                              setOwnerInfoTarget({
                                id: p.propietario_actual!.propietario_id,
                                name: p.propietario_actual!.nombre_completo,
                              });
                              setOwnerInfoOpen(true);
                            }}
                            className="w-full max-w-[260px] rounded-lg border border-border bg-background px-3 py-2 text-left shadow-sm transition-all hover:bg-accent/40 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                          >
                            <p className="truncate text-sm font-semibold text-foreground">
                              {p.propietario_actual.nombre_completo}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {p.propietario_actual.numero_documento}
                            </p>
                          </button>
                        ) : (
                          <span className="text-xs text-amber-600 italic">
                            Sin propietario
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-700 font-medium">
                            {p.notas ? (
                              <span>{p.notas}</span>
                            ) : (
                              <span className="text-gray-400 italic">
                                Sin notas
                              </span>
                            )}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Badge
                          variant={p.activo ? "default" : "secondary"}
                          className={
                            p.activo
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600"
                          }
                        >
                          {p.activo ? "✓ Activa" : "○ Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-right text-xs text-gray-500">
                        {formatDate(p.creado_en)}
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
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(p)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAssign(p)}>
                              <UserPlus className="mr-2 h-4 w-4" />
                              {p.propietario_actual
                                ? "Cambiar propietario"
                                : "Asignar propietario"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openConfirm(p)}
                              className={
                                p.activo
                                  ? "text-red-600 focus:text-red-600"
                                  : "text-green-700 focus:text-green-700"
                              }
                            >
                              {p.activo ? (
                                <>
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <Power className="mr-2 h-4 w-4" />
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <TablePagination
                page={page}
                totalPages={totalPages}
                total={total}
                onPrev={() => setPage((p) => p - 1)}
                onNext={() => setPage((p) => p + 1)}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Crear / Editar */}
      <PropertyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        property={editingProperty}
      />

      {/* Dialog: Confirmar activar / desactivar */}
      {confirmTarget && (
        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleToggleActive}
          title={confirmTarget.activo ? "Desactivar casa" : "Activar casa"}
          description={
            confirmTarget.activo
              ? `¿Seguro que deseas desactivar la casa "${confirmTarget.numero_casa}"? No se generarán cobros para esta propiedad mientras esté inactiva.`
              : `¿Deseas reactivar la casa "${confirmTarget.numero_casa}"?`
          }
          confirmLabel={confirmTarget.activo ? "Desactivar" : "Activar"}
          variant={confirmTarget.activo ? "destructive" : "default"}
        />
      )}

      {/* Dialog: Asignar propietario */}
      <AssignOwnerDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onAssign={handleAssignOwner}
        onRemove={handleRemoveOwner}
        property={assignTarget}
      />

      {/* Dialog: Info del propietario */}
      <OwnerInfoDialog
        open={ownerInfoOpen}
        onClose={() => setOwnerInfoOpen(false)}
        ownerId={ownerInfoTarget?.id ?? null}
        ownerName={ownerInfoTarget?.name}
      />
    </div>
  );
}
