'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { parsearResumenPDF, type ResumenTarjeta } from '@/lib/parse-resumen';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

function fmtUSD(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
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

function daysUntil(date: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const v = new Date(date + 'T00:00:00');
  return Math.ceil((v.getTime() - hoy.getTime()) / 86_400_000);
}

type ImportStep = 'input' | 'loading' | 'preview' | 'saving';

export default function TarjetasPage() {
  const [tarjetas, setTarjetas] = useState<TarjetaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

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
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTarjetas();
  }, []);

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
      setImportError('El archivo debe ser un PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImportError('El archivo supera los 10 MB.');
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
      setImportError('Seleccioná un archivo primero.');
      return;
    }
    setImportError('');
    setStep('loading');
    try {
      const parsed = await parsearResumenPDF(pdfFile);
      setPreview(parsed);
      setStep('preview');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'No se pudo procesar el PDF.');
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
      setImportError(err instanceof Error ? err.message : 'No se pudo guardar.');
      setStep('preview');
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/tarjetas/${id}`);
      setTarjetas((prev) => prev.filter((t) => t.id !== id));
    } catch {
      /* ignore */
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="px-5 lg:px-8 py-7 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-rule">
        <div>
          <p className="eyebrow">Resúmenes importados</p>
          <p className="mt-1 text-[13px] text-ink-mute">
            {loading
              ? 'Cargando…'
              : `${tarjetas.length} ${tarjetas.length === 1 ? 'tarjeta' : 'tarjetas'} en seguimiento`}
          </p>
        </div>
        <button
          onClick={openDialog}
          className="h-9 px-3.5 text-[13px] font-medium bg-teal text-paper hover:bg-ink rounded-md transition-colors"
        >
          Importar resumen
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-72 bg-paper-deep animate-pulse rounded-lg" />
          ))}
        </div>
      ) : tarjetas.length === 0 ? (
        <div className="mt-10 py-16 border border-rule rounded-lg bg-paper-lifted text-center">
          <p className="serif text-[18px] text-ink-soft">Aún no importaste ningún resumen</p>
          <p className="mt-1 text-[13px] text-ink-mute">
            Subí un PDF y la IA extrae saldos, vencimientos y cuotas.
          </p>
          <button
            onClick={openDialog}
            className="mt-5 h-9 px-3.5 text-[13px] font-medium bg-teal text-paper hover:bg-ink rounded-md transition-colors"
          >
            Importar primer resumen
          </button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {tarjetas.map((t) => {
            const dte = daysUntil(t.vencimiento);
            const dteTone =
              dte < 0 ? 'text-neg'
              : dte <= 7 ? 'text-warn'
              : dte <= 15 ? 'text-warn'
              : 'text-pos';
            const cuotasTotal = t.cuotasAVencer.reduce((s, c) => s + Number(c.total), 0);
            return (
              <article
                key={t.id}
                className="border border-rule rounded-lg bg-paper-lifted overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-rule-soft">
                  <div className="min-w-0">
                    <p className="eyebrow">{t.banco}</p>
                    <h3 className="serif text-[18px] font-medium text-ink mt-1 truncate tracking-tight">
                      {t.nombre}
                    </h3>
                  </div>
                  {deleteId === t.id ? (
                    <div className="flex gap-2 items-center shrink-0 ml-3">
                      <button
                        className="text-[12px] text-neg font-medium"
                        onClick={() => handleDelete(t.id)}
                      >
                        Confirmar
                      </button>
                      <button
                        className="text-[12px] text-ink-mute hover:text-ink"
                        onClick={() => setDeleteId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      className="text-[12px] text-ink-mute hover:text-neg transition-colors shrink-0 ml-3"
                      onClick={() => setDeleteId(t.id)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                {/* Saldo principal */}
                <div className="px-5 py-5 grid grid-cols-2 gap-5 border-b border-rule-soft">
                  <div>
                    <p className="eyebrow">Saldo en pesos</p>
                    <p className="mt-1.5 font-mono text-[26px] leading-none tracking-tight text-neg">
                      <span className="peso">$</span>
                      {fmtNum(Number(t.saldoActual))}
                    </p>
                  </div>
                  <div>
                    <p className="eyebrow">Saldo en dólares</p>
                    <p className="mt-1.5 font-mono text-[26px] leading-none tracking-tight text-ink">
                      {t.saldoDolares != null && Number(t.saldoDolares) > 0 ? (
                        <>
                          <span className="peso">US$</span>
                          {fmtNum(Number(t.saldoDolares))}
                        </>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Meta row */}
                <div className="px-5 py-4 grid grid-cols-3 gap-4 border-b border-rule-soft">
                  <div>
                    <p className="eyebrow">Vencimiento</p>
                    <p className="mt-1 font-mono text-[13px] text-ink">
                      {fmtDate(t.vencimiento + 'T00:00:00')}
                    </p>
                    <p className={`mt-0.5 text-[11.5px] ${dteTone}`}>
                      {dte >= 0 ? `en ${dte} días` : `vencida hace ${Math.abs(dte)}d`}
                    </p>
                  </div>
                  <div>
                    <p className="eyebrow">Pago mínimo</p>
                    <p className="mt-1 font-mono text-[13px] text-ink">
                      <span className="peso">$</span>
                      {fmtNum(Number(t.pagoMinimo))}
                    </p>
                  </div>
                  <div>
                    <p className="eyebrow">Cierre</p>
                    <p className="mt-1 font-mono text-[13px] text-ink-soft">
                      {t.cierreActual ? fmtDate(t.cierreActual + 'T00:00:00') : '—'}
                    </p>
                  </div>
                </div>

                {/* Cuotas */}
                {t.cuotasAVencer.length > 0 && (
                  <div className="px-5 py-4 border-b border-rule-soft">
                    <div className="flex items-baseline justify-between mb-2.5">
                      <p className="eyebrow">Cuotas a vencer</p>
                      <p className="text-[12px] text-ink-mute font-mono">
                        {t.cuotasAVencer.length} · {fmtARS(cuotasTotal)}
                      </p>
                    </div>
                    <ul className="divide-y divide-rule-soft">
                      {t.cuotasAVencer.map((c) => (
                        <li
                          key={c.mes}
                          className="flex items-center justify-between py-2 text-[13px]"
                        >
                          <span className="text-ink-soft capitalize">{fmtMes(c.mes)}</span>
                          <span className="font-mono text-ink">
                            <span className="peso">$</span>
                            {fmtNum(c.total)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="px-5 py-3 bg-paper-deep">
                  <span className="text-[11.5px] text-ink-faint">
                    Importado el {fmtDate(t.fechaImportacion)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Import dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (step === 'loading' || step === 'saving') return;
          setDialogOpen(open);
        }}
      >
        <DialogContent className="bg-paper-lifted border border-rule rounded-lg lift text-ink sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="serif text-[18px] font-medium text-ink tracking-tight">
              Importar resumen
            </DialogTitle>
            <p className="text-[12.5px] text-ink-mute mt-0.5">
              Subí el PDF de tu resumen de tarjeta y la IA extrae los datos.
            </p>
          </DialogHeader>

          {step === 'input' && (
            <div className="space-y-4 mt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />

              {pdfFile ? (
                <div className="flex items-center justify-between border border-rule bg-paper-deep px-4 py-3 rounded-md">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="eyebrow">PDF</span>
                    <div className="min-w-0">
                      <p className="text-[13px] text-ink truncate">{pdfFile.name}</p>
                      <p className="font-mono text-[11px] text-ink-mute mt-0.5">
                        {(pdfFile.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPdfFile(null);
                      setImportError('');
                    }}
                    className="text-[12px] text-ink-mute hover:text-neg ml-3"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`w-full border border-dashed px-6 py-12 text-center transition-colors rounded-md
                    ${isDragging ? 'border-teal bg-teal-bg' : 'border-edge hover:border-ink-faint bg-paper-deep/40'}`}
                >
                  <p className="text-[13px] text-ink">
                    Arrastrá el PDF acá <span className="text-ink-mute">o</span>{' '}
                    <span className="text-teal underline underline-offset-2">elegí un archivo</span>
                  </p>
                  <p className="mt-1.5 text-[11.5px] text-ink-faint">PDF · hasta 10 MB</p>
                </button>
              )}

              {importError && (
                <div className="px-3 py-2.5 bg-neg-bg border-l-2 border-neg rounded-r-sm">
                  <span className="text-[12.5px] text-neg">{importError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-rule">
                <button
                  className="h-9 px-3.5 text-[13px] text-ink-mute hover:text-ink transition-colors"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAnalizar}
                  disabled={!pdfFile}
                  className="h-9 px-4 text-[13px] font-medium bg-teal text-paper hover:bg-ink rounded-md disabled:opacity-50 transition-colors"
                >
                  Analizar PDF
                </button>
              </div>
            </div>
          )}

          {step === 'loading' && (
            <div className="py-14 flex flex-col items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-teal animate-pulse" />
              <p className="serif text-[15px] text-ink">Analizando con Claude…</p>
              <p className="text-[12px] text-ink-mute">Tarda 5 a 10 segundos.</p>
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-4 mt-2">
              <div className="px-3 py-2.5 bg-pos-bg border-l-2 border-pos rounded-r-sm">
                <span className="text-[12.5px] text-pos">
                  Datos extraídos. Revisalos antes de guardar.
                </span>
              </div>

              <div className="border border-rule rounded-md divide-y divide-rule-soft">
                <PreviewRow k="Nombre" v={preview.nombre} />
                <PreviewRow k="Banco" v={preview.banco} />
                <PreviewRow k="Saldo en pesos" v={fmtARS(preview.saldoActual)} mono tone="neg" />
                <PreviewRow k="Vencimiento" v={preview.vencimiento} mono />
                <PreviewRow k="Pago mínimo" v={fmtARS(preview.pagoMinimo)} mono />
                <PreviewRow
                  k="Saldo en dólares"
                  v={preview.saldoDolares != null ? fmtUSD(preview.saldoDolares) : '—'}
                  mono
                />
                {preview.cuotasAVencer.length > 0 && (
                  <div className="px-3 py-2.5">
                    <span className="eyebrow block mb-1.5">
                      Cuotas a vencer · {preview.cuotasAVencer.length}
                    </span>
                    <ul className="divide-y divide-rule-soft">
                      {preview.cuotasAVencer.map((c) => (
                        <li
                          key={c.mes}
                          className="flex justify-between py-1.5 text-[12.5px]"
                        >
                          <span className="text-ink-soft capitalize">{fmtMes(c.mes)}</span>
                          <span className="font-mono text-ink">
                            <span className="peso">$</span>
                            {fmtNum(c.total)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {importError && (
                <div className="px-3 py-2.5 bg-neg-bg border-l-2 border-neg rounded-r-sm">
                  <span className="text-[12.5px] text-neg">{importError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-rule">
                <button
                  className="h-9 px-3.5 text-[13px] text-ink-mute hover:text-ink transition-colors"
                  onClick={() => setStep('input')}
                >
                  ← Volver
                </button>
                <button
                  onClick={handleConfirmar}
                  className="h-9 px-4 text-[13px] font-medium bg-teal text-paper hover:bg-ink rounded-md transition-colors"
                >
                  Guardar resumen
                </button>
              </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="py-12 flex flex-col items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-teal animate-pulse" />
              <p className="serif text-[15px] text-ink">Guardando…</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PreviewRow({
  k,
  v,
  mono,
  tone,
}: {
  k: string;
  v: string;
  mono?: boolean;
  tone?: 'neg' | 'pos' | 'warn' | 'ink';
}) {
  const toneClass =
    tone === 'neg' ? 'text-neg'
    : tone === 'pos' ? 'text-pos'
    : tone === 'warn' ? 'text-warn'
    : 'text-ink';
  return (
    <div className="grid grid-cols-2 px-3 py-2.5">
      <span className="eyebrow self-center">{k}</span>
      <span
        className={`text-right text-[13px] ${mono ? 'font-mono' : ''} ${toneClass}`}
      >
        {v}
      </span>
    </div>
  );
}
