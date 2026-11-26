"use client";

import { useState } from "react";
import { CampoMoeda } from "@/components/campo-moeda";
import { INPUT_CLASS } from "@/components/ui/styles";
import { CAUCAO, GARANTIAS_LOCACAO } from "@/lib/locacao/garantias";

/** Lista de garantias; quando é caução, aparece o campo do valor (com máscara). */
export function CampoGarantia({ garantia, caucaoCentavos }: { garantia: string | null; caucaoCentavos: number | null }) {
  const inicial = garantia && (GARANTIAS_LOCACAO as readonly string[]).includes(garantia) ? garantia : "";
  const [escolha, setEscolha] = useState(inicial);
  return (
    <>
      <label className="text-xs font-medium text-ink-muted">
        Garantia locatícia
        <select name="garantia_locaticia" value={escolha} onChange={(e) => setEscolha(e.target.value)} className={`${INPUT_CLASS} mt-1`}>
          <option value="">Não informada</option>
          {GARANTIAS_LOCACAO.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </label>
      {escolha === CAUCAO ? (
        <label className="text-xs font-medium text-ink-muted">
          Valor da caução
          <span className="mt-1 block">
            <CampoMoeda name="caucao_valor" defaultValue={caucaoCentavos ? caucaoCentavos / 100 : null} className={`${INPUT_CLASS} w-full`} />
          </span>
        </label>
      ) : (
        <div aria-hidden="true" className="hidden sm:block" />
      )}
    </>
  );
}
