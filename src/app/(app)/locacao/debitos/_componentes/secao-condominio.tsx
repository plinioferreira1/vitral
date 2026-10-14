import Link from "next/link";
import { Building2 } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { ROTULO_METODO, rotuloAdministradora, type MetodoConsulta } from "@/lib/debitos/regras";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { salvarVinculoCondominio } from "../actions";
import { carregarPermissoes } from "../dados";
import { ROTULO } from "./ui";

/** Seção "Condomínio" da página do contrato: vínculo com a administradora cadastrada. */
export async function SecaoCondominio({ contratoId }: { contratoId: string }) {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario) return null;
  const supabase = await createClient();
  const [perms, { data: c }, { data: administradoras }] = await Promise.all([
    carregarPermissoes(supabase, user.id, usuario.nivel_acesso),
    supabase
      .from("contratos_locacao")
      .select("possui_condominio, administradora_id, condominio_nome, condominio_unidade, condominio_bloco, condominio_email, condominio_codigo_unidade, condominio_observacoes")
      .eq("id", contratoId)
      .maybeSingle(),
    supabase.from("condominio_administradoras").select("id, nome, email_solicitacao, metodo_consulta, ativa").order("nome"),
  ]);
  if (!perms.ver || !c) return null;
  const adm = (administradoras ?? []).find((a) => a.id === c.administradora_id);

  return (
    <section>
      <CabecalhoSecao icon={Building2} titulo="Condomínio" />
      <form action={salvarVinculoCondominio} className="space-y-4 rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <input type="hidden" name="contrato_id" value={contratoId} />
        <p className="text-xs text-ink-muted">
          Usado no{" "}
          <Link href={`/locacao/debitos?detalhe=${contratoId}`} className="font-medium text-brand hover:underline">
            Controle de Débitos
          </Link>
          {adm ? ` — ${ROTULO_METODO[adm.metodo_consulta as MetodoConsulta].toLowerCase()}.` : "."} As administradoras são cadastradas uma única vez, em Controle de Débitos → Administradoras.
        </p>
        <fieldset disabled={!perms.operar} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className={ROTULO}>Possui condomínio?</span>
            <select name="possui_condominio" defaultValue={c.possui_condominio === null ? "" : c.possui_condominio ? "sim" : "nao"} className={INPUT_CLASS}>
              <option value="">Não informado</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </label>
          <label className="block lg:col-span-2">
            <span className={ROTULO}>E-mail da administradora</span>
            <input name="administradora" type="text" inputMode="email" autoComplete="off" spellCheck={false} defaultValue={rotuloAdministradora(adm)} placeholder="ex.: boletos@administradora.com.br" className={INPUT_CLASS} />
            <span className="mt-1 block text-xs text-ink-muted">Digite o e-mail. Se ainda não estiver cadastrada, a administradora é criada ao salvar.</span>
          </label>
          <label className="block">
            <span className={ROTULO}>Nome do condomínio</span>
            <input name="condominio_nome" defaultValue={c.condominio_nome ?? ""} className={INPUT_CLASS} />
          </label>
          <label className="block">
            <span className={ROTULO}>Unidade</span>
            <input name="condominio_unidade" defaultValue={c.condominio_unidade ?? ""} className={INPUT_CLASS} />
          </label>
          <label className="block">
            <span className={ROTULO}>Bloco</span>
            <input name="condominio_bloco" defaultValue={c.condominio_bloco ?? ""} className={INPUT_CLASS} />
          </label>
          <label className="block">
            <span className={ROTULO}>E-mail específico (se houver)</span>
            <input name="condominio_email" type="email" defaultValue={c.condominio_email ?? ""} className={INPUT_CLASS} />
          </label>
          <label className="block">
            <span className={ROTULO}>Código da unidade na administradora</span>
            <input name="condominio_codigo_unidade" defaultValue={c.condominio_codigo_unidade ?? ""} className={INPUT_CLASS} />
          </label>
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className={ROTULO}>Observações</span>
            <input name="condominio_observacoes" defaultValue={c.condominio_observacoes ?? ""} className={INPUT_CLASS} />
          </label>
        </fieldset>
        {perms.operar && (
          <BotaoEnviar className={SECONDARY_BUTTON_CLASS} textoEnviando="Salvando…">
            Salvar condomínio
          </BotaoEnviar>
        )}
      </form>
    </section>
  );
}
