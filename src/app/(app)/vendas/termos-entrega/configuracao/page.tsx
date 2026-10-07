import { ContextoConfiguracao } from "@/components/contexto-configuracao";
import { redirect } from "next/navigation";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { VoltarLink } from "@/components/voltar-link";
import { formatarDataHoraBR } from "@/lib/data-br";
import { createClient } from "@/lib/supabase/server";
import { VARIAVEIS_CLAUSULA } from "@/lib/termo-entrega/conteudo";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { salvarModeloTermo } from "../actions";
import { TIMBRADO_PADRAO, carregarModelo, carregarPermissoes } from "../dados";
import { ROTULO } from "../ui";
import { CampoTimbrado } from "./campo-timbrado";

export default async function ModeloTermoPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const perms = await carregarPermissoes(supabase, user.id, usuario.nivel_acesso);
  if (!perms.configurar) redirect(perms.ver ? "/vendas/termos-entrega" : "/");
  const [modelo, { data: eventos }] = await Promise.all([
    carregarModelo(supabase, usuario.tenant_id),
    supabase.from("termo_entrega_eventos").select("id, descricao, usuario_nome, criado_em").eq("acao", "modelo_alterado").order("criado_em", { ascending: false }).limit(10),
  ]);
  const multa = `${Math.floor(modelo.multaDiariaCentavos / 100)},${String(modelo.multaDiariaCentavos % 100).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <ContextoConfiguracao />
      <div>
        <VoltarLink href="/vendas/termos-entrega" label="Termos de entrega de chaves" />
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Modelo do Termo de Entrega de Chaves</h1>
        <p className="mt-1 text-sm text-ink-muted">Vale para os próximos termos criados. Os termos já existentes guardam o texto com que foram feitos.</p>
      </div>

      <form action={salvarModeloTermo} className={`${CARD_CLASS} space-y-6 p-4 sm:p-6`}>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Cláusula de entrega</h2>
          <label className="block">
            <span className={ROTULO}>Cláusula padrão</span>
            <textarea name="clausula_padrao" rows={8} defaultValue={modelo.clausulaPadrao} className={`${INPUT_CLASS} leading-relaxed`} />
            <span className="mt-1 block text-[11px] text-ink-muted">Variáveis: {VARIAVEIS_CLAUSULA.join(", ")}. O prazo e a multa entram com o número e o valor por extenso automaticamente.</span>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className={ROTULO}>Prazo para transferência (dias úteis)</span>
              <input name="prazo_transferencia_dias" type="number" min={0} max={365} defaultValue={modelo.prazoTransferenciaDias} className={`${INPUT_CLASS} num`} />
            </label>
            <label className="block">
              <span className={ROTULO}>Multa diária (R$)</span>
              <input name="multa_diaria" inputMode="decimal" defaultValue={multa} className={`${INPUT_CLASS} num`} />
            </label>
            <label className="block">
              <span className={ROTULO}>Local das assinaturas</span>
              <input name="cidade" defaultValue={modelo.cidade} className={INPUT_CLASS} />
            </label>
          </div>
          <label className="block">
            <span className={ROTULO}>Texto complementar padrão (opcional)</span>
            <textarea name="texto_complementar" rows={3} defaultValue={modelo.textoComplementar} className={INPUT_CLASS} />
          </label>
          <label className="block">
            <span className={ROTULO}>Observações padrão (opcional)</span>
            <textarea name="observacoes_padrao" rows={3} defaultValue={modelo.observacoesPadrao} className={INPUT_CLASS} />
          </label>
        </section>

        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-ink">Papel timbrado</h2>
          <div className="flex flex-wrap items-start gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={TIMBRADO_PADRAO} alt="Papel timbrado padrão da Sacra" className="h-56 w-auto rounded-lg border border-border shadow-sm" />
            <div className="min-w-0 flex-1 basis-64 space-y-3 text-sm">
              <p className="text-ink">{modelo.timbradoCaminho ? "Em uso: papel timbrado enviado por vocês." : "Em uso: papel timbrado padrão da Sacra (ao lado)."}</p>
              <p className="text-xs text-ink-muted">Para trocar, envie a imagem da página A4 inteira (logo, cabeçalho e rodapé) em JPG ou PNG. O conteúdo do documento é escrito por cima, respeitando as margens abaixo.</p>
              <CampoTimbrado tenantId={usuario.tenant_id} />
              {modelo.timbradoCaminho && (
                <label className="flex items-center gap-2 text-xs text-ink">
                  <input type="checkbox" name="timbrado_padrao" /> Voltar a usar o papel timbrado padrão
                </label>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={ROTULO}>Margem superior (pontos)</span>
                  <input name="margem_superior" type="number" min={40} max={300} defaultValue={modelo.margemSuperior} className={`${INPUT_CLASS} num`} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Margem inferior (pontos)</span>
                  <input name="margem_inferior" type="number" min={40} max={300} defaultValue={modelo.margemInferior} className={`${INPUT_CLASS} num`} />
                </label>
              </div>
              <p className="text-[11px] text-ink-muted">Só mexa nas margens se trocar o timbrado e o texto encostar no logo ou no rodapé (a página tem 842 pontos de altura).</p>
            </div>
          </div>
        </section>

        <BotaoEnviar className={PRIMARY_BUTTON_CLASS}>Salvar modelo</BotaoEnviar>
      </form>

      {(eventos ?? []).length > 0 && (
        <section className={`${CARD_CLASS} p-4 sm:p-5`}>
          <h2 className="mb-3 text-sm font-semibold text-ink">Alterações do modelo</h2>
          <ol className="space-y-2">
            {(eventos ?? []).map((e) => (
              <li key={e.id} className="border-l-2 border-border pl-3 text-xs">
                <p className="text-ink">{e.descricao}</p>
                <p className="text-ink-muted">
                  {e.usuario_nome ?? "—"} · {formatarDataHoraBR(e.criado_em)}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
