import { PainelLancamentos } from "../painel-lancamentos";
import { ComissoesSacraPrevistas } from "./comissoes-sacra-previstas";

export default async function ContasAReceberPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    referencia?: string;
    categoria?: string;
    pessoa?: string;
    conta_bancaria?: string;
    unidade?: string;
    competencia?: string;
    q?: string;
    ordenar?: string;
    direcao?: string;
    pagina?: string;
    por_pagina?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <div className="space-y-6">
      <ComissoesSacraPrevistas />
      <PainelLancamentos tipo="receita" searchParams={params} />
    </div>
  );
}
