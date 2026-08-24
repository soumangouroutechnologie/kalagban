import type { Metadata } from "next";
import "./globals.css";
import AdminLayoutWrapper from "@/components/AdminLayoutWrapper";
import { ToastProvider } from "@/context/ToastContext";

export const metadata: Metadata = {
  title: "Kalagban — Panneau Administrateur Back-Office",
  description: "Plateforme d'administration globale et gestion des vendeurs Kalagban.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-x-hidden">
        <ToastProvider>
          <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
        </ToastProvider>
      </body>
    </html>
  );
}
