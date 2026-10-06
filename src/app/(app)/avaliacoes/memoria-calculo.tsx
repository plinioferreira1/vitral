"use client";

import { useState } from "react";
import { SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { gerarMemoriaAvaliacaoPNG, type DadosMemoriaAvaliacao } from "@/lib/canvas-memoria-avaliacao";

export function MemoriaCalculo({ dados }: { dados: DadosMemoriaAvaliacao }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  async function baixar() {
    setOcupado(true);
    setErro("");
    try { await gerarMemoriaAvaliacaoPNG(dados); }
    catch { setErro("Não foi possível gerar a imagem. Tente novamente."); }
    finally { setOcupado(false); }
  }
  return <div className="mt-4 space-y-2">
    <button type="button" onClick={baixar} disabled={ocupado} className={SECONDARY_BUTTON_CLASS}>
      {ocupado ? "Gerando imagem…" : "Baixar memória de cálculo (rascunho)"}
    </button>
    {erro && <p role="alert" className="text-sm text-rose-700">{erro}</p>}
  </div>;
}
