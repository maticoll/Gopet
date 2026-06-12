import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const viewport: Viewport = {
  themeColor: "#FDF5E8",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "GoPet | Tu Ración Al Instante",
  description:
    "Alimento para mascotas con envío gratis a domicilio. Mejores precios, seguimiento personalizado y atención directa. Uruguay.",
  openGraph: {
    title: "GoPet | Tu Ración Al Instante",
    description:
      "Alimento para mascotas con envío gratis. Pedí por WhatsApp, recibís en tu puerta.",
    type: "website",
    locale: "es_UY",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
