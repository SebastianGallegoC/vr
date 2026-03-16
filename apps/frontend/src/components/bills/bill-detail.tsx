"use client";

/**
 * VegasDelRio - Dialog de Detalle de Factura.
 *
 * Muestra la info completa de una factura, incluyendo los ítems.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Bill } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface BillDetailProps {
  open: boolean;
  onClose: () => void;
  bill: Bill | null;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Borrador",
    className: "bg-gray-100 text-gray-700",
  },
  pending: {
    label: "Pendiente",
    className: "bg-amber-100 text-amber-800",
  },
  paid: {
    label: "Pagada",
    className: "bg-emerald-100 text-emerald-800",
  },
  overdue: {
    label: "Vencida",
    className: "bg-red-100 text-red-700",
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-slate-100 text-slate-600",
  },
};

export function BillDetail({ open, onClose, bill }: BillDetailProps) {
  if (!bill) return null;

  const status = STATUS_LABELS[bill.estado] ?? STATUS_LABELS.draft;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Factura {bill.numero_factura}
            <Badge variant="secondary" className={status.className}>
              {status.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Info general */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Casa</p>
              <p className="font-medium">
                {bill.numero_casa
                  ? `Casa ${bill.numero_casa}`
                  : bill.propiedad_id}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Propietario</p>
              <p className="font-medium">
                {bill.nombre_propietario ?? bill.propietario_id}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Periodo</p>
              <p className="font-medium">
                {bill.periodo_descripcion ?? bill.periodo_facturacion_id}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Total</p>
              <p className="font-semibold text-lg">
                {formatCurrency(bill.monto_total)}
              </p>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-3 gap-4 text-sm border-t pt-4">
            <div>
              <p className="text-gray-500">Creado</p>
              <p>{new Date(bill.creado_en).toLocaleDateString("es-CO")}</p>
            </div>
            {bill.enviado_en && (
              <div>
                <p className="text-gray-500">Enviado</p>
                <p>{new Date(bill.enviado_en).toLocaleDateString("es-CO")}</p>
              </div>
            )}
            {bill.pagado_en && (
              <div>
                <p className="text-gray-500">Pagado</p>
                <p>{new Date(bill.pagado_en).toLocaleDateString("es-CO")}</p>
              </div>
            )}
          </div>

          {/* Notas */}
          {bill.notas && (
            <div className="text-sm border-t pt-4">
              <p className="text-gray-500 mb-1">Notas</p>
              <p className="text-gray-700">{bill.notas}</p>
            </div>
          )}

          {/* Items */}
          {bill.items.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-2">Conceptos</p>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Concepto</TableHead>
                    <TableHead className="font-semibold">Descripción</TableHead>
                    <TableHead className="font-semibold text-right">
                      Monto
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bill.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.concepto}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {item.descripcion ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.monto)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell colSpan={2} className="text-right">
                      Total
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(bill.monto_total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
