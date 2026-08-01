import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vitral | Sacra Netimóveis",
  description: "Gestão de processos e prazos da imobiliária",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-ink">{children}</body>
    </html>
  );
}
