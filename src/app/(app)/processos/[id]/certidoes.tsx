import { ExternalLink, FileCheck2 } from "lucide-react";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { CERTIDOES, PARTES, diasParaVencer, documentoSoNumeros, resumoParte, situacaoCertidao, type Parte, type Situacao } from "@/lib/certidoes/catalogo";
import { createClient } from "@/lib/supabase/server";
import { removerCertidao } from "./certidoes-actions";
import { FormCertidao } from "./form-certidao";

const SITUACAO: Record<Situacao, { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Pendente", cor: "bg-stone-50 text-stone-600 border-stone-200" },
  vigente: { rotulo: "Nada consta", cor: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  vence_em_breve: { rotulo: "Vence em breve", cor: "bg-amber-50 text-amber-800 border-amber-200" },
  vencida: { rotulo: "Vencida", cor: "bg-rose-50 text-rose-700 border-rose-200" },
  positiva: { rotulo: "Consta algo", cor: "bg-rose-50 text-rose-700 border-rose-200" },
};

const NOME_PARTE: Record<Parte, string> = { vendedor: "Vendedor", comprador: "Comprador" };

function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function hojeSP() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

type Pessoa = { nome: string; cpf_cnpj: string | null } | null;

export async function CertidoesProcesso({ processoId }: { processoId: string }) {
  const supabase = await createClient();
  const [{ data: processo }, { data: registros }] = await Promise.all([
    supabase.from("processos").select(
      "comprador:clientes!processos_comprador_id_fkey ( nome, cpf_cnpj ), vendedor:clientes!processos_vendedor_id_fkey ( nome, cpf_cnpj )",
    ).eq("id", processoId).maybeSingle(),
    supabase.from("processo_certidoes").select("id, parte, tipo, resultado, emitida_em, valida_ate, nome_arquivo").eq("processo_id", processoId),
  ]);
  const hoje = hojeSP();
  const pessoas = { vendedor: processo?.vendedor as Pessoa, comprador: processo?.comprador as Pessoa };
  const lista = registros ?? [];
  const resumos = Object.fromEntries(PARTES.map((parte) => [parte, resumoParte(lista.filter((r) => r.parte === parte), hoje)])) as Record<Parte, ReturnType<typeof resumoParte>>;
  const atencao = PARTES.reduce((n, p) => n + resumos[p].vencida + resumos[p].vence_em_breve + resumos[p].positiva, 0);

  return (
    <details id="certidoes-processo" className="scroll-mt-20 group rounded-xl border border-border/70 bg-surface shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><FileCheck2 className="h-4 w-4 text-brand" aria-hidden /> Certidões</h2>
          <p className="mt-1 text-xs text-ink-muted">
            {PARTES.map((p) => `${NOME_PARTE[p]}: ${resumos[p].emDia} de ${resumos[p].total} em dia`).join(" · ")}
            {atencao > 0 && <span className="ml-1 font-semibold text-rose-700">· {atencao} pede{atencao === 1 ? "" : "m"} atenção</span>}
          </p>
        </div>
        <span className="text-xs font-semibold text-brand group-open:hidden">Abrir</span>
        <span className="hidden text-xs font-semibold text-brand group-open:inline">Fechar</span>
      </summary>
      <div className="border-t border-border/70 p-4 sm:p-5">
        <p className="mb-4 text-xs text-ink-muted">
          Abra o site oficial, emita a certidão com o CPF/CNPJ e anexe o arquivo aqui. O Vitral acompanha a validade; confira a data impressa no documento.
        </p>
        <div className="grid min-w-0 gap-5 xl:grid-cols-2">
          {PARTES.map((parte) => {
            const pessoa = pessoas[parte];
            const doc = documentoSoNumeros(pessoa?.cpf_cnpj);
            return (
              <section key={parte} className="min-w-0 rounded-lg border border-border/70">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-background/60 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink-muted">{NOME_PARTE[parte]}</p>
                    <p className="truncate text-sm font-semibold text-ink">{pessoa?.nome ?? "Não informado"}</p>
                    <p className="text-xs text-ink-muted tabular-nums">{pessoa?.cpf_cnpj ? `CPF/CNPJ ${pessoa.cpf_cnpj}` : "CPF/CNPJ não cadastrado"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {doc && <BotaoCopiarLink texto={doc} rotulo="Copiar CPF/CNPJ" />}
                    {pessoa?.nome && <BotaoCopiarLink texto={pessoa.nome} rotulo="Copiar nome" />}
                  </div>
                </header>
                <ul className="divide-y divide-border/60">
                  {CERTIDOES.map((c) => {
                    const r = lista.find((x) => x.parte === parte && x.tipo === c.chave);
                    const s = situacaoCertidao(r, hoje);
                    const dias = r ? diasParaVencer(r.valida_ate, hoje) : null;
                    return (
                      <li key={c.chave} className="px-3 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink">{c.orgao} · {c.nome}</p>
                            {r && (
                              <p className="mt-0.5 text-xs text-ink-muted">
                                Emitida em {dataBR(r.emitida_em)} · válida até {dataBR(r.valida_ate)}
                                {dias !== null && dias >= 0 && ` (${dias === 0 ? "vence hoje" : `${dias} dia${dias === 1 ? "" : "s"}`})`}
                              </p>
                            )}
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${SITUACAO[s].cor}`}>{SITUACAO[s].rotulo}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 font-medium text-brand hover:underline">
                            Abrir site <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          </a>
                          {r && (
                            <a href={`/processos/${processoId}/certidoes/${r.id}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-medium text-ink hover:underline">
                              Ver certidão
                            </a>
                          )}
                          {r && (
                            <form action={removerCertidao}>
                              <input type="hidden" name="processo_id" value={processoId} />
                              <input type="hidden" name="id" value={r.id} />
                              <BotaoComConfirmacao mensagem="Remover esta certidão? O arquivo será apagado." className="min-h-11 text-sm text-ink-muted hover:text-rose-700" textoEnviando="Removendo…">
                                Remover
                              </BotaoComConfirmacao>
                            </form>
                          )}
                        </div>
                        <details className="group/anexo">
                          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-brand">
                            {r ? "Substituir arquivo" : "Anexar certidão"}
                          </summary>
                          <FormCertidao processoId={processoId} parte={parte} tipo={c.chave} hoje={hoje} />
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </details>
  );
}
