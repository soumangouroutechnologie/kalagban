import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/context/ToastContext";

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
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
