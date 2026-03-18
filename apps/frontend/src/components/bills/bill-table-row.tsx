/**
 * VegasDelRio - Constantes de estado de facturas.
 *
 * Configuración centralizada de etiquetas y estilos para los estados de factura.
 * Usada por bills/page.tsx y bill-detail.tsx.
 */

// ----------------------------------------------------------------
// Configuración de estados: etiqueta y estilos del Badge
// ----------------------------------------------------------------
export const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  draft: { label: "Borrador", className: "bg-gray-100 text-gray-700" },
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-800" },
  paid: {
    label: "Pagada",
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  },
  overdue: { label: "Vencida", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelada", className: "bg-slate-100 text-slate-600" },
};

export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "draft", label: "Borrador" },
  { value: "pending", label: "Pendiente" },
  { value: "paid", label: "Pagada" },
  { value: "overdue", label: "Vencida" },
  { value: "cancelled", label: "Cancelada" },
];
