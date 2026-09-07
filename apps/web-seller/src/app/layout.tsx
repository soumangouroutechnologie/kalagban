import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/context/ToastContext";
import { TelemetryErrorBoundary, TelemetryInitializer } from "@/components/TelemetryErrorBoundary";

export const metadata: Metadata = {
  title: "Kalagban - Portail Vendeur",
  description: "Gérez votre boutique et vos commandes sur Kalagban",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased overflow-hidden bg-bg-app text-text-main" suppressHydrationWarning>
        <TelemetryErrorBoundary appName="web-seller">
          <TelemetryInitializer appName="web-seller" />
          <ToastProvider>
            {children}
          </ToastProvider>
        </TelemetryErrorBoundary>
      </body>
    </html>
  );
}
