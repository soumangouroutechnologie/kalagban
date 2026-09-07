import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastContext";
import { TelemetryErrorBoundary, TelemetryInitializer } from "@/components/TelemetryErrorBoundary";

export const metadata: Metadata = {
  title: "Point Relais Kalagban - Portal Partenaire",
  description: "Espace de gestion des colis et remises en Point Relais Kalagban",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased bg-[#f8fafc] text-gray-900 min-h-screen" suppressHydrationWarning>
        <TelemetryErrorBoundary appName="web-relay">
          <TelemetryInitializer appName="web-relay" />
          <ToastProvider>
            {children}
          </ToastProvider>
        </TelemetryErrorBoundary>
      </body>
    </html>
  );
}
