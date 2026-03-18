"use client";

/**
 * VegasDelRio - Página de Gestión de Propietarios.
 *
 * CRUD completo: listar, crear, editar y activar/desactivar propietarios.
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  ColumnDef,
  SortingState,
  RowSelectionState,
} from "@tanstack/react-table";
import {
  Users,
  Plus,
  Search,
  Pencil,
  PowerOff,
  Power,
  Mail,
  Phone,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OwnerForm } from "@/components/owners/owner-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DataTable } from "@/components/ui/data-table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { TablePagination } from "@/components/ui/table-pagination";
import { ownersService } from "@/lib/services/owners";
import { useAuth } from "@/components/providers/auth-provider";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate } from "@/lib/utils";
import type { Owner, OwnerCreate, OwnerUpdate } from "@/types";

const DEFAULT_PAGE_SIZE = 20;

export default function OwnersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ---- Estado UI ----
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Owner | null>(null);

  // ---- Query: listar propietarios ----
  const { data, isLoading, isError } = useQuery({
    queryKey: ["owners", page, pageSize, search],
    queryFn: () =>
      ownersService.list({
        page,
        page_size: pageSize,
        search: search || undefined,
      }),
    placeholderData: (prev) => prev,
    enabled: !!user,
  });

  const owners = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

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

  function clearSearch() {
    setSearchInput("");
    setPage(1);
  }

  // ---- Column definitions ----
  const columns = useMemo<ColumnDef<Owner, unknown>[]>(
    () => [
      {
        id: "select",
        size: 40,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Seleccionar todos"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar fila"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "nombre_completo",
        header: ({ column }) => (
          <SortableHeader column={column}>Nombre</SortableHeader>
        ),
        cell: ({ row }) => {
          const o = row.original;
          return (
            <div>
              <p className="font-semibold text-foreground">
                {o.nombre_completo}
              </p>
              {o.notas && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {o.notas}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "documento",
        header: "Documento",
        cell: ({ row }) => {
          const o = row.original;
          return (
            <>
              <span className="text-xs text-muted-foreground">
                {o.tipo_documento}
              </span>{" "}
              <span className="font-medium">{o.numero_documento}</span>
            </>
          );
        },
      },
      {
        id: "casa",
        header: "Casa",
        cell: ({ row }) => {
          const o = row.original;
          return o.casa_actual ? (
            <Badge
              variant="outline"
              className="font-medium text-primary border-primary/20 bg-primary/10"
            >
              Casa {o.casa_actual.numero_casa}
            </Badge>
          ) : (
            <span className="text-xs text-amber-600 italic">
              Sin casa asignada
            </span>
          );
        },
      },
      {
        id: "contacto",
        header: "Contacto",
        cell: ({ row }) => {
          const o = row.original;
          return (
            <div className="space-y-0.5">
              {o.correos.map((correo, idx) => (
                <p
                  key={idx}
                  className="flex items-center gap-1 text-sm text-foreground"
                >
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {correo}
                </p>
              ))}
              {o.telefonos.map((tel, idx) => (
                <p
                  key={idx}
                  className="flex items-center gap-1 text-sm text-muted-foreground"
                >
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {tel}
                </p>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "activo",
        header: "Estado",
        size: 100,
        cell: ({ row }) => {
          const o = row.original;
          return (
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
          );
        },
      },
      {
        accessorKey: "creado_en",
        header: ({ column }) => (
          <SortableHeader column={column}>Creado</SortableHeader>
        ),
        size: 120,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.creado_en)}
          </span>
        ),
      },
      {
        id: "acciones",
        size: 50,
        cell: ({ row }) => {
          const o = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
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
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">
                  Panel Principal
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Propietarios</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h2 className="text-2xl font-bold text-foreground">Propietarios</h2>
          <p className="text-muted-foreground">
            Administra los propietarios del conjunto residencial.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo propietario
        </Button>
      </div>

      {/* Tarjeta principal */}
      <Card className="shadow-md">
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
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar nombre o documento..."
                  className="pl-8 w-60"
                />
              </div>
              {searchInput && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isError ? (
            <div className="py-16 text-center text-destructive">
              Error al cargar los propietarios. Verifica la conexión con el
              servidor.
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={owners}
                sorting={sorting}
                onSortingChange={setSorting}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                isLoading={isLoading}
                getRowId={(row) => row.id}
                emptyState={
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      {search
                        ? `No se encontraron propietarios con "${search}".`
                        : "No hay propietarios registrados todavía."}
                    </p>
                    {!search && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={openCreate}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar primer propietario
                      </Button>
                    )}
                  </div>
                }
              />
              {totalPages > 0 && (
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  selectedCount={Object.keys(rowSelection).length}
                />
              )}
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
