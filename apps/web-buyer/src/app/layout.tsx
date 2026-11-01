import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { ToastProvider } from "@/context/ToastContext";
import CartDrawer from "@/components/CartDrawer";
import FloatingSupportButton from "@/components/FloatingSupportButton";
import { TelemetryErrorBoundary, TelemetryInitializer } from "@/components/TelemetryErrorBoundary";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Kalagban — La mode nous rassemble",
  description: "Découvrez la mode femme, homme et enfant sur Kalagban : vêtements, chaussures et accessoires en Côte d’Ivoire. Prix en FCFA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 font-sans">
        <TelemetryErrorBoundary appName="web-buyer">
          <TelemetryInitializer appName="web-buyer" />
          <ToastProvider>
            <FavoritesProvider>
              <CartProvider>
                {children}
                <CartDrawer />
                <FloatingSupportButton />
              </CartProvider>
            </FavoritesProvider>
          </ToastProvider>
        </TelemetryErrorBoundary>
      </body>
    </html>
  );
}
