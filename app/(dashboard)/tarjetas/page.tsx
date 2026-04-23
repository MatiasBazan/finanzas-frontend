'use client';

import { useEffect, useState } from 'react';
import { useRef } from 'react';
import { api } from '@/lib/api';
import { parsearResumenPDF, type ResumenTarjeta } from '@/lib/parse-resumen';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { CreditCard, Plus, Trash2, AlertTriangle, CheckCircle, Clock, Sparkles, Upload, FileText, X } from 'lucide-react';

interface TarjetaResumen {
  id: number;
  nombre: string;
  banco: string;
  saldoActual: number;
  saldoDolares: number | null;
  vencimiento: string;
  pagoMinimo: number;
  cierreActual: string | null;
  cuotasAVencer: { mes: string; total: number }[];
  fechaImportacion: string;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMoneyUSD(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
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
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
}

function diasHastaVencimiento(vencimiento: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(vencimiento + 'T00:00:00');
  return Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function VencimientoBadge({ vencimiento }: { vencimiento: string }) {
  const dias = diasHastaVencimiento(vencimiento);
  const fecha = formatearFecha(vencimiento + 'T00:00:00');

  if (dias < 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">{fecha}</span>
        <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/25 text-xs">
          Vencida
        </Badge>
      </div>
    );
  }
  if (dias <= 7) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-300">{fecha}</span>
        <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/25 text-xs flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> {dias}d
        </Badge>
      </div>
    );
  }
  if (dias <= 15) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-300">{fecha}</span>
        <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-xs">
          <Clock className="h-3 w-3 mr-1" />{dias}d
        </Badge>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-400">{fecha}</span>
      <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/25 text-xs">
        <CheckCircle className="h-3 w-3 mr-1" />{dias}d
      </Badge>
    </div>
  );
}

type ImportStep = 'input' | 'loading' | 'preview' | 'saving';

const TH = 'text-xs uppercase tracking-widest text-zinc-500 font-medium py-2.5';

