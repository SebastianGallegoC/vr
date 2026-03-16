"use client";

/**
 * VegasDelRio - Página de Gestión de Propietarios.
 *
 * CRUD completo: listar, crear, editar y activar/desactivar propietarios.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Search,
  Pencil,
  PowerOff,
  Power,
  Loader2,
  Mail,
  Phone,
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
import { OwnerForm } from "@/components/owners/owner-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import { ownersService } from "@/lib/services/owners";
import { formatDate } from "@/lib/utils";
import type { Owner, OwnerCreate, OwnerUpdate } from "@/types";

const PAGE_SIZE = 20;

export default function OwnersPage() {
  const queryClient = useQueryClient();

  // ---- Estado UI ----
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Owner | null>(null);

  // ---- Query: listar propietarios ----
  const { data, isLoading, isError } = useQuery({
    queryKey: ["owners", page, search],
    queryFn: () =>
      ownersService.list({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const owners = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ---- Mutation: crear ----
  const createMutation = useMutation({
    mutationFn: (payload: OwnerCreate) => ownersService.create(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      toast.success(
        `Propietario "${created.nombre_completo}" creado correctamente.`,
      );
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const msg =
        err?.response?.data?.detail ?? "Error al crear el propietario.";
      toast.error(msg);
    },
  });

  // ---- Mutation: actualizar ----
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OwnerUpdate }) =>
      ownersService.update(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      toast.success(`Propietario "${updated.nombre_completo}" actualizado.`);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const msg =
        err?.response?.data?.detail ?? "Error al actualizar el propietario.";
      toast.error(msg);
    },
  });

  // ---- Handlers ----
  function openCreate() {
    setEditingOwner(null);
    setFormOpen(true);
  }

  function openEdit(owner: Owner) {
    setEditingOwner(owner);
    setFormOpen(true);
  }

  function openConfirm(owner: Owner) {
    setConfirmTarget(owner);
    setConfirmOpen(true);
  }

  async function handleFormSubmit(data: OwnerCreate | OwnerUpdate) {
    if (editingOwner) {
      await updateMutation.mutateAsync({
        id: editingOwner.id,
        payload: data,
      });
    } else {
      await createMutation.mutateAsync(data as OwnerCreate);
    }
  }

  async function handleToggleActive() {
    if (!confirmTarget) return;
    const payload: OwnerUpdate = { activo: !confirmTarget.activo };
    await updateMutation.mutateAsync({ id: confirmTarget.id, payload });
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
          <h2 className="text-2xl font-bold text-gray-900">Propietarios</h2>
          <p className="text-gray-500">
            Administra los propietarios del conjunto residencial.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo propietario
        </Button>
      </div>

      {/* Tarjeta principal */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Listado de Propietarios
              </CardTitle>
              <CardDescription>
                {total > 0
                  ? `${total} propietario${total !== 1 ? "s" : ""} registrado${total !== 1 ? "s" : ""}`
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
                  placeholder="Buscar nombre o documento..."
                  className="pl-8 w-60"
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
              Cargando propietarios...
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-red-500">
              Error al cargar los propietarios. Verifica la conexión con el
              servidor.
            </div>
          ) : owners.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              {search
                ? `No se encontraron propietarios con "${search}".`
                : "No hay propietarios registrados todavía. ¡Crea el primero!"}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold">Nombre</TableHead>
                    <TableHead className="font-semibold">Documento</TableHead>
                    <TableHead className="font-semibold">Casa</TableHead>
                    <TableHead className="font-semibold">Contacto</TableHead>
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
                  {owners.map((o) => (
                    <TableRow
                      key={o.id}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      <TableCell className="py-4">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {o.nombre_completo}
                          </p>
                          {o.notas && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {o.notas}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-xs text-gray-500">
                          {o.tipo_documento}
                        </span>{" "}
                        <span className="font-medium">
                          {o.numero_documento}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        {o.casa_actual ? (
                          <Badge
                            variant="outline"
                            className="font-medium text-blue-700 border-blue-200 bg-blue-50"
                          >
                            Casa {o.casa_actual.numero_casa}
                          </Badge>
                        ) : (
                          <span className="text-xs text-amber-600 italic">
                            Sin casa asignada
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-0.5">
                          {o.correos.map((correo, idx) => (
                            <p
                              key={idx}
                              className="flex items-center gap-1 text-sm text-gray-700"
                            >
                              <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              {correo}
                            </p>
                          ))}
                          {o.telefonos.map((tel, idx) => (
                            <p
                              key={idx}
                              className="flex items-center gap-1 text-sm text-gray-500"
                            >
                              <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              {tel}
                            </p>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Badge
                          variant={o.activo ? "default" : "secondary"}
                          className={
                            o.activo
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600"
                          }
                        >
                          {o.activo ? "✓ Activo" : "○ Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-right text-xs text-gray-500">
                        {formatDate(o.creado_en)}
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
                            <DropdownMenuItem onClick={() => openEdit(o)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openConfirm(o)}
                              className={
                                o.activo
                                  ? "text-red-600 focus:text-red-600"
                                  : "text-green-700 focus:text-green-700"
                              }
                            >
                              {o.activo ? (
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
      <OwnerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        owner={editingOwner}
      />

      {/* Dialog: Confirmar activar / desactivar */}
      {confirmTarget && (
        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleToggleActive}
          title={
            confirmTarget.activo
              ? "Desactivar propietario"
              : "Activar propietario"
          }
          description={
            confirmTarget.activo
              ? `¿Seguro que deseas desactivar a "${confirmTarget.nombre_completo}"? No recibirá cobros ni notificaciones mientras esté inactivo.`
              : `¿Deseas reactivar a "${confirmTarget.nombre_completo}"?`
          }
          confirmLabel={confirmTarget.activo ? "Desactivar" : "Activar"}
          variant={confirmTarget.activo ? "destructive" : "default"}
        />
      )}
    </div>
  );
}
