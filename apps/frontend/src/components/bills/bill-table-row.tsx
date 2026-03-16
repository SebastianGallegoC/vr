"use client";

import {
  CheckCircle2,
  Clock,
  Eye,
  MoreVertical,
  Send,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Bill, BillStatus } from "@/types";

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

// ----------------------------------------------------------------
// BillTableRow
// ----------------------------------------------------------------
interface BillTableRowProps {
  bill: Bill;
  onViewDetail: (bill: Bill) => void;
  onChangeStatus: (bill: Bill, status: BillStatus, label: string) => void;
}

export function BillTableRow({
  bill,
  onViewDetail,
  onChangeStatus,
}: BillTableRowProps) {
  const statusCfg = STATUS_CONFIG[bill.estado] ?? STATUS_CONFIG.draft;

  return (
    <TableRow className="hover:bg-blue-50/50 transition-colors">
      <TableCell className="py-4">
        <p className="font-mono font-semibold text-sm">{bill.numero_factura}</p>
      </TableCell>

      <TableCell className="py-4">
        {bill.numero_casa
          ? `Casa ${bill.numero_casa}`
          : bill.propiedad_id.slice(0, 8)}
      </TableCell>

      <TableCell className="py-4">
        <p className="text-sm text-gray-700">
          {bill.nombre_propietario ?? bill.propietario_id.slice(0, 8)}
        </p>
      </TableCell>

      <TableCell className="py-4 text-sm text-gray-700">
        {bill.periodo_descripcion ?? bill.periodo_facturacion_id.slice(0, 8)}
      </TableCell>

      <TableCell className="py-4 text-right font-medium">
        {formatCurrency(bill.monto_total)}
      </TableCell>

      <TableCell className="py-4 text-center">
        <Badge variant="secondary" className={statusCfg.className}>
          {statusCfg.label}
        </Badge>
      </TableCell>

      <TableCell className="py-4 text-right text-xs text-gray-500">
        {formatDate(bill.creado_en)}
      </TableCell>

      <TableCell className="py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <span className="sr-only">Acciones</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetail(bill)}>
              <Eye className="mr-2 h-4 w-4" />
              Ver detalle
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {bill.estado !== "paid" && bill.estado !== "cancelled" && (
              <DropdownMenuItem
                onClick={() =>
                  onChangeStatus(bill, "paid", "Marcar como pagada")
                }
                className="text-emerald-700 focus:text-emerald-700"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Marcar como pagada
              </DropdownMenuItem>
            )}

            {bill.estado === "draft" && (
              <DropdownMenuItem
                onClick={() =>
                  onChangeStatus(bill, "pending", "Marcar como pendiente")
                }
              >
                <Send className="mr-2 h-4 w-4" />
                Marcar como pendiente
              </DropdownMenuItem>
            )}

            {bill.estado === "pending" && (
              <DropdownMenuItem
                onClick={() =>
                  onChangeStatus(bill, "overdue", "Marcar como vencida")
                }
                className="text-red-600 focus:text-red-600"
              >
                <Clock className="mr-2 h-4 w-4" />
                Marcar como vencida
              </DropdownMenuItem>
            )}

            {bill.estado !== "cancelled" && bill.estado !== "paid" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    onChangeStatus(bill, "cancelled", "Cancelar factura")
                  }
                  className="text-red-600 focus:text-red-600"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar factura
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
