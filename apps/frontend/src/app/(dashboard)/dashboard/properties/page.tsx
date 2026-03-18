"use client";

/**
 * VegasDelRio - Página de Gestión de Casas.
 *
 * CRUD completo: listar, crear, editar y activar/desactivar propiedades.
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
  Building2,
  Plus,
  Search,
  Pencil,
  PowerOff,
  Power,
  UserPlus,
  UserX,
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
import { PropertyForm } from "@/components/properties/property-form";
import { AssignOwnerDialog } from "@/components/properties/assign-owner-dialog";
import { OwnerInfoDialog } from "@/components/properties/owner-info-dialog";
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
import { propertiesService } from "@/lib/services/properties";
import { useAuth } from "@/components/providers/auth-provider";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate } from "@/lib/utils";
import type { Property, PropertyCreate, PropertyUpdate } from "@/types";

const DEFAULT_PAGE_SIZE = 20;

export default function PropertiesPage() {
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
    queryKey: ["properties", page, pageSize, search],
    queryFn: () =>
      propertiesService.list({
        page,
        page_size: pageSize,
        search: search || undefined,
      }),
    placeholderData: (prev) => prev,
    enabled: !!user,
  });

  const properties = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

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

  function clearSearch() {
    setSearchInput("");
    setPage(1);
  }

  // ---- Column definitions ----
  const columns = useMemo<ColumnDef<Property, unknown>[]>(
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
        accessorKey: "numero_casa",
        header: ({ column }) => (
          <SortableHeader column={column}>N° Casa</SortableHeader>
        ),
        size: 120,
        cell: ({ row }) => (
          <span className="font-bold text-lg text-primary">
            {row.original.numero_casa}
          </span>
        ),
      },
      {
        id: "propietario",
        header: "Propietario",
        cell: ({ row }) => {
          const p = row.original;
          return p.propietario_actual ? (
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
          );
        },
      },
      {
        id: "descripcion",
        header: "Descripción",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <p className="text-sm text-foreground font-medium">
              {p.notas ? (
                <span>{p.notas}</span>
              ) : (
                <span className="text-muted-foreground italic">Sin notas</span>
              )}
            </p>
          );
        },
      },
      {
        accessorKey: "activo",
        header: "Estado",
        size: 100,
        cell: ({ row }) => {
          const p = row.original;
          return (
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
          const p = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
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
                {p.propietario_actual && (
                  <DropdownMenuItem
                    onClick={async () => {
                      await propertiesService.removeOwner(p.id);
                      queryClient.invalidateQueries({
                        queryKey: ["properties"],
                      });
                      toast.success(
                        `Propietario desvinculado de casa "${p.numero_casa}".`,
                      );
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Desvincular propietario
                  </DropdownMenuItem>
                )}
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
                <BreadcrumbPage>Casas</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h2 className="text-2xl font-bold text-foreground">Casas</h2>
          <p className="text-muted-foreground">
            Administra las casas del conjunto residencial.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva casa
        </Button>
      </div>

      {/* Tarjeta principal */}
      <Card className="shadow-md">
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
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar por número..."
                  className="pl-8 w-52"
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
              Error al cargar las casas. Verifica la conexión con el servidor.
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={properties}
                sorting={sorting}
                onSortingChange={setSorting}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                isLoading={isLoading}
                getRowId={(row) => row.id}
                emptyState={
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      {search
                        ? `No se encontraron casas con "${search}".`
                        : "No hay casas registradas todavía."}
                    </p>
                    {!search && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={openCreate}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar primera casa
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
