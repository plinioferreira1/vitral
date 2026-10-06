import { redirect } from "next/navigation";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { hojeISO } from "@/lib/data-br";
import { REGIMES, ROTULO_REGIME, dataBR } from "@/lib/ferias/regras";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { adicionarAjusteFerias, salvarColaboradorFerias } from "../actions";
import { acessoFerias, carregarEquipe, saldoTotal, saldosDe } from "../dados";
import { NavFerias, ROTULO } from "../ui";

export default async function CadastroFeriasPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const acesso = await acessoFerias(supabase, user.id, usuario.nivel_acesso);
  if (!acesso.liberado) redirect("/");
  if (!acesso.administrador) redirect("/ferias");
  const hoje = hojeISO();
  const e = await carregarEquipe(supabase);
  const cadastroDe = new Map(e.cadastros.map((c) => [c.usuario_id, c]));
  const departamentos = [...new Set(e.cadastros.map((c) => c.departamento).filter(Boolean))] as string[];
  const semCadastro = e.pessoas.filter((p) => !cadastroDe.get(p.id)?.participa).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Cadastro de férias</h1>
        <p className="mt-1 text-sm text-ink-muted">Quem tem direito a férias, desde quando, e quem analisa os pedidos de cada pessoa.</p>
      </div>
      <NavFerias acesso={acesso} atual="cadastro" />
      {semCadastro > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          {semCadastro} pessoa(s) ainda sem cadastro de férias. Só quem estiver marcado como “tem direito a férias”, com data de admissão, consegue solicitar. Se a pessoa já tirou férias antes do Vitral, lance um ajuste de saldo.
        </p>
      )}
      <datalist id="departamentos">
        {["Vendas", "Financiamento", "Locação", "Administrativo", "Marketing", ...departamentos].filter((v, i, l) => l.indexOf(v) === i).map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>

      <ul className="space-y-3">
        {e.pessoas.map((p) => {
          const c = cadastroDe.get(p.id) ?? null;
          const saldos = saldosDe(c, e.solicitacoes, e.ajustes, hoje);
          const ajustes = e.ajustes.filter((a) => a.usuario_id === p.id);
          return (
            <li key={p.id} className={`${CARD_CLASS} p-4`}>
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{p.nome}</span>
                    <span className="block text-xs text-ink-muted">
                      {c?.participa
                        ? `${ROTULO_REGIME[c.regime as keyof typeof ROTULO_REGIME]} · admissão ${dataBR(c.data_admissao)} · ${c.departamento ?? "sem departamento"} · analisa: ${c.gestor_id ? (e.nomes.get(c.gestor_id) ?? "—") : "diretoria"}`
                        : "Sem direito a férias cadastrado"}
                    </span>
                  </span>
                  {c?.participa && <span className="num rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">{saldoTotal(saldos)} dias de saldo</span>}
                </summary>

                <form action={salvarColaboradorFerias} className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
                  <input type="hidden" name="usuario_id" value={p.id} />
                  <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2 lg:col-span-3">
                    <input type="checkbox" name="participa" defaultChecked={c?.participa ?? false} className="accent-brand" /> Tem direito a férias (pode solicitar pelo Vitral)
                  </label>
                  <label className="block">
                    <span className={ROTULO}>Data de admissão</span>
                    <input type="date" name="data_admissao" defaultValue={c?.data_admissao ?? ""} max={hoje} className={INPUT_CLASS} />
                  </label>
                  <label className="block">
                    <span className={ROTULO}>Vínculo</span>
                    <select name="regime" defaultValue={c?.regime ?? "clt"} className={INPUT_CLASS}>
                      {REGIMES.map((r) => (
                        <option key={r} value={r}>
                          {ROTULO_REGIME[r]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={ROTULO}>Dias por período</span>
                    <input type="number" name="dias_por_periodo" min={1} max={60} defaultValue={c?.dias_por_periodo ?? 30} className={`${INPUT_CLASS} num`} />
                  </label>
                  <label className="block">
                    <span className={ROTULO}>Departamento</span>
                    <input name="departamento" list="departamentos" defaultValue={c?.departamento ?? ""} className={INPUT_CLASS} />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className={ROTULO}>Quem analisa as férias</span>
                    <select name="gestor_id" defaultValue={c?.gestor_id ?? ""} className={INPUT_CLASS}>
                      <option value="">Diretoria / gerência</option>
                      {e.pessoas
                        .filter((g) => g.id !== p.id)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nome}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="block sm:col-span-2 lg:col-span-3">
                    <span className={ROTULO}>Observações</span>
                    <input name="observacoes" defaultValue={c?.observacoes ?? ""} className={INPUT_CLASS} />
                  </label>
                  <div>
                    <BotaoEnviar className={SECONDARY_BUTTON_CLASS}>Salvar cadastro</BotaoEnviar>
                  </div>
                </form>

                {c?.participa && saldos.length > 0 && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="mb-2 text-xs font-semibold text-ink">Saldo por período</p>
                    <ul className="space-y-1 text-xs text-ink-muted">
                      {saldos.map((s) => (
                        <li key={s.inicio} className="num">
                          {s.rotulo}: {s.adquirido ? `${s.disponivel} disponíveis · ${s.utilizados} usados${s.emAnalise ? ` · ${s.emAnalise} em análise` : ""} · usar até ${dataBR(s.limite)}` : "em aquisição"}
                        </li>
                      ))}
                    </ul>
                    <form action={adicionarAjusteFerias} className="mt-3 grid gap-3 sm:grid-cols-[1.3fr_0.7fr_1.6fr_auto] sm:items-end">
                      <input type="hidden" name="usuario_id" value={p.id} />
                      <label className="block">
                        <span className={ROTULO}>Ajuste de saldo — período</span>
                        <select name="periodo_inicio" className={INPUT_CLASS}>
                          {saldos.map((s) => (
                            <option key={s.inicio} value={s.inicio}>
                              {s.rotulo}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className={ROTULO}>Dias já usados</span>
                        <input type="number" name="dias" min={-60} max={60} required placeholder="Ex.: 30" className={`${INPUT_CLASS} num`} />
                      </label>
                      <label className="block">
                        <span className={ROTULO}>Motivo</span>
                        <input name="motivo" required placeholder="Ex.: férias tiradas antes do Vitral" className={INPUT_CLASS} />
                      </label>
                      <BotaoEnviar className={SECONDARY_BUTTON_CLASS}>Lançar</BotaoEnviar>
                    </form>
                    <p className="mt-1 text-[11px] text-ink-muted">Número positivo reduz o saldo; negativo devolve dias. O lançamento fica registrado com seu nome.</p>
                    {ajustes.length > 0 && (
                      <ul className="mt-2 space-y-1 text-[11px] text-ink-muted">
                        {ajustes.map((a) => (
                          <li key={a.id}>
                            {dataBR(a.criado_em.slice(0, 10))} · período iniciado em {dataBR(a.periodo_inicio)} · {a.dias > 0 ? `−${a.dias}` : `+${-a.dias}`} dia(s) · {a.motivo} · {a.criado_por_nome ?? "—"}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
