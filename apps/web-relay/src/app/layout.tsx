import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
