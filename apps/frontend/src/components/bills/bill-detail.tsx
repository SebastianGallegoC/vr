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
import { STATUS_CONFIG } from "@/components/bills/bill-table-row";
import { formatCurrency } from "@/lib/utils";

interface BillDetailProps {
  open: boolean;
  onClose: () => void;
  bill: Bill | null;
}

export function BillDetail({ open, onClose, bill }: BillDetailProps) {
  if (!bill) return null;

  const status = STATUS_CONFIG[bill.estado] ?? STATUS_CONFIG.draft;

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
              <p className="text-muted-foreground">Casa</p>
              <p className="font-medium">
                {bill.numero_casa
                  ? `Casa ${bill.numero_casa}`
                  : bill.propiedad_id}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Propietario</p>
              <p className="font-medium">
                {bill.nombre_propietario ?? bill.propietario_id}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Periodo</p>
              <p className="font-medium">
                {bill.periodo_descripcion ?? bill.periodo_facturacion_id}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-semibold text-lg">
                {formatCurrency(bill.monto_total)}
              </p>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-3 gap-4 text-sm border-t pt-4">
            <div>
              <p className="text-muted-foreground">Creado</p>
              <p>{new Date(bill.creado_en).toLocaleDateString("es-CO")}</p>
            </div>
            {bill.enviado_en && (
              <div>
                <p className="text-muted-foreground">Enviado</p>
                <p>{new Date(bill.enviado_en).toLocaleDateString("es-CO")}</p>
              </div>
            )}
            {bill.pagado_en && (
              <div>
                <p className="text-muted-foreground">Pagado</p>
                <p>{new Date(bill.pagado_en).toLocaleDateString("es-CO")}</p>
              </div>
            )}
          </div>

          {/* Notas */}
          {bill.notas && (
            <div className="text-sm border-t pt-4">
              <p className="text-muted-foreground mb-1">Notas</p>
              <p className="text-foreground">{bill.notas}</p>
            </div>
          )}

          {/* Items */}
          {bill.items.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-2">Conceptos</p>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
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
                      <TableCell className="text-muted-foreground">
                        {item.descripcion ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.monto)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted font-semibold">
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
