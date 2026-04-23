'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, TrendingDown } from 'lucide-react';

interface Deuda {
  id: number;
  descripcion: string;
  montoTotal: number;
  cantidadCuotas: number;
  cuotasPagadas: number;
  fechaVencimiento?: string;
  estado: string;
}

interface Proyeccion {
  mes: string;
  total: number;
}

interface DeudaForm {
  descripcion: string;
  montoTotal: string;
  cantidadCuotas: string;
  fechaVencimiento: string;
}

const EMPTY_FORM: DeudaForm = {
  descripcion: '',
  montoTotal: '',
  cantidadCuotas: '',
  fechaVencimiento: '',
};

function formatMoney(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatearFecha(fecha: string | Date | null | undefined): string {
  if (!fecha) return 'Sin fecha';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return 'Sin fecha';
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatMes(mes: string) {
  const [year, month] = mes.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function estadoBadgeClass(estado: string) {
  if (estado === 'pendiente') return 'bg-amber-500/15 text-amber-400 border-amber-500/25';
  if (estado === 'pagada') return 'bg-green-500/15 text-green-400 border-green-500/25';
  return 'bg-zinc-700/50 text-zinc-400 border-zinc-600/50';
}

const INPUT_CLS = 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 h-9';

export default function DeudasPage() {
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [proyeccion, setProyeccion] = useState<Proyeccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeuda, setEditingDeuda] = useState<Deuda | null>(null);
  const [form, setForm] = useState<DeudaForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function fetchAll() {
    try {
      const [d, p] = await Promise.all([api.get('/deudas'), api.get('/deudas/proyeccion')]);
      setDeudas(d);
      setProyeccion(p);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  function openCreate() {
    setEditingDeuda(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDialogOpen(true);
  }

  function openEdit(d: Deuda) {
    setEditingDeuda(d);
    setForm({
      descripcion: d.descripcion,
      montoTotal: String(d.montoTotal),
      cantidadCuotas: String(d.cantidadCuotas),
      fechaVencimiento: d.fechaVencimiento?.substring(0, 10) ?? '',
    });
    setFormError('');
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const body = {
        descripcion: form.descripcion,
        montoTotal: Number(form.montoTotal),
        cantidadCuotas: Number(form.cantidadCuotas),
        ...(form.fechaVencimiento ? { fechaVencimiento: form.fechaVencimiento } : {}),
      };
      if (editingDeuda) {
        await api.patch(`/deudas/${editingDeuda.id}`, body);
      } else {
        await api.post('/deudas', body);
      }
      setDialogOpen(false);
      setLoading(true);
      await fetchAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/deudas/${id}`);
      setDeudas((prev) => prev.filter((d) => d.id !== id));
    } catch { /* ignore */ } finally {
      setDeleteId(null);
    }
  }

  const avgProyeccion =
    proyeccion.length > 0
      ? proyeccion.reduce((s, p) => s + p.total, 0) / proyeccion.length
      : 0;

  const TH = 'text-xs uppercase tracking-widest text-zinc-500 font-medium py-3';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Deudas</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {loading ? '...' : `${deudas.length} deuda${deudas.length !== 1 ? 's' : ''} registrada${deudas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 gap-1.5"
        >
          <Plus className="h-4 w-4" /> Nueva deuda
        </Button>
      </div>

      {/* Deudas table */}
      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-800/80 hover:bg-zinc-800/80 border-b border-zinc-700">
              <TableHead className={TH}>Descripción</TableHead>
              <TableHead className={`${TH} text-right`}>Total</TableHead>
              <TableHead className={TH}>Cuotas</TableHead>
              <TableHead className={`${TH} text-right`}>Por cuota</TableHead>
              <TableHead className={TH}>Estado</TableHead>
              <TableHead className={TH}>Vencimiento</TableHead>
              <TableHead className="w-32 py-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-b border-zinc-800/60">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j} className="py-3">
                      <Skeleton className="h-4 w-full bg-zinc-800" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : deudas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-zinc-600 text-sm">
                  Sin deudas registradas
                </TableCell>
              </TableRow>
            ) : (
              deudas.map((d, idx) => {
                const cuotasPagadas = d.cuotasPagadas ?? 0;
                const progreso = Math.round((cuotasPagadas / d.cantidadCuotas) * 100);
                const montoCuota = d.montoTotal / d.cantidadCuotas;

                return (
                  <TableRow
                    key={d.id}
                    className={`border-b border-zinc-800/60 transition-colors hover:bg-zinc-800/50
                      ${idx % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'}`}
                  >
                    <TableCell className="py-3">
                      <div className="space-y-1.5">
                        <span className="font-medium text-zinc-200 text-sm">{d.descripcion}</span>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={progreso}
                            className="h-1.5 w-28 bg-zinc-700"
                          />
                          <span className="text-xs text-zinc-600">{progreso}%</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-[family-name:var(--font-mono)] text-sm font-semibold text-zinc-200 py-3">
                      {formatMoney(Number(d.montoTotal))}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400 py-3">
                      {cuotasPagadas}/{d.cantidadCuotas}
                    </TableCell>
                    <TableCell className="text-right font-[family-name:var(--font-mono)] text-sm text-zinc-400 py-3">
                      {formatMoney(montoCuota)}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium border ${estadoBadgeClass(d.estado)}`}
                      >
                        {d.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500 py-3">
                      {d.fechaVencimiento
                        ? formatearFecha(d.fechaVencimiento)
                        : <span className="text-zinc-700">—</span>}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex gap-1 justify-end">
                        <button
                          className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
                          onClick={() => openEdit(d)}
                        >
                          Editar
                        </button>
                        {deleteId === d.id ? (
                          <>
                            <button
                              className="rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                              onClick={() => handleDelete(d.id)}
                            >
                              Confirmar
                            </button>
                            <button
                              className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-700 transition-colors"
                              onClick={() => setDeleteId(null)}
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <button
                            className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                            onClick={() => setDeleteId(d.id)}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Proyección 12 meses */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-400" />
          <h2 className="text-sm font-semibold text-zinc-300">Proyección próximos 12 meses</h2>
          {!loading && avgProyeccion > 0 && (
            <span className="text-xs text-zinc-600">
              · promedio {formatMoney(avgProyeccion)}
            </span>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-48 rounded-2xl bg-zinc-800" />
        ) : (
          <div className="rounded-2xl border border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-800/80 hover:bg-zinc-800/80 border-b border-zinc-700">
                  <TableHead className={TH}>Mes</TableHead>
                  <TableHead className={`${TH} text-right`}>Total a pagar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proyeccion.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-zinc-600 text-sm">
                      Sin proyección disponible
                    </TableCell>
                  </TableRow>
                ) : (
                  proyeccion.map((p, idx) => {
                    const isHigh = p.total > avgProyeccion;
                    return (
                      <TableRow
                        key={p.mes}
                        className={`border-b border-zinc-800/60 transition-colors
                          ${isHigh ? 'bg-red-500/5 hover:bg-red-500/8' : idx % 2 === 0 ? 'bg-zinc-900 hover:bg-zinc-800/50' : 'bg-zinc-950 hover:bg-zinc-800/50'}`}
                      >
                        <TableCell className="text-sm text-zinc-300 capitalize py-3">
                          {formatMes(p.mes)}
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <span className={`font-[family-name:var(--font-mono)] text-sm font-semibold ${isHigh ? 'text-red-400' : 'text-zinc-200'}`}>
                            {formatMoney(p.total)}
                          </span>
                          {isHigh && (
                            <span className="ml-2 text-xs font-medium text-red-500 bg-red-500/10 rounded px-1.5 py-0.5">
                              ↑ alto
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border border-zinc-700 ring-0 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 text-base font-semibold">
              {editingDeuda ? 'Editar deuda' : 'Nueva deuda'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide text-zinc-500 font-medium" htmlFor="descripcion">
                Descripción
              </label>
              <Input
                id="descripcion"
                type="text"
                placeholder="Ej: Préstamo banco"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                required
                className={INPUT_CLS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wide text-zinc-500 font-medium" htmlFor="montoTotal">
                  Monto total
                </label>
                <Input
                  id="montoTotal"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.montoTotal}
                  onChange={(e) => setForm({ ...form, montoTotal: e.target.value })}
                  required
                  className={INPUT_CLS}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wide text-zinc-500 font-medium" htmlFor="cantidadCuotas">
                  Cant. cuotas
                </label>
                <Input
                  id="cantidadCuotas"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="12"
                  value={form.cantidadCuotas}
                  onChange={(e) => setForm({ ...form, cantidadCuotas: e.target.value })}
                  required
                  className={INPUT_CLS}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide text-zinc-500 font-medium" htmlFor="fechaVencimiento">
                Fecha de vencimiento{' '}
                <span className="normal-case text-zinc-600">(opcional)</span>
              </label>
              <Input
                id="fechaVencimiento"
                type="date"
                value={form.fechaVencimiento}
                onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })}
                className={INPUT_CLS}
              />
            </div>

            {formError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-colors disabled:opacity-60"
              >
                {saving ? 'Guardando...' : editingDeuda ? 'Actualizar' : 'Crear deuda'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
