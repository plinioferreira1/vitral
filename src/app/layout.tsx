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
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-ink">{children}</body>
    </html>
  );
}
