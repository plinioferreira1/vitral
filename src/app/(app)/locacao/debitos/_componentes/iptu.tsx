import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import type { PermissoesDebitos } from "@/lib/debitos/permissoes";
import { rotuloCompetencia } from "@/lib/debitos/regras";
import { inscricaoParaCopiar } from "@/lib/debitos/tributos";
import { acaoEmLote } from "../actions";
import type { DadosPainel } from "../dados";
import { SeloStatus, hrefPainel } from "./ui";

const BOTAO_PEQUENO = "inline-flex items-center justify-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-background hover:text-ink";

export function Iptu({
  dados,
  competencia,
  params,
  urlIptu,
  perms,
}: {
  dados: DadosPainel;
  competencia: string;
  params: Record<string, string | undefined>;
  urlIptu: string;
  perms: PermissoesDebitos;
}) {
  const linhas = dados.linhas;
  const semInscricao = linhas.filter((l) => !l.inscricao).length;
  const semConferencia = linhas.every((l) => !l.iptu);

  return (
    <div className="space-y-4">
      <div className={`${CARD_CLASS} space-y-1 p-4 text-sm`}>
        <p className="font-semibold text-ink">IPTU/TLP — {rotuloCompetencia(competencia)}</p>
        <p className="text-xs text-ink-muted">
          Consulta assistida: copie a inscrição, clique em &ldquo;Consultar&rdquo; para abrir o serviço oficial da Receita do DF em outra aba e depois registre o resultado. O Vitral não acessa o site da Receita nem consulta
          nada sozinho.
        </p>
        {semInscricao > 0 && <p className="text-xs text-amber-800">{semInscricao} imóvel(is) sem inscrição cadastrada.</p>}
        {semConferencia && <p className="text-xs text-amber-800">Não há conferência de IPTU/TLP gerada para esta competência (veja a periodicidade em Configurações).</p>}
      </div>

      <ul className="space-y-3">
        {linhas.map((l) => {
          const inscricao = inscricaoParaCopiar(l.inscricao);
          return (
            <li key={l.contratoId} className={`${CARD_CLASS} flex flex-wrap items-center gap-x-4 gap-y-3 p-4`}>
              <div className="min-w-0 flex-1 basis-56">
                <Link href={hrefPainel({ mes: params.mes, aba: "iptu" }, { detalhe: l.contratoId })} scroll={false} className="font-medium text-ink hover:text-brand hover:underline">
                  {l.imovel}
                </Link>
                <p className="truncate text-xs text-ink-muted">{l.inquilino ?? "—"}</p>
              </div>
              <div className="basis-40">
                <p className="text-[11px] text-ink-muted">Inscrição no DF</p>
                <p className="num text-sm font-semibold text-ink">{l.inscricao ?? "Não cadastrada"}</p>
              </div>
              <SeloStatus status={l.iptu?.status} completo />
              <div className="flex flex-wrap items-center gap-2">
                {inscricao && <BotaoCopiarLink texto={inscricao} rotulo="Copiar inscrição" />}
                <a href={urlIptu} target="_blank" rel="noopener noreferrer" className={BOTAO_PEQUENO}>
                  Consultar IPTU/TLP <ExternalLink size={12} />
                </a>
                {perms.operar && l.iptu?.status === "pendente" && (
                  <form action={acaoEmLote}>
                    <input type="hidden" name="competencia" value={competencia} />
                    <input type="hidden" name="contratos" value={l.contratoId} />
                    <input type="hidden" name="acao" value="iptu_sem_debito" />
                    <BotaoEnviar className={BOTAO_PEQUENO} textoEnviando="Salvando…">
                      Sem débito
                    </BotaoEnviar>
                  </form>
                )}
                <Link href={hrefPainel({ mes: params.mes, aba: "iptu" }, { detalhe: l.contratoId })} scroll={false} className={BOTAO_PEQUENO}>
                  Registrar resultado
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      {linhas.length === 0 && <div className={`${CARD_CLASS} px-6 py-10 text-center text-sm text-ink-muted`}>Nenhum contrato de locação ativo.</div>}
      <p className="text-xs text-ink-muted">
        Serviço oficial utilizado:{" "}
        <a href={urlIptu} target="_blank" rel="noopener noreferrer" className={`${SECONDARY_BUTTON_CLASS} !inline !border-0 !bg-transparent !p-0 underline`}>
          {urlIptu}
        </a>
      </p>
    </div>
  );
}
