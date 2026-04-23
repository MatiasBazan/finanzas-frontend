'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { ShoppingCart, AlertCircle, Clock, CreditCard } from 'lucide-react';

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

const PIE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

function formatMoney(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMes(mes: string) {
  const [year, month] = mes.split('-');
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('es-AR', {
    month: 'short',
    year: '2-digit',
  });
}

const TOOLTIP_STYLE = {
  background: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: 8,
  color: '#f4f4f5',
  fontSize: 13,
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
        console.log('gastos:', g);
        console.log('deudas:', d);
        console.log('tarjetas:', t);
        setGastos(g);
        setDeudas(d);
        setProyeccion(p);
        setTarjetas(t);
      } catch {
        setError('Error al cargar los datos.');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const now = new Date();

  const totalMes = gastos
    .filter((g) => {
      const fecha = new Date(g.creadoEn ?? g.createdAt ?? g.fecha ?? '');
      if (isNaN(fecha.getTime())) return false;
      return fecha.getMonth() === now.getMonth() && fecha.getFullYear() === now.getFullYear();
    })
    .reduce((acc, g) => acc + Number(g.monto), 0);

  const deudasPendientes = deudas.filter((d) => d.estado === 'pendiente');
  const totalDeudas = deudasPendientes.reduce((acc, d) => acc + Number(d.montoTotal), 0);

  const totalTarjetas = tarjetas.reduce((sum, t) => sum + Number(t.saldoActual), 0);

  const proximaDeuda = deudasPendientes
    .filter((d) => d.fechaVencimiento ?? d.vencimiento)
    .sort((a, b) => {
      const fa = new Date(a.fechaVencimiento ?? a.vencimiento ?? '');
      const fb = new Date(b.fechaVencimiento ?? b.vencimiento ?? '');
      return fa.getTime() - fb.getTime();
    })[0];

  const categoriaMap: Record<string, number> = {};
  for (const g of gastos) {
    categoriaMap[g.categoria] = (categoriaMap[g.categoria] ?? 0) + Number(g.monto);
  }
  const pieData = Object.entries(categoriaMap).map(([name, value]) => ({ name, value }));

  const barData = proyeccion.slice(0, 6).map((p) => ({
    mes: formatMes(p.mes),
    total: p.total,
  }));

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <Skeleton className="h-32 rounded-2xl bg-zinc-800" />
            <Skeleton className="h-32 rounded-2xl bg-zinc-800" />
            <Skeleton className="h-32 rounded-2xl bg-zinc-800" />
            <Skeleton className="h-32 rounded-2xl bg-zinc-800" />
          </>
        ) : (
          <>
            {/* Gastado este mes */}
            <Card className="bg-zinc-900 border border-zinc-800 ring-0 rounded-2xl">
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                    Gastado este mes
                  </CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                    <ShoppingCart className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-[family-name:var(--font-mono)] text-blue-400 tracking-tight">
                  {formatMoney(totalMes)}
                </p>
                <p className="text-xs text-zinc-600 mt-1">mes actual</p>
              </CardContent>
            </Card>

            {/* Total deudas */}
            <Card className="bg-zinc-900 border border-zinc-800 ring-0 rounded-2xl">
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                    Deudas pendientes
                  </CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-[family-name:var(--font-mono)] text-red-400 tracking-tight">
                  {formatMoney(totalDeudas)}
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  {deudasPendientes.length} deuda{deudasPendientes.length !== 1 ? 's' : ''} activa{deudasPendientes.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            {/* Próxima deuda */}
            <Card className="bg-zinc-900 border border-zinc-800 ring-0 rounded-2xl">
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                    Próxima a vencer
                  </CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                    <Clock className="h-4 w-4 text-amber-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {proximaDeuda ? (
                  <>
                    <p className="text-base font-semibold text-zinc-100 truncate leading-tight">
                      {proximaDeuda.descripcion}
                    </p>
                    <p className="text-sm font-[family-name:var(--font-mono)] text-amber-400 mt-1">
                      {new Date(proximaDeuda.fechaVencimiento ?? proximaDeuda.vencimiento ?? '').toLocaleDateString('es-AR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-zinc-600 mt-2">Sin deudas próximas</p>
                )}
              </CardContent>
            </Card>

            {/* Total tarjetas */}
            <Card className="bg-zinc-900 border border-zinc-800 ring-0 rounded-2xl">
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                    Total tarjetas
                  </CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                    <CreditCard className="h-4 w-4 text-violet-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-[family-name:var(--font-mono)] text-violet-400 tracking-tight">
                  {formatMoney(totalTarjetas)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-zinc-600">
                    {tarjetas.length} tarjeta{tarjetas.length !== 1 ? 's' : ''}
                  </p>
                  {totalTarjetas > 500000 && (
                    <span className="text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25 rounded px-1.5 py-0.5">
                      ⚠ Atención
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pie chart */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">
            Distribución por categoría
          </h2>
          {loading ? (
            <Skeleton className="h-64 rounded-xl bg-zinc-800" />
          ) : pieData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-zinc-600 text-sm">
              Sin gastos registrados
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => formatMoney(Number(v))}
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: '#f4f4f5' }}
                  cursor={false}
                />
                <Legend
                  formatter={(v) => (
                    <span style={{ color: '#a1a1aa', fontSize: 12 }}>{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar chart */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">
            Proyección de deudas — próximos 6 meses
          </h2>
          {loading ? (
            <Skeleton className="h-64 rounded-xl bg-zinc-800" />
          ) : barData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-zinc-600 text-sm">
              Sin proyección disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat('es-AR', {
                      notation: 'compact',
                      maximumFractionDigits: 0,
                    }).format(v)
                  }
                />
                <Tooltip
                  formatter={(v) => formatMoney(Number(v))}
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: '#f4f4f5' }}
                  cursor={{ fill: '#27272a' }}
                />
                <Bar
                  dataKey="total"
                  fill="#3B82F6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
