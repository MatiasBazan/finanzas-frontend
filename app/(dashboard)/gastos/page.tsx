'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
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

function fmtNum(n: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
}

function fmtARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(fecha: string | Date | null | undefined): string {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const INPUT_CLS =
  'h-9 bg-paper-deep border border-edge rounded-md text-ink placeholder:text-ink-faint text-[13px] px-3 focus-visible:border-teal focus-visible:ring-2 focus-visible:ring-teal/15';

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
      setGastos(await api.get('/gastos'));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGastos();
  }, []);

  function openCreate() {
    setEditingGasto(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDialogOpen(true);
  }

  function openEdit(g: Gasto) {
    setEditingGasto(g);
    const fechaRaw = g.fecha ?? g.createdAt;
    setForm({
      monto: String(g.monto),
      categoria: g.categoria,
      descripcion: g.descripcion ?? '',
      fecha: fechaRaw ? fechaRaw.toString().slice(0, 10) : '',
    });
    setFormError('');
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.categoria) return setFormError('Elegí una categoría.');
    if (!form.fecha) return setFormError('Elegí una fecha.');
    setSaving(true);
    try {
      const body = {
        monto: Number(form.monto),
        categoria: form.categoria,
        fecha: form.fecha,
        ...(form.descripcion ? { descripcion: form.descripcion } : {}),
      };
      if (editingGasto) await api.patch(`/gastos/${editingGasto.id}`, body);
      else await api.post('/gastos', body);
      setDialogOpen(false);
      setLoading(true);
      await fetchGastos();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/gastos/${id}`);
      setGastos((prev) => prev.filter((g) => g.id !== id));
    } catch {
      /* ignore */
    } finally {
      setDeleteId(null);
    }
  }

  const filtered =
    filterCategoria === 'all'
      ? gastos
      : gastos.filter((g) => g.categoria === filterCategoria);

  const total = filtered.reduce((sum, g) => sum + Number(g.monto), 0);

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-rule">
        <div>
          <p className="eyebrow">Movimientos</p>
          <p className="mt-1 text-[13px] text-ink-mute">
            {loading
              ? 'Cargando…'
              : `${gastos.length} ${gastos.length === 1 ? 'registro' : 'registros'} · subtotal ${fmtARS(total)}`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="h-9 px-3.5 text-[13px] font-medium bg-teal text-paper hover:bg-ink rounded-md transition-colors"
        >
          + Nuevo gasto
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3 mt-5">
        <span className="eyebrow">Categoría</span>
        <Select value={filterCategoria} onValueChange={(v) => setFilterCategoria(v ?? 'all')}>
          <SelectTrigger className="h-8 w-44 bg-paper-lifted border border-edge rounded-md text-[13px] text-ink">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-paper-lifted border border-rule rounded-md lift">
            <SelectItem value="all">Todas</SelectItem>
            {CATEGORIAS.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="mt-5 border border-rule rounded-lg bg-paper-lifted overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-paper-deep border-b border-rule">
              <th className="eyebrow text-left py-2.5 px-5 font-medium">Fecha</th>
              <th className="eyebrow text-left py-2.5 px-3 font-medium">Categoría</th>
              <th className="eyebrow text-left py-2.5 px-3 font-medium">Descripción</th>
              <th className="eyebrow text-right py-2.5 px-3 font-medium">Monto</th>
              <th className="py-2.5 px-5 w-32" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-rule-soft">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="py-3 px-3">
                      <div className="h-3 bg-paper-deep animate-pulse rounded-sm" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-14 text-center">
                  <span className="text-[13px] text-ink-faint">No hay gastos para mostrar</span>
                </td>
              </tr>
            ) : (
              filtered.map((g) => (
                <tr
                  key={g.id}
                  className="border-b border-rule-soft last:border-b-0 hover:bg-paper-deep/40 group transition-colors"
                >
                  <td className="py-3 px-5 font-mono text-ink-mute">
                    {fmtDate(g.fecha ?? g.createdAt)}
                  </td>
                  <td className="py-3 px-3">
                    <span className="eyebrow">{g.categoria}</span>
                  </td>
                  <td className="py-3 px-3 text-ink-soft truncate max-w-[320px]">
                    {g.descripcion ?? <span className="text-ink-faint">Sin descripción</span>}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-ink">
                    <span className="peso">$</span>
                    {fmtNum(Number(g.monto))}
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex gap-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="text-[12px] text-ink-mute hover:text-teal transition-colors"
                        onClick={() => openEdit(g)}
                      >
                        Editar
                      </button>
                      {deleteId === g.id ? (
                        <>
                          <button
                            className="text-[12px] text-neg font-medium"
                            onClick={() => handleDelete(g.id)}
                          >
                            Confirmar
                          </button>
                          <button
                            className="text-[12px] text-ink-mute hover:text-ink"
                            onClick={() => setDeleteId(null)}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          className="text-[12px] text-ink-mute hover:text-neg transition-colors"
                          onClick={() => setDeleteId(g.id)}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-paper-lifted border border-rule rounded-lg lift text-ink sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="serif text-[18px] font-medium text-ink tracking-tight">
              {editingGasto ? 'Editar gasto' : 'Nuevo gasto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <Field label="Monto">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                required
                className={`${INPUT_CLS} font-mono`}
              />
            </Field>

            <Field label="Categoría">
              <Select
                value={form.categoria}
                onValueChange={(v) => setForm({ ...form, categoria: v ?? '' })}
              >
                <SelectTrigger className="h-9 bg-paper-deep border border-edge rounded-md text-[13px] text-ink">
                  <SelectValue placeholder="Elegí una categoría" />
                </SelectTrigger>
                <SelectContent className="bg-paper-lifted border border-rule rounded-md lift">
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Fecha">
              <Input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                required
                className={`${INPUT_CLS} font-mono`}
              />
            </Field>

            <Field label="Descripción" hint="opcional">
              <Input
                type="text"
                placeholder="Ej: Compra del mes"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className={INPUT_CLS}
              />
            </Field>

            {formError && (
              <div className="px-3 py-2.5 bg-neg-bg border-l-2 border-neg rounded-r-sm">
                <span className="text-[12.5px] text-neg">{formError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-rule">
              <button
                type="button"
                className="h-9 px-3.5 text-[13px] text-ink-mute hover:text-ink transition-colors"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-9 px-4 text-[13px] font-medium bg-teal text-paper hover:bg-ink rounded-md disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando…' : editingGasto ? 'Actualizar' : 'Guardar gasto'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline gap-2 mb-1.5">
        <span className="text-[12px] text-ink-soft font-medium">{label}</span>
        {hint && <span className="text-[11px] text-ink-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
