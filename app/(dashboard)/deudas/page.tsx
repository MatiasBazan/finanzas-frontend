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

function fmtMes(mes: string) {
  const [y, m] = mes.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
}

function daysUntil(date: string | undefined) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}

const INPUT_CLS =
  'h-9 bg-paper-deep border border-edge rounded-md text-ink placeholder:text-ink-faint text-[13px] px-3 focus-visible:border-teal focus-visible:ring-2 focus-visible:ring-teal/15';

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
      const [d, p] = await Promise.all([
        api.get('/deudas'),
        api.get('/deudas/proyeccion'),
      ]);
      setDeudas(d);
      setProyeccion(p);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

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
      if (editingDeuda) await api.patch(`/deudas/${editingDeuda.id}`, body);
      else await api.post('/deudas', body);
      setDialogOpen(false);
      setLoading(true);
      await fetchAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/deudas/${id}`);
      setDeudas((prev) => prev.filter((d) => d.id !== id));
    } catch {
      /* ignore */
    } finally {
      setDeleteId(null);
    }
  }

  const avgProyeccion =
    proyeccion.length > 0
      ? proyeccion.reduce((s, p) => s + p.total, 0) / proyeccion.length
      : 0;
  const maxProyeccion = Math.max(...proyeccion.map((p) => p.total), 0);

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-rule">
        <div>
          <p className="eyebrow">Posiciones de deuda</p>
          <p className="mt-1 text-[13px] text-ink-mute">
            {loading
              ? 'Cargando…'
              : `${deudas.length} ${deudas.length === 1 ? 'deuda registrada' : 'deudas registradas'}`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="h-9 px-3.5 text-[13px] font-medium bg-teal text-paper hover:bg-ink rounded-md transition-colors"
        >
          + Nueva deuda
        </button>
      </div>

      {/* Table */}
      <div className="mt-5 border border-rule rounded-lg bg-paper-lifted overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-paper-deep border-b border-rule">
              <th className="eyebrow text-left py-2.5 px-5 font-medium">Descripción</th>
              <th className="eyebrow text-right py-2.5 px-3 font-medium">Total</th>
              <th className="eyebrow text-left py-2.5 px-3 font-medium">Cuotas</th>
              <th className="eyebrow text-right py-2.5 px-3 font-medium">Por cuota</th>
              <th className="eyebrow text-left py-2.5 px-3 font-medium">Estado</th>
              <th className="eyebrow text-left py-2.5 px-3 font-medium">Vencimiento</th>
              <th className="py-2.5 px-5 w-32" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-rule-soft">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="py-3 px-3">
                      <div className="h-3 bg-paper-deep animate-pulse rounded-sm" />
                    </td>
                  ))}
                </tr>
              ))
            ) : deudas.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center">
                  <span className="text-[13px] text-ink-faint">
                    Aún no hay deudas registradas
                  </span>
                </td>
              </tr>
            ) : (
              deudas.map((d) => {
                const pagadas = d.cuotasPagadas ?? 0;
                const progreso = d.cantidadCuotas > 0 ? (pagadas / d.cantidadCuotas) * 100 : 0;
                const montoCuota = d.cantidadCuotas > 0 ? d.montoTotal / d.cantidadCuotas : 0;
                const dte = daysUntil(d.fechaVencimiento);
                const dteTone =
                  dte === null ? 'text-ink-faint'
                  : dte < 0 ? 'text-neg'
                  : dte <= 7 ? 'text-warn'
                  : 'text-ink-mute';
                const stateColor =
                  d.estado === 'pagada' ? 'text-pos' :
                  d.estado === 'pendiente' ? 'text-warn' : 'text-ink-mute';
                return (
                  <tr
                    key={d.id}
                    className="border-b border-rule-soft last:border-b-0 hover:bg-paper-deep/40 group transition-colors"
                  >
                    <td className="py-3.5 px-5">
                      <div className="text-ink truncate max-w-[280px]">{d.descripcion}</div>
                      <div className="flex items-center gap-2.5 mt-1.5">
                        <div className="w-28 h-1 bg-paper-deep rounded-full overflow-hidden">
                          <div
                            className="h-full bg-pos rounded-full"
                            style={{ width: `${progreso}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-ink-mute">
                          {progreso.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-ink">
                      <span className="peso">$</span>
                      {fmtNum(Number(d.montoTotal))}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-ink-soft">
                      {pagadas}/{d.cantidadCuotas}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-ink-soft">
                      <span className="peso">$</span>
                      {fmtNum(montoCuota)}
                    </td>
                    <td className={`py-3.5 px-3 ${stateColor} text-[12px] capitalize`}>
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${stateColor === 'text-pos' ? 'bg-pos' : stateColor === 'text-warn' ? 'bg-warn' : 'bg-ink-mute'}`} />
                        {d.estado}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-mono text-[12px] text-ink-mute">
                        {fmtDate(d.fechaVencimiento)}
                      </div>
                      {dte !== null && (
                        <div className={`font-mono text-[11px] ${dteTone}`}>
                          {dte >= 0 ? `en ${dte}d` : `vencida hace ${Math.abs(dte)}d`}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex gap-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="text-[12px] text-ink-mute hover:text-teal transition-colors"
                          onClick={() => openEdit(d)}
                        >
                          Editar
                        </button>
                        {deleteId === d.id ? (
                          <>
                            <button
                              className="text-[12px] text-neg font-medium"
                              onClick={() => handleDelete(d.id)}
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
                            onClick={() => setDeleteId(d.id)}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Proyección */}
      <div className="mt-10 pt-7 border-t border-rule">
        <div className="flex items-baseline justify-between">
          <h2 className="serif text-[17px] font-medium text-ink tracking-tight">
            Proyección a 12 meses
          </h2>
          {!loading && avgProyeccion > 0 && (
            <span className="text-[12px] text-ink-mute">
              Promedio mensual {fmtARS(avgProyeccion)}
            </span>
          )}
        </div>

        {loading ? (
          <div className="mt-5 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-7 bg-paper-deep animate-pulse rounded-sm" />
            ))}
          </div>
        ) : proyeccion.length === 0 ? (
          <div className="py-12 text-center">
            <span className="text-[13px] text-ink-faint">Sin proyección disponible</span>
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-rule-soft">
            {proyeccion.map((p) => {
              const isHigh = p.total > avgProyeccion;
              const w = maxProyeccion > 0 ? (p.total / maxProyeccion) * 100 : 0;
              return (
                <li
                  key={p.mes}
                  className="grid grid-cols-[140px_1fr_140px_70px] items-center gap-4 py-2.5"
                >
                  <span className="text-[13px] text-ink-soft capitalize">{fmtMes(p.mes)}</span>
                  <div className="h-1.5 bg-paper-deep rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isHigh ? 'bg-warn' : 'bg-teal'}`}
                      style={{ width: `${w.toFixed(1)}%` }}
                    />
                  </div>
                  <span className={`font-mono text-[13px] text-right ${isHigh ? 'text-warn' : 'text-ink'}`}>
                    <span className="peso">$</span>
                    {fmtNum(p.total)}
                  </span>
                  <span className={`text-[11px] text-right ${isHigh ? 'text-warn' : 'text-ink-faint'}`}>
                    {isHigh ? 'sobre promedio' : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-paper-lifted border border-rule rounded-lg lift text-ink sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="serif text-[18px] font-medium text-ink tracking-tight">
              {editingDeuda ? 'Editar deuda' : 'Nueva deuda'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <Field label="Descripción">
              <Input
                type="text"
                placeholder="Ej: Préstamo Banco"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                required
                className={INPUT_CLS}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Monto total">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.montoTotal}
                  onChange={(e) => setForm({ ...form, montoTotal: e.target.value })}
                  required
                  className={`${INPUT_CLS} font-mono`}
                />
              </Field>
              <Field label="Cuotas">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="12"
                  value={form.cantidadCuotas}
                  onChange={(e) => setForm({ ...form, cantidadCuotas: e.target.value })}
                  required
                  className={`${INPUT_CLS} font-mono`}
                />
              </Field>
            </div>

            <Field label="Vencimiento" hint="opcional">
              <Input
                type="date"
                value={form.fechaVencimiento}
                onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })}
                className={`${INPUT_CLS} font-mono`}
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
                {saving ? 'Guardando…' : editingDeuda ? 'Actualizar' : 'Guardar deuda'}
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
