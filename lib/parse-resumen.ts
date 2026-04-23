export interface ResumenTarjeta {
  nombre: string;
  banco: string;
  saldoActual: number;
  saldoDolares: number | null;
  vencimiento: string;
  pagoMinimo: number;
  cierreActual: string | null;
  cuotasAVencer: { mes: string; total: number }[];
}

export async function parsearResumenPDF(file: File): Promise<ResumenTarjeta> {
  const token = localStorage.getItem('token');

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3000/tarjetas/parsear-pdf', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
    // NO agregar Content-Type — el browser lo setea solo con el boundary
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error al parsear el PDF: ${error}`);
  }

  return response.json();
}
