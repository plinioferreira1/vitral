import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import type { PermissoesDebitos } from "@/lib/debitos/permissoes";
import { METODOS_CONSULTA, ROTULO_METODO, type MetodoConsulta } from "@/lib/debitos/regras";
import { excluirAdministradora, salvarAdministradora } from "../actions";
import type { Administradora, DadosPainel } from "../dados";
import { ROTULO, SeloMetodo } from "./ui";

function Campos({ a }: { a?: Administradora }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {a && <input type="hidden" name="id" value={a.id} />}
      <label className="block sm:col-span-2 lg:col-span-1">
        <span className={ROTULO}>Nome *</span>
        <input name="nome" required defaultValue={a?.nome ?? ""} className={INPUT_CLASS} />
      </label>
      <label className="block">
        <span className={ROTULO}>CNPJ (opcional)</span>
        <input name="cnpj" defaultValue={a?.cnpj ?? ""} className={INPUT_CLASS} />
      </label>
      <label className="block">
        <span className={ROTULO}>Telefone</span>
        <input name="telefone" defaultValue={a?.telefone ?? ""} className={INPUT_CLASS} />
      </label>
      <label className="block">
        <span className={ROTULO}>E-mail para solicitação de débitos</span>
        <input name="email_solicitacao" type="email" defaultValue={a?.email_solicitacao ?? ""} className={INPUT_CLASS} />
      </label>
      <label className="block">
        <span className={ROTULO}>Site</span>
        <input name="site" defaultValue={a?.site ?? ""} placeholder="https://" className={INPUT_CLASS} />
      </label>
      <label className="block">
        <span className={ROTULO}>Método de consulta</span>
        <select name="metodo_consulta" defaultValue={a?.metodo_consulta ?? "email"} className={INPUT_CLASS}>
          {METODOS_CONSULTA.map((m) => (
            <option key={m} value={m}>
              {ROTULO_METODO[m]}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="grid gap-3 rounded-lg border border-border/60 p-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-3">
        <legend className="px-1 text-xs font-semibold text-ink-muted">Portal (preencha quando a consulta for pelo portal)</legend>
        <label className="block">
          <span className={ROTULO}>Endereço do portal</span>
          <input name="portal_url" defaultValue={a?.portal_url ?? ""} placeholder="https://" className={INPUT_CLASS} />
        </label>
        <label className="block">
          <span className={ROTULO}>Identificação necessária (unidade, bloco, CPF, código…)</span>
          <input name="portal_identificacao" defaultValue={a?.portal_identificacao ?? ""} className={INPUT_CLASS} />
        </label>
        <label className="block sm:col-span-2">
          <span className={ROTULO}>Orientações de acesso</span>
          <textarea name="portal_orientacoes" rows={2} defaultValue={a?.portal_orientacoes ?? ""} className={INPUT_CLASS} />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-ink sm:col-span-2">
          <input type="checkbox" name="portal_login_proprio" defaultChecked={a?.portal_login_proprio ?? false} />A Sacra possui login próprio neste portal
        </label>
        <p className="text-[11px] text-ink-muted sm:col-span-2">Por segurança, o Vitral não guarda a senha do portal. Não escreva senhas nas orientações.</p>
      </fieldset>
      <label className="block sm:col-span-2 lg:col-span-3">
        <span className={ROTULO}>Observações</span>
        <textarea name="observacoes" rows={2} defaultValue={a?.observacoes ?? ""} className={INPUT_CLASS} />
      </label>
      {a && (
        <label className="inline-flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="ativa" defaultChecked={a.ativa} />
          Administradora ativa
        </label>
      )}
    </div>
  );
}

export function Administradoras({ dados, perms }: { dados: DadosPainel; perms: PermissoesDebitos }) {
  const imoveisPorAdm = new Map<string, number>();
  for (const c of dados.contratos) {
    if (c.ativo && c.administradora_id) imoveisPorAdm.set(c.administradora_id, (imoveisPorAdm.get(c.administradora_id) ?? 0) + 1);
  }
  const aRevisar = dados.administradoras.filter((a) => a.observacoes?.startsWith("Criada automaticamente")).length;

  return (
    <div className="space-y-4">
      {aRevisar > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          {aRevisar} administradora(s) foram criadas a partir do que já estava digitado nos contratos. Confira o nome, o e-mail e o método de consulta de cada uma — e, se duas forem a mesma empresa, transfira os imóveis para uma
          delas pelo painel (ação em lote &ldquo;Alterar administradora&rdquo;) e exclua a outra.
        </p>
      )}

      {perms.operar && (
        <details className={`${CARD_CLASS} p-4`}>
          <summary className="cursor-pointer text-sm font-semibold text-brand">+ Nova administradora</summary>
          <form action={salvarAdministradora} className="mt-4 space-y-4">
            <Campos />
            <BotaoEnviar className={PRIMARY_BUTTON_CLASS}>Cadastrar</BotaoEnviar>
          </form>
        </details>
      )}

      {dados.administradoras.length === 0 && <div className={`${CARD_CLASS} px-6 py-10 text-center text-sm text-ink-muted`}>Nenhuma administradora cadastrada.</div>}

      <ul className="space-y-3">
        {dados.administradoras.map((a) => {
          const qtd = imoveisPorAdm.get(a.id) ?? 0;
          return (
            <li key={a.id} className={`${CARD_CLASS} p-4 ${a.ativa ? "" : "opacity-70"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {a.nome}
                    {!a.ativa && <span className="ml-2 text-xs font-normal text-ink-muted">(inativa)</span>}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {[a.email_solicitacao, a.telefone, `${qtd} imóvel(is)`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <SeloMetodo metodo={a.metodo_consulta as MetodoConsulta} />
              </div>
              {perms.operar && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-ink-muted hover:text-ink">Editar</summary>
                  <form action={salvarAdministradora} className="mt-3 space-y-4">
                    <Campos a={a} />
                    <BotaoEnviar className={SECONDARY_BUTTON_CLASS}>Salvar</BotaoEnviar>
                  </form>
                  {qtd === 0 && (
                    <form action={excluirAdministradora} className="mt-3">
                      <input type="hidden" name="id" value={a.id} />
                      <BotaoComConfirmacao className="text-xs text-rose-700 hover:underline" mensagem={`Excluir a administradora "${a.nome}"?`} textoEnviando="Excluindo…">
                        Excluir administradora
                      </BotaoComConfirmacao>
                    </form>
                  )}
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
