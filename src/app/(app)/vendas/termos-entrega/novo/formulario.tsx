"use client";

import { useState, type ReactNode } from "react";
import { enviarTermo } from "@/lib/termo-entrega/envio";


export function FormularioCriarTermo({ solicitacaoId, processoId, children }: { solicitacaoId: string; processoId?: string; children: ReactNode }) {
  const [erro, setErro] = useState<string | null>(null);
  const [idEnvio] = useState(solicitacaoId);
  return <form action={async (dados) => {
    setErro(null);
    try { dados.set("acao", "criarTermo"); const r = await enviarTermo(dados); if (r.ok && r.destino) window.location.assign(r.destino); else setErro(r.erro ?? "Não foi possível confirmar a criação."); }
    catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível confirmar a criação. Confira sua conexão e tente novamente."); }
  }}>
    <input type="hidden" name="solicitacao_id" value={idEnvio} />
    {processoId && <input type="hidden" name="processo_id" value={processoId} />}
    {children}
    {erro && <p role="alert" className="mt-2 max-w-sm text-xs text-rose-700">{erro}</p>}
  </form>;
}
