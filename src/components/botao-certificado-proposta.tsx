"use client";

import { useState } from "react";
import { gerarCertificadoPNG, type AssinaturaCertificado } from "@/lib/canvas-certificado";

function brl(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function BotaoCertificadoProposta({
  imovelEndereco,
  proponenteNome,
  valorTotal,
  prazoDiasValidade,
  condicoes,
  assinaturas,
}: {
  imovelEndereco: string;
  proponenteNome: string;
  valorTotal: number | null;
  prazoDiasValidade: number | null;
  condicoes: { descricao: string; valor: number | null }[];
  assinaturas: AssinaturaCertificado[];
}) {
  const [gerando, setGerando] = useState(false);

  async function baixar() {
    setGerando(true);
    try {
      const listaCondicoes = condicoes
        .map((c) => `${c.descricao} — ${brl(c.valor)}`)
        .join("; ");

      await gerarCertificadoPNG({
        titulo: "Carta Proposta de Compra de Imóvel",
        subtitulo: `${imovelEndereco} — ${proponenteNome}`,
        paragrafos: [
          `Eu, ${proponenteNome}, venho por meio desta formalizar proposta de compra do imóvel localizado em ${imovelEndereco}, pelo valor total de ${brl(valorTotal)}, nas seguintes condições de pagamento: ${listaCondicoes || "a combinar"}.`,
          `A presente proposta é válida pelo prazo de ${prazoDiasValidade ?? "—"} dias úteis, contados a partir da data desta carta. Declaro estar ciente de que esta proposta está sujeita à aceitação do proprietário e, se for o caso, à aprovação de crédito junto à instituição financeira responsável pelo financiamento.`,
          `Assinatura eletrônica simples, com validade jurídica nos termos do art. 10, §2º, da MP 2.200-2/2001. Representado por: Sacra Imóveis.`,
        ],
        assinaturas,
        nomeArquivo: "carta-proposta",
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
