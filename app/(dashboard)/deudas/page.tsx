'use client';

import { useEffect, useState } from 'react';
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
  cuotasPagadas: string;
  estado: string;
  fechaVencimiento: string;
}

const ESTADOS = ['pendiente', 'pagada', 'atrasada'] as const;

const EMPTY_FORM: DeudaForm = {
  descripcion: '',
  montoTotal: '',
  cantidadCuotas: '',
  cuotasPagadas: '0',
  estado: 'pendiente',
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
  const toast = useToast();
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [proyeccion, setProyeccion] = useState<Proyeccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeuda, setEditingDeuda] = useState<Deuda | null>(null);
  const [form, setForm] = useState<DeudaForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [payingId, setPayingId] = useState<number | null>(null);

  async function fetchAll() {
    try {
      const [d, p] = await Promise.all([
        api.get('/deudas'),
        api.get('/deudas/proyeccion'),
      ]);
      setDeudas(d);
      setProyeccion(p);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar las deudas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      cuotasPagadas: String(d.cuotasPagadas ?? 0),
      estado: d.estado || 'pendiente',
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
      const body: Record<string, unknown> = {
        descripcion: form.descripcion,
        montoTotal: Number(form.montoTotal),
        cantidadCuotas: Number(form.cantidadCuotas),
        ...(form.fechaVencimiento ? { fechaVencimiento: form.fechaVencimiento } : {}),
      };
      if (editingDeuda) {
        body.cuotasPagadas = Number(form.cuotasPagadas || 0);
        body.estado = form.estado;
        await api.patch(`/deudas/${editingDeuda.id}`, body);
        toast.success('Deuda actualizada');
      } else {
        await api.post('/deudas', body);
        toast.success('Deuda creada');
      }
      setDialogOpen(false);
      setLoading(true);
      await fetchAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function pagarCuota(d: Deuda) {
    if (d.cuotasPagadas >= d.cantidadCuotas) return;
    const nuevas = d.cuotasPagadas + 1;
    const completed = nuevas >= d.cantidadCuotas;
    const prev = deudas;
    setPayingId(d.id);
    setDeudas((p) =>
      p.map((x) => x.id === d.id ? { ...x, cuotasPagadas: nuevas, estado: completed ? 'pagada' : x.estado } : x)
    );
    try {
      const body: Record<string, unknown> = { cuotasPagadas: nuevas };
      if (completed) body.estado = 'pagada';
      await api.patch(`/deudas/${d.id}`, body);
      toast.success(completed ? 'Deuda completada' : `Cuota ${nuevas}/${d.cantidadCuotas} marcada`, {
        action: {
          label: 'Deshacer',
          onClick: async () => {
            try {
              await api.patch(`/deudas/${d.id}`, { cuotasPagadas: d.cuotasPagadas, estado: d.estado });
              await fetchAll();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'No se pudo deshacer.');
            }
          },
        },
      });
    } catch (err) {
      setDeudas(prev);
      toast.error(err instanceof Error ? err.message : 'No se pudo marcar.');
    } finally {
      setPayingId(null);
    }
  }

  async function handleDelete(d: Deuda) {
    const snapshot = deudas;
    setDeudas((prev) => prev.filter((x) => x.id !== d.id));
    let undone = false;
    try {
      await api.delete(`/deudas/${d.id}`);
      toast.success('Deuda eliminada', {
        action: {
          label: 'Deshacer',
          onClick: async () => {
            undone = true;
            try {
              await api.post('/deudas', {
                descripcion: d.descripcion,
                montoTotal: Number(d.montoTotal),
                cantidadCuotas: d.cantidadCuotas,
                ...(d.fechaVencimiento ? { fechaVencimiento: d.fechaVencimiento.slice(0, 10) } : {}),
              });
              await fetchAll();
              toast.info('Deuda restaurada');
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'No se pudo deshacer.');
            }
          },
        },
      });
    } catch (err) {
      if (!undone) {
        setDeudas(snapshot);
        toast.error(err instanceof Error ? err.message : 'No se pudo eliminar.');
      }
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
        <button onClick={openCreate} className="btn-primary">
          + Nueva deuda
        </button>
      </div>

      {/* Table desktop */}
      <div className="mt-5 border border-rule rounded-lg bg-paper-lifted overflow-hidden hidden lg:block">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-paper-deep border-b border-rule">
              <th className="eyebrow text-left py-2.5 px-5 font-medium">Descripción</th>
              <th className="eyebrow text-right py-2.5 px-3 font-medium">Total</th>
              <th className="eyebrow text-left py-2.5 px-3 font-medium">Cuotas</th>
              <th className="eyebrow text-right py-2.5 px-3 font-medium">Por cuota</th>
              <th className="eyebrow text-left py-2.5 px-3 font-medium">Estado</th>
              <th className="eyebrow text-left py-2.5 px-3 font-medium">Vencimiento</th>
              <th className="py-2.5 px-5 w-44" />
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
                  : dte === 0 ? 'text-warn font-medium'
                  : dte <= 7 ? 'text-warn'
                  : 'text-ink-mute';
                const stateColor =
                  d.estado === 'pagada' ? 'text-pos' :
                  d.estado === 'pendiente' ? 'text-warn' : 'text-ink-mute';
                const stateDot =
                  d.estado === 'pagada' ? 'bg-pos' :
                  d.estado === 'pendiente' ? 'bg-warn' : 'bg-ink-mute';
                const canPay = pagadas < d.cantidadCuotas && d.estado !== 'pagada';
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
                            className={`h-full rounded-full ${d.estado === 'pagada' ? 'bg-pos' : 'bg-teal'}`}
                            style={{ width: `${progreso}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-ink-mute">
                          {pagadas}/{d.cantidadCuotas} · {progreso.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-ink whitespace-nowrap">
                      <span className="peso">$</span>{fmtNum(Number(d.montoTotal))}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-ink-soft">
                      {pagadas}/{d.cantidadCuotas}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-ink-soft whitespace-nowrap">
                      <span className="peso">$</span>{fmtNum(montoCuota)}
                    </td>
                    <td className={`py-3.5 px-3 ${stateColor} text-[12px] capitalize`}>
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${stateDot}`} />
                        {d.estado}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="font-mono text-[12px] text-ink-mute">
                        {fmtDate(d.fechaVencimiento)}
                      </div>
                      {dte !== null && (
                        <div className={`font-mono text-[11px] ${dteTone}`}>
                          {dte === 0 ? 'vence hoy' : dte > 0 ? `en ${dte}d` : `vencida hace ${Math.abs(dte)}d`}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex gap-3 justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {canPay && (
                          <button
                            className="btn-ghost btn-ghost-accent disabled:opacity-50"
                            onClick={() => pagarCuota(d)}
                            disabled={payingId === d.id}
                            title="Marcar siguiente cuota pagada"
                          >
                            + Pagar cuota
                          </button>
                        )}
                        <button className="btn-ghost btn-ghost-accent" onClick={() => openEdit(d)}>
                          Editar
                        </button>
                        <button className="btn-ghost btn-ghost-danger" onClick={() => handleDelete(d)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="mt-5 lg:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-paper-deep animate-pulse rounded-lg" />
          ))
        ) : deudas.length === 0 ? (
          <div className="py-14 text-center border border-rule rounded-lg bg-paper-lifted">
            <span className="text-[13px] text-ink-faint">Aún no hay deudas registradas</span>
          </div>
        ) : (
          deudas.map((d) => {
            const pagadas = d.cuotasPagadas ?? 0;
            const progreso = d.cantidadCuotas > 0 ? (pagadas / d.cantidadCuotas) * 100 : 0;
            const dte = daysUntil(d.fechaVencimiento);
            const dteTone =
              dte === null ? 'text-ink-faint'
              : dte < 0 ? 'text-neg'
              : dte === 0 ? 'text-warn font-medium'
              : dte <= 7 ? 'text-warn'
              : 'text-ink-mute';
            const stateColor =
              d.estado === 'pagada' ? 'text-pos' :
              d.estado === 'pendiente' ? 'text-warn' : 'text-ink-mute';
            const stateDot =
              d.estado === 'pagada' ? 'bg-pos' :
              d.estado === 'pendiente' ? 'bg-warn' : 'bg-ink-mute';
            const canPay = pagadas < d.cantidadCuotas && d.estado !== 'pagada';
            return (
              <article key={d.id} className="border border-rule rounded-lg bg-paper-lifted p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-ink text-[14px] font-medium truncate">{d.descripcion}</h3>
                  <span className="font-mono text-ink text-[15px] whitespace-nowrap">
                    <span className="peso">$</span>{fmtNum(Number(d.montoTotal))}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-2.5">
                  <div className="flex-1 h-1.5 bg-paper-deep rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${d.estado === 'pagada' ? 'bg-pos' : 'bg-teal'}`}
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11.5px] text-ink-mute whitespace-nowrap">
                    {pagadas}/{d.cantidadCuotas}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-[12px]">
                  <span className={`inline-flex items-center gap-1.5 ${stateColor} capitalize`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${stateDot}`} />
                    {d.estado}
                  </span>
                  {dte !== null && (
                    <span className={`font-mono ${dteTone}`}>
                      {dte === 0 ? 'vence hoy' : dte > 0 ? `en ${dte}d` : `vencida hace ${Math.abs(dte)}d`}
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-rule-soft flex flex-wrap items-center gap-x-4 gap-y-2">
                  {canPay && (
                    <button
                      onClick={() => pagarCuota(d)}
                      disabled={payingId === d.id}
                      className="btn-ghost btn-ghost-accent disabled:opacity-50"
                    >
                      + Pagar cuota
                    </button>
                  )}
                  <button onClick={() => openEdit(d)} className="btn-ghost btn-ghost-accent">Editar</button>
                  <button onClick={() => handleDelete(d)} className="btn-ghost btn-ghost-danger ml-auto">Eliminar</button>
                </div>
              </article>
            );
          })
        )}
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
                  className="grid grid-cols-[110px_1fr_auto] sm:grid-cols-[140px_1fr_160px] items-center gap-4 py-2.5"
                >
                  <span className="text-[13px] text-ink-soft capitalize truncate">{fmtMes(p.mes)}</span>
                  <div className="h-1.5 bg-paper-deep rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isHigh ? 'bg-warn' : 'bg-teal'}`}
                      style={{ width: `${w.toFixed(1)}%` }}
                    />
                  </div>
                  <span className={`font-mono text-[13px] text-right whitespace-nowrap ${isHigh ? 'text-warn' : 'text-ink'}`}>
                    <span className="peso">$</span>{fmtNum(p.total)}
                    {isHigh && (
                      <span className="ml-2 text-[10.5px] text-warn">↑ promedio</span>
                    )}
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
                autoFocus
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

            {editingDeuda && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cuotas pagadas">
                  <Input
                    type="number"
                    min="0"
                    max={form.cantidadCuotas || undefined}
                    step="1"
                    value={form.cuotasPagadas}
                    onChange={(e) => setForm({ ...form, cuotasPagadas: e.target.value })}
                    className={`${INPUT_CLS} font-mono`}
                  />
                </Field>
                <Field label="Estado">
                  <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v ?? 'pendiente' })}>
                    <SelectTrigger className="h-9 bg-paper-deep border border-edge rounded-md text-[13px] text-ink">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-paper-lifted border border-rule rounded-md lift">
                      {ESTADOS.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}

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
                className="h-9 px-3.5 text-[13px] text-ink-mute hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 rounded-md"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
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
