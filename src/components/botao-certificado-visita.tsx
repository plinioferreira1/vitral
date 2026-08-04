"use client";

import { useState } from "react";
import { gerarCertificadoPNG, type AssinaturaCertificado } from "@/lib/canvas-certificado";

function brl(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function BotaoCertificadoVisita({
  imovelEndereco,
  clienteNome,
  valorImovel,
  corretorNome,
  multaPercentual,
  assinatura,
}: {
  imovelEndereco: string;
  clienteNome: string;
  valorImovel: number | null;
  corretorNome: string | null;
  multaPercentual: number;
  assinatura: AssinaturaCertificado;
}) {
  const [gerando, setGerando] = useState(false);

  async function baixar() {
    setGerando(true);
    try {
      await gerarCertificadoPNG({
        titulo: "Termo de Visita de Imóvel",
        subtitulo: `${imovelEndereco} — ${clienteNome}`,
        paragrafos: [
          `Declaro que, nesta data, conheci, visitei e obtive as informações necessárias à aquisição do imóvel situado em ${imovelEndereco} (valor: ${brl(valorImovel)}), por intermédio d${corretorNome ? `o(a) corretor(a) ${corretorNome}` : "e corretor(a)"}, ligado(a) à Sacra Netimóveis.`,
          `Comprometo-me a não efetivar a aquisição do imóvel acima relacionado através de outro intermediário ou diretamente do(a) proprietário(a); sob pena de pagar à Sacra Netimóveis o valor de ${multaPercentual}% (a título de multa) sobre o valor do imóvel, pelo descumprimento desta obrigação. Caso o negócio seja viabilizado por intermédio da Sacra Netimóveis, nada além do já pactuado será devido.`,
          `Assinatura eletrônica simples, com validade jurídica nos termos do art. 10, §2º, da MP 2.200-2/2001.`,
        ],
        assinaturas: [assinatura],
        nomeArquivo: "termo-visita",
      });
    } finally {
      setGerando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={baixar}
      disabled={gerando}
      className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-background disabled:opacity-60"
    >
      {gerando ? "Gerando..." : "Baixar certificado (imagem)"}
    </button>
  );
}
