'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
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

type SortKey = 'fecha' | 'categoria' | 'descripcion' | 'monto';
type SortDir = 'asc' | 'desc';

const EMPTY_FORM: GastoForm = { monto: '', categoria: '', descripcion: '', fecha: '' };
const PAGE_SIZE = 25;

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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const INPUT_CLS =
  'h-9 bg-paper-deep border border-edge rounded-md text-ink placeholder:text-ink-faint text-[13px] px-3 focus-visible:border-teal focus-visible:ring-2 focus-visible:ring-teal/15';

export default function GastosPage() {
  const toast = useToast();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('fecha');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [form, setForm] = useState<GastoForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function fetchGastos() {
    try {
      setGastos(await api.get('/gastos'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los gastos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGastos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditingGasto(null);
    setForm({ ...EMPTY_FORM, fecha: todayISO() });
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
      if (editingGasto) {
        await api.patch(`/gastos/${editingGasto.id}`, body);
        toast.success('Gasto actualizado');
      } else {
        await api.post('/gastos', body);
        toast.success('Gasto creado');
      }
      setDialogOpen(false);
      setLoading(true);
      await fetchGastos();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(g: Gasto) {
    const snapshot = gastos;
    setGastos((prev) => prev.filter((x) => x.id !== g.id));
    let undone = false;
    try {
      await api.delete(`/gastos/${g.id}`);
      toast.success('Gasto eliminado', {
        action: {
          label: 'Deshacer',
          onClick: async () => {
            undone = true;
            try {
              const body = {
                monto: Number(g.monto),
                categoria: g.categoria,
                fecha: (g.fecha ?? g.createdAt ?? '').slice(0, 10),
                ...(g.descripcion ? { descripcion: g.descripcion } : {}),
              };
              await api.post('/gastos', body);
              await fetchGastos();
              toast.info('Gasto restaurado');
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'No se pudo deshacer.');
            }
          },
        },
      });
    } catch (err) {
      if (!undone) {
        setGastos(snapshot);
        toast.error(err instanceof Error ? err.message : 'No se pudo eliminar.');
      }
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'fecha' || key === 'monto' ? 'desc' : 'asc'); }
    setPage(1);
  }

  function resetFilters() {
    setFilterCategoria('all');
    setSearch('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromT = from ? new Date(from + 'T00:00:00').getTime() : null;
    const toT = to ? new Date(to + 'T23:59:59').getTime() : null;
    return gastos.filter((g) => {
      if (filterCategoria !== 'all' && g.categoria !== filterCategoria) return false;
      if (q && !(g.descripcion ?? '').toLowerCase().includes(q) && !g.categoria.toLowerCase().includes(q)) return false;
      const f = new Date(g.fecha ?? g.createdAt ?? '').getTime();
      if (fromT && (isNaN(f) || f < fromT)) return false;
      if (toT && (isNaN(f) || f > toT)) return false;
      return true;
    });
  }, [gastos, filterCategoria, search, from, to]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'fecha') {
        const fa = new Date(a.fecha ?? a.createdAt ?? '').getTime() || 0;
        const fb = new Date(b.fecha ?? b.createdAt ?? '').getTime() || 0;
        cmp = fa - fb;
      } else if (sortKey === 'monto') {
        cmp = Number(a.monto) - Number(b.monto);
      } else if (sortKey === 'categoria') {
        cmp = a.categoria.localeCompare(b.categoria);
      } else {
        cmp = (a.descripcion ?? '').localeCompare(b.descripcion ?? '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const total = filtered.reduce((sum, g) => sum + Number(g.monto), 0);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paged = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  const hasActiveFilters = filterCategoria !== 'all' || search !== '' || from !== '' || to !== '';

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-rule">
        <div>
          <p className="eyebrow">Movimientos</p>
          <p className="mt-1 text-[13px] text-ink-mute">
            {loading
              ? 'Cargando…'
              : hasActiveFilters
                ? `${filtered.length} de ${gastos.length} · subtotal filtrado ${fmtARS(total)}`
                : `${gastos.length} ${gastos.length === 1 ? 'registro' : 'registros'} · total ${fmtARS(total)}`}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + Nuevo gasto
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mt-5">
        <label className="block">
          <span className="eyebrow block mb-1.5">Buscar</span>
          <Input
            type="search"
            placeholder="Descripción o categoría"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={`${INPUT_CLS} w-56`}
          />
        </label>
        <label className="block">
          <span className="eyebrow block mb-1.5">Categoría</span>
          <Select value={filterCategoria} onValueChange={(v) => { setFilterCategoria(v ?? 'all'); setPage(1); }}>
            <SelectTrigger className="h-9 w-44 bg-paper-deep border border-edge rounded-md text-[13px] text-ink">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-paper-lifted border border-rule rounded-md lift">
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="block">
          <span className="eyebrow block mb-1.5">Desde</span>
          <Input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className={`${INPUT_CLS} w-40 font-mono`}
          />
        </label>
        <label className="block">
          <span className="eyebrow block mb-1.5">Hasta</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className={`${INPUT_CLS} w-40 font-mono`}
          />
        </label>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="h-9 text-[12.5px] text-ink-mute hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 rounded-md px-2"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Table — desktop */}
      <div className="mt-5 border border-rule rounded-lg bg-paper-lifted overflow-hidden hidden md:block">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-paper-deep border-b border-rule">
              <SortHeader label="Fecha" k="fecha" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="left" />
              <SortHeader label="Categoría" k="categoria" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="left" />
              <SortHeader label="Descripción" k="descripcion" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="left" />
              <SortHeader label="Monto" k="monto" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
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
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-14 text-center">
                  <span className="text-[13px] text-ink-faint">
                    {hasActiveFilters ? 'Sin resultados para los filtros aplicados' : 'No hay gastos para mostrar'}
                  </span>
                </td>
              </tr>
            ) : (
              paged.map((g) => (
                <tr
                  key={g.id}
                  className="border-b border-rule-soft last:border-b-0 hover:bg-paper-deep/40 group transition-colors"
                >
                  <td className="py-3 px-5 font-mono text-ink-mute whitespace-nowrap">
                    {fmtDate(g.fecha ?? g.createdAt)}
                  </td>
                  <td className="py-3 px-3">
                    <span className="eyebrow">{g.categoria}</span>
                  </td>
                  <td className="py-3 px-3 text-ink-soft truncate max-w-[320px]">
                    {g.descripcion ?? <span className="text-ink-faint">Sin descripción</span>}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-ink whitespace-nowrap">
                    <span className="peso">$</span>
                    {fmtNum(Number(g.monto))}
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex gap-3 justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button className="btn-ghost btn-ghost-accent" onClick={() => openEdit(g)}>
                        Editar
                      </button>
                      <button className="btn-ghost btn-ghost-danger" onClick={() => handleDelete(g)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && sorted.length > PAGE_SIZE && (
          <Pagination page={safePage} totalPages={totalPages} total={sorted.length} pageSize={PAGE_SIZE} onChange={setPage} />
        )}
      </div>

      {/* Cards — mobile */}
      <div className="mt-5 md:hidden space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-paper-deep animate-pulse rounded-md" />
          ))
        ) : paged.length === 0 ? (
          <div className="py-14 text-center border border-rule rounded-lg bg-paper-lifted">
            <span className="text-[13px] text-ink-faint">
              {hasActiveFilters ? 'Sin resultados' : 'No hay gastos para mostrar'}
            </span>
          </div>
        ) : (
          paged.map((g) => (
            <article key={g.id} className="border border-rule rounded-lg bg-paper-lifted p-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="eyebrow">{g.categoria}</span>
                <span className="font-mono text-ink text-[15px]">
                  <span className="peso">$</span>{fmtNum(Number(g.monto))}
                </span>
              </div>
              <div className="mt-1 text-[13px] text-ink-soft">
                {g.descripcion ?? <span className="text-ink-faint">Sin descripción</span>}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="font-mono text-[11.5px] text-ink-mute">
                  {fmtDate(g.fecha ?? g.createdAt)}
                </span>
                <div className="flex gap-3">
                  <button className="btn-ghost btn-ghost-accent" onClick={() => openEdit(g)}>Editar</button>
                  <button className="btn-ghost btn-ghost-danger" onClick={() => handleDelete(g)}>Eliminar</button>
                </div>
              </div>
            </article>
          ))
        )}
        {!loading && sorted.length > PAGE_SIZE && (
          <Pagination page={safePage} totalPages={totalPages} total={sorted.length} pageSize={PAGE_SIZE} onChange={setPage} />
        )}
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
                autoFocus
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
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
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
                className="h-9 px-3.5 text-[13px] text-ink-mute hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 rounded-md"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Guardando…' : editingGasto ? 'Actualizar' : 'Guardar gasto'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortHeader({
  label, k, sortKey, sortDir, onSort, align,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  align: 'left' | 'right';
}) {
  const active = sortKey === k;
  const arrow = !active ? '' : sortDir === 'asc' ? '↑' : '↓';
  return (
    <th className={`eyebrow th-sort py-2.5 px-3 font-medium text-${align} ${active ? 'text-ink' : ''}`}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className="inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 rounded-sm"
      >
        <span>{label}</span>
        <span className="font-mono w-2 text-ink-mute">{arrow}</span>
      </button>
    </th>
  );
}

function Pagination({
  page, totalPages, total, pageSize, onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-rule bg-paper-deep text-[12px] text-ink-mute">
      <span className="font-mono">{start}–{end} de {total}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-2 py-1 rounded hover:bg-paper-lifted disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
          aria-label="Página anterior"
        >
          ← Anterior
        </button>
        <span className="font-mono px-2 text-ink">{page}/{totalPages}</span>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-2 py-1 rounded hover:bg-paper-lifted disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
          aria-label="Página siguiente"
        >
          Siguiente →
        </button>
      </div>
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
