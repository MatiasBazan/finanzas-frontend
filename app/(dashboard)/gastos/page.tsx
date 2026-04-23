'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus } from 'lucide-react';

const CATEGORIAS = [
  'supermercado',
  'verduleria',
  'ropa',
  'tecnologia',
  'viajes',
  'salud',
  'transporte',
  'entretenimiento',
] as const;

const BADGE_COLORS: Record<string, string> = {
  supermercado:   'bg-green-500/15 text-green-400 border-green-500/25',
  verduleria:     'bg-lime-500/15 text-lime-400 border-lime-500/25',
  ropa:           'bg-pink-500/15 text-pink-400 border-pink-500/25',
  tecnologia:     'bg-blue-500/15 text-blue-400 border-blue-500/25',
  viajes:         'bg-amber-500/15 text-amber-400 border-amber-500/25',
  salud:          'bg-red-500/15 text-red-400 border-red-500/25',
  transporte:     'bg-purple-500/15 text-purple-400 border-purple-500/25',
  entretenimiento:'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
};

interface Gasto {
  id: number;
  monto: number;
  categoria: string;
  descripcion?: string;
  fecha?: string;
  createdAt?: string;
}

interface GastoForm {
  monto: string;
  categoria: string;
  descripcion: string;
  fecha: string;
}

const EMPTY_FORM: GastoForm = { monto: '', categoria: '', descripcion: '', fecha: '' };

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

const INPUT_CLS = 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 h-9';

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [form, setForm] = useState<GastoForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function fetchGastos() {
    try {
      const data = await api.get('/gastos');
      if (data.length > 0) console.log('[Gasto] estructura del primer elemento:', data[0]);
      setGastos(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchGastos(); }, []);

  function openCreate() {
    setEditingGasto(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDialogOpen(true);
  }

  function openEdit(g: Gasto) {
    setEditingGasto(g);
    const fechaRaw = g.fecha ?? g.createdAt;
    setForm({ monto: String(g.monto), categoria: g.categoria, descripcion: g.descripcion ?? '', fecha: fechaRaw ? fechaRaw.toString().slice(0, 10) : '' });
    setFormError('');
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.categoria) { setFormError('Seleccioná una categoría.'); return; }
    if (!form.fecha) { setFormError('Seleccioná una fecha.'); return; }
    setSaving(true);
    try {
      const body = {
        monto: Number(form.monto),
        categoria: form.categoria,
        fecha: form.fecha,
        ...(form.descripcion ? { descripcion: form.descripcion } : {}),
      };
      if (editingGasto) {
        await api.patch(`/gastos/${editingGasto.id}`, body);
      } else {
        await api.post('/gastos', body);
      }
      setDialogOpen(false);
      setLoading(true);
      await fetchGastos();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/gastos/${id}`);
      setGastos((prev) => prev.filter((g) => g.id !== id));
    } catch { /* ignore */ } finally {
      setDeleteId(null);
    }
  }

  const filtered = filterCategoria === 'all'
    ? gastos
    : gastos.filter((g) => g.categoria === filterCategoria);

  const total = filtered.reduce((sum, g) => sum + Number(g.monto), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Gastos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {loading ? '...' : `${gastos.length} registros`}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 gap-1.5"
        >
          <Plus className="h-4 w-4" /> Nuevo gasto
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Categoría:</span>
        <Select value={filterCategoria} onValueChange={(v) => setFilterCategoria(v ?? 'all')}>
          <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700 text-zinc-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all">Todas</SelectItem>
            {CATEGORIAS.map((c) => (
              <SelectItem key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-800/80 hover:bg-zinc-800/80 border-b border-zinc-700">
              <TableHead className="text-xs uppercase tracking-widest text-zinc-500 font-medium py-3">Fecha</TableHead>
              <TableHead className="text-xs uppercase tracking-widest text-zinc-500 font-medium py-3">Categoría</TableHead>
              <TableHead className="text-xs uppercase tracking-widest text-zinc-500 font-medium py-3">Descripción</TableHead>
              <TableHead className="text-xs uppercase tracking-widest text-zinc-500 font-medium py-3 text-right">Monto</TableHead>
              <TableHead className="w-28 py-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-b border-zinc-800/60">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j} className="py-3">
                      <Skeleton className="h-4 w-full bg-zinc-800" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-zinc-600 text-sm">
                  Sin gastos registrados
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((g, idx) => (
                <TableRow
                  key={g.id}
                  className={`border-b border-zinc-800/60 transition-colors hover:bg-zinc-800/50
                    ${idx % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'}`}
                >
                  <TableCell className="text-zinc-500 text-sm py-3">
                    {formatearFecha(g.fecha ?? g.createdAt)}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium tracking-wide border ${BADGE_COLORS[g.categoria] ?? 'text-zinc-400'}`}
                    >
                      {g.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm py-3 max-w-48 truncate">
                    {g.descripcion ?? <span className="text-zinc-700">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-[family-name:var(--font-mono)] text-sm font-semibold text-zinc-200 py-3">
                    {formatMoney(Number(g.monto))}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex gap-1 justify-end">
                      <button
                        className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
                        onClick={() => openEdit(g)}
                      >
                        Editar
                      </button>
                      {deleteId === g.id ? (
                        <>
                          <button
                            className="rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                            onClick={() => handleDelete(g.id)}
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
                          onClick={() => setDeleteId(g.id)}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Total */}
      {!loading && filtered.length > 0 && (
        <div className="flex justify-end">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm">
            <span className="text-zinc-500">Total: </span>
            <span className="font-[family-name:var(--font-mono)] font-bold text-zinc-100 ml-1">{formatMoney(total)}</span>
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border border-zinc-700 ring-0 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 text-base font-semibold">
              {editingGasto ? 'Editar gasto' : 'Nuevo gasto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-medium" htmlFor="monto">
                Monto
              </label>
              <Input
                id="monto"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                required
                className={INPUT_CLS}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
                Categoría
              </label>
              <Select
                value={form.categoria}
                onValueChange={(v) => setForm({ ...form, categoria: v ?? '' })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300 h-9">
                  <SelectValue placeholder="Seleccioná una categoría" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c} className="text-zinc-300 focus:bg-zinc-700">
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-medium" htmlFor="fecha">
                Fecha
              </label>
              <Input
                id="fecha"
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                required
                className={INPUT_CLS}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-medium" htmlFor="descripcion">
                Descripción <span className="normal-case text-zinc-600">(opcional)</span>
              </label>
              <Input
                id="descripcion"
                type="text"
                placeholder="Ej: Compras del mes"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
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
                {saving ? 'Guardando...' : editingGasto ? 'Actualizar' : 'Crear gasto'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
