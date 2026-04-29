'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface Gasto {
  id: number;
  monto: number | string;
  categoria: string;
  descripcion?: string;
  fecha?: string;
  creadoEn?: string;
  createdAt?: string;
}

interface Deuda {
  id: number;
  descripcion: string;
  montoTotal: number | string;
  cantidadCuotas: number;
  cuotasPagadas: number;
  fechaVencimiento?: string;
  vencimiento?: string;
  estado: string;
}

interface Proyeccion {
  mes: string;
  total: number;
}

interface TarjetaResumen {
  id: number;
  saldoActual: number;
}

const DONUT_COLORS = ['var(--teal)', 'var(--warn)', 'var(--pos)', 'var(--neg)', 'var(--ink-mute)'];

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

function fmtCompact(n: number) {
  return new Intl.NumberFormat('es-AR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtMes(mes: string) {
  const [y, m] = mes.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('es-AR', {
    month: 'short',
    year: '2-digit',
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

const TOOLTIP_STYLE = {
  background: 'oklch(1 0 0)',
  border: '1px solid var(--rule)',
  borderRadius: 6,
  color: 'var(--ink)',
  fontSize: 12,
  padding: '8px 10px',
  boxShadow: '0 8px 24px -12px oklch(0.25 0.02 240 / 0.18)',
};

export default function DashboardPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [proyeccion, setProyeccion] = useState<Proyeccion[]>([]);
  const [tarjetas, setTarjetas] = useState<TarjetaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAll() {
      try {
        const [g, d, p, t] = await Promise.all([
          api.get('/gastos'),
          api.get('/deudas'),
          api.get('/deudas/proyeccion'),
          api.get('/tarjetas'),
        ]);
        setGastos(g);
        setDeudas(d);
        setProyeccion(p);
        setTarjetas(t);
      } catch {
        setError('No se pudieron cargar los datos.');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const now = new Date();

  const { totalMes, totalMesPrev, deltaPct } = useMemo(() => {
    const cur = new Date(now.getFullYear(), now.getMonth(), 1);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    let curT = 0, prevT = 0;
    for (const g of gastos) {
      const f = new Date(g.fecha ?? g.creadoEn ?? g.createdAt ?? '');
      if (isNaN(f.getTime())) continue;
      if (f >= cur && f < next) curT += Number(g.monto);
      else if (f >= prev && f < cur) prevT += Number(g.monto);
    }
    const dp = prevT > 0 ? ((curT - prevT) / prevT) * 100 : null;
    return { totalMes: curT, totalMesPrev: prevT, deltaPct: dp };
  }, [gastos, now]);

  const deudasPendientes = deudas.filter((d) => d.estado === 'pendiente');
  const totalDeudas = deudasPendientes.reduce((a, d) => a + Number(d.montoTotal), 0);
  const totalTarjetas = tarjetas.reduce((s, t) => s + Number(t.saldoActual), 0);

  const proxima = deudasPendientes
    .filter((d) => d.fechaVencimiento ?? d.vencimiento)
    .sort((a, b) => {
      const fa = new Date(a.fechaVencimiento ?? a.vencimiento ?? '').getTime();
      const fb = new Date(b.fechaVencimiento ?? b.vencimiento ?? '').getTime();
      return fa - fb;
    })[0];

  const proxDays = proxima ? daysUntil(proxima.fechaVencimiento ?? proxima.vencimiento) : null;

  // Categorías — top 4 + otras
  const catData = useMemo(() => {
    const m: Record<string, number> = {};
    for (const g of gastos) m[g.categoria] = (m[g.categoria] ?? 0) + Number(g.monto);
    const sorted = Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    if (sorted.length <= 5) return sorted;
    const top = sorted.slice(0, 4);
    const otrasTotal = sorted.slice(4).reduce((s, x) => s + x.value, 0);
    return [...top, { name: 'otras', value: otrasTotal }];
  }, [gastos]);

  const catTotal = catData.reduce((s, x) => s + x.value, 0);

  const barData = proyeccion.slice(0, 6).map((p) => ({
    mes: fmtMes(p.mes),
    total: p.total,
  }));

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl">
      {error && (
        <div className="mb-6 px-4 py-3 bg-neg-bg border border-neg/20 rounded-md">
          <span className="text-[13px] text-neg">{error}</span>
        </div>
      )}

      {/* Stat row — number-first hierarchy */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-rule border border-rule rounded-lg overflow-hidden">
        <Stat
          label="Gastos del mes"
          value={loading ? null : totalMes}
          delta={loading ? null : deltaPct}
          deltaPositive={false}
          aux={loading ? '' : totalMesPrev > 0 ? `Mes anterior ${fmtARS(totalMesPrev)}` : 'Sin histórico previo'}
        />
        <Stat
          label="Deuda pendiente"
          value={loading ? null : totalDeudas}
          aux={loading ? '' : `${deudasPendientes.length} ${deudasPendientes.length === 1 ? 'deuda activa' : 'deudas activas'}`}
          tone="neg"
        />
        <Stat
          label="Saldo en tarjetas"
          value={loading ? null : totalTarjetas}
          aux={loading ? '' : `${tarjetas.length} ${tarjetas.length === 1 ? 'cuenta' : 'cuentas'}`}
        />
        <NextDue
          loading={loading}
          dias={proxDays}
          desc={proxima?.descripcion}
          fecha={proxima?.fechaVencimiento ?? proxima?.vencimiento}
        />
      </section>

      {/* Two-column block: donut + ladder */}
      <section className="mt-10 grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Donut */}
        <div className="lg:col-span-2">
          <SectionHeader
            title="Por categoría"
            meta={loading ? '' : catData.length > 0 ? `${catData.length} categorías` : ''}
          />
          {loading ? (
            <div className="h-64 mt-4 bg-paper-deep animate-pulse rounded-md" />
          ) : catData.length === 0 ? (
            <Empty msg="Aún no hay gastos registrados" />
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-6 items-center">
              <div className="relative h-[180px]">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={catData}
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={84}
                      paddingAngle={1}
                      dataKey="value"
                      stroke="var(--paper)"
                      strokeWidth={2}
                    >
                      {catData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => fmtARS(Number(v))}
                      contentStyle={TOOLTIP_STYLE}
                      itemStyle={{ color: 'var(--ink)' }}
                      cursor={false}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="eyebrow">Total</span>
                  <span className="font-mono text-[14px] text-ink mt-1">{fmtARS(catTotal)}</span>
                </div>
              </div>

              <ul className="space-y-2.5">
                {catData.map((c, i) => {
                  const pct = catTotal > 0 ? (c.value / catTotal) * 100 : 0;
                  return (
                    <li key={c.name} className="flex items-center gap-3 text-[13px]">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      <span className="capitalize text-ink-soft truncate">{c.name}</span>
                      <span className="ml-auto font-mono text-ink">{fmtARS(c.value)}</span>
                      <span className="font-mono text-ink-mute text-[11.5px] w-10 text-right">
                        {pct.toFixed(0)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Vertical hairline */}
        <div className="hidden lg:block lg:col-span-3">
          <SectionHeader
            title="Proyección de deudas"
            meta={loading ? '' : barData.length > 0 ? `Próximos ${barData.length} meses` : ''}
          />
          {loading ? (
            <div className="h-64 mt-4 bg-paper-deep animate-pulse rounded-md" />
          ) : barData.length === 0 ? (
            <Empty msg="Sin proyección disponible" />
          ) : (
            <div className="mt-4 -ml-4">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--rule)" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: 'var(--ink-mute)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--rule)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--ink-mute)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => fmtCompact(v)}
                    width={56}
                  />
                  <Tooltip
                    formatter={(v) => fmtARS(Number(v))}
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={{ color: 'var(--ink)' }}
                    labelStyle={{ color: 'var(--ink-mute)' }}
                    cursor={{ fill: 'var(--paper-deep)' }}
                  />
                  <Bar dataKey="total" fill="var(--teal)" radius={[3, 3, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Mobile-only proyección */}
        <div className="lg:hidden">
          <SectionHeader title="Proyección de deudas" />
          {loading ? (
            <div className="h-56 mt-4 bg-paper-deep animate-pulse rounded-md" />
          ) : barData.length === 0 ? (
            <Empty msg="Sin proyección" />
          ) : (
            <div className="mt-4 -ml-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData}>
                  <CartesianGrid stroke="var(--rule)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: 'var(--ink-mute)', fontSize: 11 }} axisLine={{ stroke: 'var(--rule)' }} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--ink-mute)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={48} />
                  <Tooltip formatter={(v) => fmtARS(Number(v))} contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--paper-deep)' }} />
                  <Bar dataKey="total" fill="var(--teal)" radius={[3, 3, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Recent activity */}
      <section className="mt-10 border-t border-rule pt-7">
        <SectionHeader
          title="Actividad reciente"
          meta={loading ? '' : `Últimos ${Math.min(8, gastos.length)} de ${gastos.length}`}
        />
        {loading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-paper-deep animate-pulse rounded-md" />
            ))}
          </div>
        ) : gastos.length === 0 ? (
          <Empty msg="Aún no hay movimientos" />
        ) : (
          <ul className="mt-4 divide-y divide-rule-soft">
            {[...gastos]
              .sort((a, b) =>
                new Date(b.fecha ?? b.creadoEn ?? b.createdAt ?? '').getTime() -
                new Date(a.fecha ?? a.creadoEn ?? a.createdAt ?? '').getTime()
              )
              .slice(0, 8)
              .map((g) => {
                const f = new Date(g.fecha ?? g.creadoEn ?? g.createdAt ?? '');
                const dateStr = isNaN(f.getTime())
                  ? '—'
                  : f.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
                return (
                  <li
                    key={g.id}
                    className="grid grid-cols-[80px_140px_1fr_auto] items-center gap-4 py-3 text-[13px]"
                  >
                    <span className="font-mono text-ink-mute">{dateStr}</span>
                    <span className="eyebrow truncate">{g.categoria}</span>
                    <span className="text-ink-soft truncate">
                      {g.descripcion ?? <span className="text-ink-faint">Sin descripción</span>}
                    </span>
                    <span className="font-mono text-ink text-right">
                      <span className="peso">$</span>{fmtNum(Number(g.monto))}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  delta,
  deltaPositive,
  aux,
  tone,
}: {
  label: string;
  value: number | null;
  delta?: number | null;
  deltaPositive?: boolean;
  aux?: string;
  tone?: 'neg' | 'pos';
}) {
  const valueColor = tone === 'neg' ? 'text-neg' : 'text-ink';
  return (
    <div className="bg-paper-lifted px-5 py-5">
      <div className="eyebrow">{label}</div>
      {value === null ? (
        <div className="mt-2 h-7 w-32 bg-paper-deep animate-pulse rounded-sm" />
      ) : (
        <div className={`mt-1.5 font-mono text-[26px] leading-none tracking-tight ${valueColor}`}>
          <span className="peso">$</span>
          {fmtNum(value)}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-[12px]">
        {delta != null && (
          <span
            className={`inline-flex items-center gap-1 font-mono ${
              (deltaPositive === false ? delta > 0 : delta < 0) ? 'text-neg' : 'text-pos'
            }`}
          >
            <span>{delta >= 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(delta).toFixed(1)}%</span>
          </span>
        )}
        {aux && <span className="text-ink-mute truncate">{aux}</span>}
      </div>
    </div>
  );
}

function NextDue({
  loading,
  dias,
  desc,
  fecha,
}: {
  loading: boolean;
  dias: number | null;
  desc?: string;
  fecha?: string;
}) {
  let tone = 'text-ink';
  if (dias !== null) {
    if (dias < 0) tone = 'text-neg';
    else if (dias <= 7) tone = 'text-warn';
  }
  return (
    <div className="bg-paper-lifted px-5 py-5">
      <div className="eyebrow">Próximo vencimiento</div>
      {loading ? (
        <div className="mt-2 h-7 w-24 bg-paper-deep animate-pulse rounded-sm" />
      ) : dias === null || !desc ? (
        <>
          <div className="mt-1.5 font-serif text-[18px] text-ink-mute leading-tight">Sin vencimientos</div>
          <div className="mt-2 text-[12px] text-ink-faint">Todo al día</div>
        </>
      ) : (
        <>
          <div className={`mt-1.5 font-mono text-[26px] leading-none tracking-tight ${tone}`}>
            {dias >= 0 ? `en ${dias}d` : `−${Math.abs(dias)}d`}
          </div>
          <div className="mt-2 text-[12px] text-ink-mute truncate">
            {desc}
            {fecha && (
              <span className="text-ink-faint">
                {' · '}
                {new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="serif text-[17px] font-medium text-ink tracking-tight">{title}</h2>
      {meta && <span className="text-[12px] text-ink-mute">{meta}</span>}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="mt-6 py-10 text-center">
      <span className="text-[13px] text-ink-faint">{msg}</span>
    </div>
  );
}
