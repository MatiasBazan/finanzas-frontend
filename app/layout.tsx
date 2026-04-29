import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Finanzas',
  description: 'Control de gastos, tarjetas y deudas personales',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jetbrainsMono.variable} ${sourceSerif.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
 
