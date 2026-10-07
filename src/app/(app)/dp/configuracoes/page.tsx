import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ContextoConfiguracao } from "@/components/contexto-configuracao";
import { redirect } from "next/navigation";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { formatarDataHoraBR } from "@/lib/data-br";
import { DIAS_SEMANA, cargaSemanalHoras } from "@/lib/dp/ponto";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { salvarConfigDP } from "../actions";
import { acessoDP } from "../dados";
import { ROTULO } from "../ui";

const REGIMES: [string, string][] = [
  ["clt", "Férias pela CLT (abono e 13º)"],
  ["estagio", "Estágio (recesso, sem abono)"],
  ["pj", "PJ / prestador (sem abono)"],
  ["outro", "Outro (sem abono)"],
];

export default async function ConfiguracoesDPPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const acesso = await acessoDP(supabase, user.id, usuario.nivel_acesso);
  if (!acesso.liberado || !acesso.perms.administrador) redirect("/dp");
  const c = acesso.config;
  const { data: eventos } = await supabase.from("dp_eventos").select("id, descricao, usuario_nome, criado_em, justificativa").order("criado_em", { ascending: false }).limit(40);
  const lista = (rotulo: string, nome: string, valores: string[], dica?: string) => (
    <label className="block">
      <span className={ROTULO}>{rotulo}</span>
      <textarea name={nome} rows={Math.min(8, Math.max(3, valores.length + 1))} defaultValue={valores.join("\n")} className={INPUT_CLASS} />
      <span className="mt-1 block text-[11px] text-ink-muted">{dica ?? "Um por linha."}</span>
    </label>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <ContextoConfiguracao />
      <CabecalhoPagina titulo="Configurações do Departamento Pessoal" descricao={<> Listas do cadastro e regras de ponto e férias. Nada disso fica fixo no sistema. </>} />

      <form action={salvarConfigDP} className={`${CARD_CLASS} space-y-6 p-4 sm:p-6`}>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Departamento Pessoal</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {lista("Empresas", "empresas", c.empresas)}
            {lista("Departamentos", "departamentos", c.departamentos)}
            {lista("Cargos", "cargos", c.cargos, "Um por linha. Aparecem como sugestão na ficha.")}
            {lista("Tipos de documento", "tipos_documento", c.tiposDocumento)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className={ROTULO}>Tipos de vínculo</span>
              <div className="space-y-2">
                {[...c.vinculos, { nome: "", regime: "outro" }, { nome: "", regime: "outro" }].map((v, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1.2fr] gap-2">
                    <input name={`vinculo_nome_${i}`} defaultValue={v.nome} placeholder="Novo vínculo" className={INPUT_CLASS} />
                    <select name={`vinculo_valor_${i}`} defaultValue={v.regime} className={INPUT_CLASS}>
                      {REGIMES.map(([valor, rotulo]) => (
                        <option key={valor} value={valor}>
                          {rotulo}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <span className="mt-1 block text-[11px] text-ink-muted">Apague o nome para remover.</span>
            </div>
            <div>
              <span className={ROTULO}>Tipos de ausência</span>
              <div className="space-y-2">
                {[...c.tiposAusencia, { nome: "", abona: true }, { nome: "", abona: true }].map((t, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1.2fr] gap-2">
                    <input name={`ausencia_nome_${i}`} defaultValue={t.nome} placeholder="Novo tipo" className={INPUT_CLASS} />
                    <select name={`ausencia_valor_${i}`} defaultValue={t.abona ? "abona" : "falta"} className={INPUT_CLASS}>
                      <option value="abona">Não gera falta</option>
                      <option value="falta">Conta como falta</option>
                    </select>
                  </div>
                ))}
              </div>
              <span className="mt-1 block text-[11px] text-ink-muted">“Não gera falta”: o dia fica sem horas a cumprir no ponto.</span>
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-ink">Ponto</h2>
          <p className="text-xs text-ink-muted">Jornada padrão (vale para quem não tem jornada própria na ficha) — hoje {cargaSemanalHoras(c.jornada)} h por semana.</p>
          <div className="flex flex-wrap gap-3">
            {DIAS_SEMANA.map((d, i) => (
              <label key={d} className="inline-flex items-center gap-1.5 text-sm text-ink">
                <input type="checkbox" name="jornada_dias" value={i} defaultChecked={c.jornada.dias.includes(i)} className="accent-brand" /> {d}
              </label>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className={ROTULO}>Entrada</span>
              <input type="time" name="jornada_entrada" defaultValue={c.jornada.entrada} className={INPUT_CLASS} />
            </label>
            <label className="block">
              <span className={ROTULO}>Saída</span>
              <input type="time" name="jornada_saida" defaultValue={c.jornada.saida} className={INPUT_CLASS} />
            </label>
            <label className="block">
              <span className={ROTULO}>Intervalo (minutos)</span>
              <input type="number" name="jornada_intervalo" min={0} max={240} defaultValue={c.jornada.intervalo_min} className={`${INPUT_CLASS} num`} />
            </label>
            <label className="block">
              <span className={ROTULO}>Tolerância diária (minutos)</span>
              <input type="number" name="tolerancia_min" min={0} max={120} defaultValue={c.toleranciaMin} className={`${INPUT_CLASS} num`} />
              <span className="mt-1 block text-[11px] text-ink-muted">Diferenças até esse valor não contam como atraso nem como extra.</span>
            </label>
            <label className="block">
              <span className={ROTULO}>Limite de hora extra por dia (minutos)</span>
              <input type="number" name="hora_extra_limite_diario_min" min={0} max={600} defaultValue={c.horaExtraLimiteDiarioMin} className={`${INPUT_CLASS} num`} />
              <span className="mt-1 block text-[11px] text-ink-muted">Acima disso o dia é sinalizado para conferência.</span>
            </label>
            <label className="flex items-start gap-2 self-center text-sm text-ink">
              <input type="checkbox" name="banco_horas_ativo" defaultChecked={c.bancoHorasAtivo} className="mt-1 accent-brand" />
              <span>
                Banco de horas ligado
                <span className="block text-[11px] text-ink-muted">Desligado: mostra só as horas extras do mês, sem saldo acumulado.</span>
              </span>
            </label>
          </div>
          <p className="text-[11px] text-ink-muted">Mudar jornada ou tolerância recalcula o espelho e o banco de horas de todos, inclusive dos meses anteriores.</p>
        </section>

        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-ink">Férias e alertas</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={ROTULO}>Antecedência recomendada para pedir férias (dias)</span>
              <input type="number" name="ferias_antecedencia_dias" min={0} max={180} defaultValue={c.feriasAntecedenciaDias} className={`${INPUT_CLASS} num`} />
            </label>
            <label className="block">
              <span className={ROTULO}>Avisar o colaborador quantos dias antes das férias</span>
              <input type="number" name="ferias_aviso_proximas_dias" min={1} max={60} defaultValue={c.feriasAvisoProximasDias} className={`${INPUT_CLASS} num`} />
            </label>
            <label className="block">
              <span className={ROTULO}>Alertar férias perto de vencer com quantos dias</span>
              <input type="number" name="ferias_alerta_vencimento_dias" min={0} max={365} defaultValue={c.feriasAlertaVencimentoDias} className={`${INPUT_CLASS} num`} />
            </label>
            <label className="block">
              <span className={ROTULO}>Alertar documentos vencendo com quantos dias</span>
              <input type="number" name="documentos_alerta_dias" min={1} max={365} defaultValue={c.documentosAlertaDias} className={`${INPUT_CLASS} num`} />
            </label>
          </div>
        </section>

        <BotaoEnviar className={PRIMARY_BUTTON_CLASS}>Salvar configurações</BotaoEnviar>
      </form>

      <section className={`${CARD_CLASS} p-4 sm:p-5`}>
        <h2 className="mb-3 text-sm font-semibold text-ink">Auditoria recente do Departamento Pessoal</h2>
        {(eventos ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum registro ainda.</p>
        ) : (
          <ol className="space-y-2.5">
            {(eventos ?? []).map((e) => (
              <li key={e.id} className="border-l-2 border-border pl-3 text-xs">
                <p className="text-ink">{e.descricao}</p>
                {e.justificativa && <p className="text-ink-muted">“{e.justificativa}”</p>}
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
