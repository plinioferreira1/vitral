import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import type { PermissoesDebitos } from "@/lib/debitos/permissoes";
import { ASSUNTO_PADRAO, MODELO_PADRAO, PERIODICIDADES, ROTULO_PERIODICIDADE, VARIAVEIS_MODELO } from "@/lib/debitos/regras";
import type { ConfigDebitos } from "@/lib/debitos/rotina";
import { URL_CONSULTA_IPTU_DF } from "@/lib/debitos/tributos";
import { formatarDataHoraBR } from "@/lib/data-br";
import type { Tables } from "@/lib/database.types";
import { salvarConfigDebitos } from "../actions";
import { ROTULO } from "./ui";

export function Configuracoes({ config, eventos, perms }: { config: ConfigDebitos; eventos: Tables<"debitos_eventos">[]; perms: PermissoesDebitos }) {
  const bloqueado = !perms.configurar;
  return (
    <div className="space-y-5">
      <form action={salvarConfigDebitos} className={`${CARD_CLASS} space-y-5 p-4 sm:p-5`}>
        <fieldset disabled={bloqueado} className="space-y-5">
          {bloqueado && <p className="text-xs text-ink-muted">Somente a diretoria e a gerência alteram estas configurações.</p>}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-ink">Geração mensal das conferências</h3>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" name="geracao_automatica" defaultChecked={config.geracao_automatica} className="mt-1" />
              <span>Gerar automaticamente as conferências de todos os imóveis com contrato ativo (nunca duplica imóvel + tipo + competência)</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className={ROTULO}>Dia do mês da geração</span>
                <input name="dia_geracao" type="number" min={1} max={28} defaultValue={config.dia_geracao} className={INPUT_CLASS} />
              </label>
              <label className="block">
                <span className={ROTULO}>Periodicidade — condomínio</span>
                <select name="periodicidade_condominio_meses" defaultValue={config.periodicidade_condominio_meses} className={INPUT_CLASS}>
                  {PERIODICIDADES.map((p) => (
                    <option key={p} value={p}>
                      {ROTULO_PERIODICIDADE[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={ROTULO}>Periodicidade — IPTU/TLP</span>
                <select name="periodicidade_iptu_meses" defaultValue={config.periodicidade_iptu_meses} className={INPUT_CLASS}>
                  {PERIODICIDADES.map((p) => (
                    <option key={p} value={p}>
                      {ROTULO_PERIODICIDADE[p]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="space-y-3 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-ink">E-mail de solicitação às administradoras</h3>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" name="envio_automatico" defaultChecked={config.envio_automatico} className="mt-1" />
              <span>
                Envio automático mensal — o Vitral envia sozinho, a partir do dia escolhido, um e-mail por administradora consultada por e-mail.
                <span className="block text-xs text-ink-muted">Desligado, os e-mails só saem quando alguém clica em &ldquo;Enviar agora&rdquo;.</span>
              </span>
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className={ROTULO}>Dia do mês do envio</span>
                <input name="dia_envio" type="number" min={1} max={28} defaultValue={config.dia_envio} className={INPUT_CLASS} />
              </label>
              <label className="block">
                <span className={ROTULO}>Alertar sem resposta após (dias)</span>
                <input name="dias_alerta_sem_resposta" type="number" min={1} max={60} defaultValue={config.dias_alerta_sem_resposta} className={INPUT_CLASS} />
              </label>
              <label className="block">
                <span className={ROTULO}>Responder para (e-mail)</span>
                <input name="email_responder_para" type="email" defaultValue={config.email_responder_para ?? ""} placeholder="locacao@…" className={INPUT_CLASS} />
              </label>
              <label className="block sm:col-span-3">
                <span className={ROTULO}>Enviar cópia para (separe por vírgula)</span>
                <input name="email_copia" defaultValue={config.email_copia ?? ""} className={INPUT_CLASS} />
              </label>
              <label className="block sm:col-span-3">
                <span className={ROTULO}>Assunto</span>
                <input name="email_assunto" defaultValue={config.email_assunto ?? ASSUNTO_PADRAO} className={INPUT_CLASS} />
              </label>
              <label className="block sm:col-span-3">
                <span className={ROTULO}>Modelo da mensagem</span>
                <textarea name="email_modelo" rows={13} defaultValue={config.email_modelo ?? MODELO_PADRAO} className={`${INPUT_CLASS} font-mono text-xs leading-relaxed`} />
                <span className="mt-1 block text-[11px] text-ink-muted">
                  Variáveis: {VARIAVEIS_MODELO.join(", ")}. A lista das unidades entra no lugar de {"{{unidades}}"}; se a variável for apagada, a lista vai no fim da mensagem.
                </span>
              </label>
            </div>
          </section>

          <section className="space-y-3 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-ink">IPTU/TLP</h3>
            <label className="block">
              <span className={ROTULO}>Endereço do serviço oficial de consulta (botão &ldquo;Consultar IPTU/TLP&rdquo;)</span>
              <input name="url_consulta_iptu" defaultValue={config.url_consulta_iptu ?? URL_CONSULTA_IPTU_DF} className={INPUT_CLASS} />
            </label>
            <p className="text-xs text-ink-muted">A consulta é sempre feita pela pessoa no site oficial. Não há consulta automática nem integração com a Receita do DF.</p>
          </section>

          {!bloqueado && <BotaoEnviar className={PRIMARY_BUTTON_CLASS}>Salvar configurações</BotaoEnviar>}
        </fieldset>
      </form>

      <section className={`${CARD_CLASS} p-4 sm:p-5`}>
        <h3 className="text-sm font-semibold text-ink">Registro de atividades (últimas {eventos.length})</h3>
        {eventos.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Nenhuma atividade registrada ainda.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {eventos.map((e) => (
              <li key={e.id} className="border-l-2 border-border pl-3 text-xs">
                <p className="text-ink">{e.descricao}</p>
                <p className="text-ink-muted">
                  {e.usuario_nome ?? "—"} · {formatarDataHoraBR(e.criado_em)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
