import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { ToastProvider } from "@/context/ToastContext";
import CartDrawer from "@/components/CartDrawer";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Kalagban - Le Marché des Meilleurs Commerçants",
  description: "Achetez les meilleurs produits en ligne en Côte d'Ivoire. Livraison rapide, paiement par Mobile Money ou à la livraison.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 font-sans">
        <ToastProvider>
          <FavoritesProvider>
            <CartProvider>
              {children}
              <CartDrawer />
            </CartProvider>
          </FavoritesProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