export default function TarjetasPage() {
  const [tarjetas, setTarjetas] = useState<TarjetaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Import dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>('input');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<ResumenTarjeta | null>(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchTarjetas() {
    try {
      setTarjetas(await api.get('/tarjetas'));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTarjetas(); }, []);

  function openDialog() {
    setStep('input');
    setPdfFile(null);
    setIsDragging(false);
    setPreview(null);
    setImportError('');
    setDialogOpen(true);
  }

  function handleFileSelect(file: File | null) {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setImportError('Solo se aceptan archivos PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImportError('El archivo es demasiado grande (máximo 10MB).');
      return;
    }
    setImportError('');
    setPdfFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files[0] ?? null);
  }

  async function handleAnalizar() {
    if (!pdfFile) {
      setImportError('Seleccioná un archivo PDF primero.');
      return;
    }
    setImportError('');
    setStep('loading');
    try {
      const parsed = await parsearResumenPDF(pdfFile);
      setPreview(parsed);
      setStep('preview');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al procesar con IA.');
      setStep('input');
    }
  }

  async function handleConfirmar() {
    if (!preview) return;
    setStep('saving');
    try {
      await api.post('/tarjetas/importar-resumen', preview);
      setDialogOpen(false);
      setLoading(true);
      await fetchTarjetas();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al guardar.');
      setStep('preview');
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/tarjetas/${id}`);
      setTarjetas((prev) => prev.filter((t) => t.id !== id));
    } catch { /* ignore */ } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Tarjetas de crédito</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {loading ? '...' : `${tarjetas.length} resumen${tarjetas.length !== 1 ? 'es' : ''} importado${tarjetas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button
          onClick={openDialog}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 gap-1.5"
        >
          <Plus className="h-4 w-4" /> Importar resumen
        </Button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-64 rounded-2xl bg-zinc-800" />
          <Skeleton className="h-64 rounded-2xl bg-zinc-800" />
        </div>
      ) : tarjetas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 py-20 gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800">
            <CreditCard className="h-7 w-7 text-zinc-600" />
          </div>
          <p className="text-zinc-500 text-sm">No hay resúmenes importados</p>
          <Button
            variant="ghost"
            onClick={openDialog}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-1.5 mt-1"
          >
            <Plus className="h-4 w-4" /> Importar primer resumen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {tarjetas.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-md">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-100 leading-tight">{t.nombre}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{t.banco}</p>
                  </div>
                </div>
                {deleteId === t.id ? (
                  <div className="flex gap-1.5 items-center">
                    <button
                      className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg px-2.5 py-1.5 transition-colors"
                      onClick={() => handleDelete(t.id)}
                    >
                      Confirmar
                    </button>
                    <button
                      className="text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-800 rounded-lg px-2.5 py-1.5 transition-colors"
                      onClick={() => setDeleteId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    className="text-zinc-600 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                    onClick={() => setDeleteId(t.id)}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Saldos */}
              <div className="px-5 py-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-600 mb-1">Saldo actual</p>
                  <p className="text-3xl font-bold font-[family-name:var(--font-mono)] text-red-400 tracking-tight">
                    {formatMoney(Number(t.saldoActual))}
                  </p>
                </div>
                {t.saldoDolares != null && Number(t.saldoDolares) > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-600 mb-0.5">Saldo en dólares</p>
                    <p className="text-base font-[family-name:var(--font-mono)] font-semibold text-amber-400">
                      {formatMoneyUSD(Number(t.saldoDolares))}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-600 mb-1">Vencimiento</p>
                    <VencimientoBadge vencimiento={t.vencimiento} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-600 mb-1">Pago mínimo</p>
                    <p className="text-sm font-[family-name:var(--font-mono)] font-semibold text-zinc-300">
                      {formatMoney(Number(t.pagoMinimo))}
                    </p>
                  </div>
                </div>

                {t.cierreActual && (
                  <p className="text-xs text-zinc-600">
                    Cierre:{' '}
                    <span className="text-zinc-500">
                      {formatearFecha(t.cierreActual + 'T00:00:00')}
                    </span>
                  </p>
                )}
              </div>

              {/* Cuotas */}
              {t.cuotasAVencer.length > 0 && (
                <div className="border-t border-zinc-800">
                  <p className="text-xs uppercase tracking-wide text-zinc-600 px-5 pt-3 pb-1.5">
                    Cuotas a vencer
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-800/50 hover:bg-zinc-800/50 border-b border-zinc-800">
                        <TableHead className={TH + ' pl-5'}>Mes</TableHead>
                        <TableHead className={TH + ' text-right pr-5'}>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {t.cuotasAVencer.map((c, i) => (
                        <TableRow
                          key={c.mes}
                          className={`border-b border-zinc-800/40 hover:bg-zinc-800/40 transition-colors
                            ${i % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950/50'}`}
                        >
                          <TableCell className="text-sm text-zinc-400 capitalize py-2 pl-5">
                            {formatMes(c.mes)}
                          </TableCell>
                          <TableCell className="text-right font-[family-name:var(--font-mono)] text-sm font-semibold text-zinc-200 py-2 pr-5">
                            {formatMoney(c.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="px-5 py-2.5 border-t border-zinc-800">
                <p className="text-xs text-zinc-700">
                  Importado: {formatearFecha(t.fechaImportacion)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (step === 'loading' || step === 'saving') return;
        setDialogOpen(open);
      }}>
        <DialogContent className="bg-zinc-900 border border-zinc-700 ring-0 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              Importar resumen con IA
            </DialogTitle>
          </DialogHeader>

          {step === 'input' && (
            <div className="space-y-4 mt-1">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />

              {/* Dropzone */}
              {pdfFile ? (
                <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
                      <FileText className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{pdfFile.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {(pdfFile.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setPdfFile(null); setImportError(''); }}
                    className="ml-3 shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                    aria-label="Quitar archivo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`w-full rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-150 focus:outline-none
                    ${isDragging
                      ? 'border-blue-500 bg-blue-500/8'
                      : 'border-zinc-600 bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-500'
                    }`}
                >
                  <div className="flex flex-col items-center gap-3 pointer-events-none">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors
                      ${isDragging ? 'bg-blue-500/20' : 'bg-zinc-700'}`}
                    >
                      <Upload className={`h-6 w-6 transition-colors ${isDragging ? 'text-blue-400' : 'text-zinc-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-300">
                        Arrastrá tu resumen PDF acá
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        o hacé click para seleccionar
                      </p>
                    </div>
                    <p className="text-xs text-zinc-600">PDF · máx. 10 MB</p>
                  </div>
                </button>
              )}

              {importError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400">
                  {importError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  className="rounded-lg px-4 py-2 text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAnalizar}
                  disabled={!pdfFile}
                  className="rounded-lg px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Analizar con IA
                </button>
              </div>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-2 border-zinc-700" />
                <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-t-blue-500 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-300">Analizando con Claude...</p>
                <p className="text-xs text-zinc-600 mt-1">Puede tardar unos segundos</p>
              </div>
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-4 mt-1">
              <div className="rounded-xl bg-green-500/8 border border-green-500/15 px-3.5 py-2.5 text-sm text-green-300 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Datos extraídos correctamente. Revisalos antes de guardar.
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-zinc-800">
                  <div className="p-3 space-y-0.5">
                    <p className="text-xs text-zinc-600">Nombre</p>
                    <p className="text-sm font-medium text-zinc-200">{preview.nombre}</p>
                  </div>
                  <div className="p-3 space-y-0.5">
                    <p className="text-xs text-zinc-600">Banco</p>
                    <p className="text-sm font-medium text-zinc-200">{preview.banco}</p>
                  </div>
                </div>
                <div className="border-t border-zinc-800 grid grid-cols-2 divide-x divide-zinc-800">
                  <div className="p-3 space-y-0.5">
                    <p className="text-xs text-zinc-600">Saldo actual</p>
                    <p className="text-sm font-bold font-[family-name:var(--font-mono)] text-red-400">
                      {formatMoney(preview.saldoActual)}
                    </p>
                  </div>
                  <div className="p-3 space-y-0.5">
                    <p className="text-xs text-zinc-600">Vencimiento</p>
                    <p className="text-sm font-medium text-zinc-200">{preview.vencimiento}</p>
                  </div>
                </div>
                <div className="border-t border-zinc-800 grid grid-cols-2 divide-x divide-zinc-800">
                  <div className="p-3 space-y-0.5">
                    <p className="text-xs text-zinc-600">Pago mínimo</p>
                    <p className="text-sm font-[family-name:var(--font-mono)] font-medium text-zinc-300">
                      {formatMoney(preview.pagoMinimo)}
                    </p>
                  </div>
                  <div className="p-3 space-y-0.5">
                    <p className="text-xs text-zinc-600">Saldo USD</p>
                    <p className="text-sm font-[family-name:var(--font-mono)] text-zinc-400">
                      {preview.saldoDolares != null ? formatMoneyUSD(preview.saldoDolares) : '—'}
                    </p>
                  </div>
                </div>
                {preview.cuotasAVencer.length > 0 && (
                  <div className="border-t border-zinc-800 p-3">
                    <p className="text-xs text-zinc-600 mb-2">
                      Cuotas a vencer ({preview.cuotasAVencer.length})
                    </p>
                    <div className="space-y-1">
                      {preview.cuotasAVencer.map((c) => (
                        <div key={c.mes} className="flex justify-between text-xs">
                          <span className="text-zinc-400 capitalize">{formatMes(c.mes)}</span>
                          <span className="font-[family-name:var(--font-mono)] text-zinc-300">{formatMoney(c.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {importError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400">
                  {importError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  className="rounded-lg px-4 py-2 text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
                  onClick={() => setStep('input')}
                >
                  ← Volver
                </button>
                <button
                  onClick={handleConfirmar}
                  className="rounded-lg px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20 transition-colors"
                >
                  Confirmar y guardar
                </button>
              </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-t-blue-500 animate-spin" />
              <p className="text-sm text-zinc-400">Guardando...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
