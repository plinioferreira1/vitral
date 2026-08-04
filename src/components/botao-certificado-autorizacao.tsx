"use client";

import { useState } from "react";
import { gerarCertificadoPNG, type AssinaturaCertificado } from "@/lib/canvas-certificado";

function brl(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function BotaoCertificadoAutorizacao({
  imovelEndereco,
  vendedorNome,
  valorImovel,
  comissaoPercentual,
  prazoDias,
  exclusividade,
  foro,
  assinaturas,
}: {
  imovelEndereco: string;
  vendedorNome: string;
  valorImovel: number | null;
  comissaoPercentual: number | null;
  prazoDias: number | null;
  exclusividade: boolean;
  foro: string;
  assinaturas: AssinaturaCertificado[];
}) {
  const [gerando, setGerando] = useState(false);

  async function baixar() {
    setGerando(true);
    try {
      await gerarCertificadoPNG({
        titulo: "Autorização de Venda de Imóvel",
        subtitulo: `${imovelEndereco} — ${vendedorNome}`,
        paragrafos: [
          `Pela presente autorização para venda de imóvel, o(a) proprietário(a) ${vendedorNome} autoriza a SACRA Soluções Imobiliárias, CNPJ 30.577.408/0001-91 e CRECI J. 24.788/DF, a intermediar a venda do imóvel situado em ${imovelEndereco}, pelo valor de anúncio de ${brl(valorImovel)}, em regime ${exclusividade ? "COM exclusividade" : "SEM exclusividade"}, pelo prazo de ${prazoDias ?? "—"} dias.`,
          `A comissão devida à Sacra Netimóveis em caso de venda concretizada será de ${comissaoPercentual ?? "—"}% sobre o valor efetivo da venda, nos termos e condições completos apresentados no momento da assinatura.`,
          `Assinatura eletrônica simples, com validade jurídica nos termos do art. 10, §2º, da MP 2.200-2/2001. Foro eleito: ${foro}.`,
        ],
        assinaturas,
        nomeArquivo: "autorizacao-venda",
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
