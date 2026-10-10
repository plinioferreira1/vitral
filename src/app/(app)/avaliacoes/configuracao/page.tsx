import { ContextoConfiguracao } from "@/components/contexto-configuracao";
import { redirect } from "next/navigation";
import { BotaoEnviar } from "@/components/botao-enviar";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { VoltarLink } from "@/components/voltar-link";
import { podeConfigurar } from "@/lib/avaliacao/permissoes";
import { LIMIARES_PADRAO } from "@/lib/avaliacao/tipos";
import { formatarDataHoraBR } from "@/lib/data-br";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { salvarAssinaturaAvaliadora, salvarConfigAvaliacao } from "../actions";
import { AssinaturaForm } from "../assinatura-form";
import { carregarConfig, papelDe } from "../dados";
import { AreaTexto, Aviso, Campo, Cartao, Selecao } from "../ui";

export default async function ConfiguracaoAvaliacaoPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const config = await carregarConfig(supabase, usuario.tenant_id);
  const papel = papelDe({ userId: user.id, nivel: usuario.nivel_acesso }, config);
  if (!podeConfigurar(papel)) redirect("/avaliacoes");

  const [{ data: pessoas }, { data: assinatura }] = await Promise.all([
    supabase.from("usuarios").select("id, nome, nivel_acesso").eq("ativo", true).order("nome"),
    papel.ehResponsavelTecnica
      ? supabase.from("avaliacao_assinaturas").select("imagem, autorizada_em").eq("usuario_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const r = config.responsavel;
  const l = config.limiares;

  return (
    <div className="w-full min-w-0 space-y-5">
      <ContextoConfiguracao />
      <div>
        <VoltarLink href="/avaliacoes" label="Avaliação de Imóveis" />
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Configuração da avaliação</h1>
        <p className="mt-1 text-sm text-ink-muted">Responsável técnica, alertas de qualidade da amostra, fontes externas autorizadas e assinatura.</p>
      </div>

      <form action={salvarConfigAvaliacao} className="space-y-5">
        <Cartao
          titulo="Avaliadora responsável"
          descricao="É quem aprova, assina e emite os PTAM. Os números de registro aparecem no PDF como informados aqui: confira-os no cadastro oficial do CRECI/COFECI antes da primeira emissão."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Selecao
              label="Usuária no Vitral"
              name="responsavel_usuario_id"
              defaultValue={r.usuario_id ?? ""}
              opcoes={[{ valor: "", rotulo: "— Não definida —" }, ...(pessoas ?? []).map((p) => ({ valor: p.id, rotulo: p.nome }))]}
              ajuda="Só esta pessoa aprova e emite PTAM."
            />
            <Campo label="Nome profissional (como sai no PDF)" name="responsavel_nome" defaultValue={r.nome} />
            <Campo label="CRECI" name="responsavel_creci" defaultValue={r.creci} placeholder="número e região" />
            <Campo label="CNAI" name="responsavel_cnai" defaultValue={r.cnai} />
            <Campo label="Telefone de contato" name="contato_telefone" defaultValue={r.telefone} />
            <Campo label="E-mail de contato" name="contato_email" type="email" defaultValue={r.email} />
            <AreaTexto
              label="Breve currículo (obrigatório no PTAM)"
              name="responsavel_curriculo"
              defaultValue={r.curriculo}
              rows={4}
              className="sm:col-span-2"
              ajuda="A Resolução COFECI nº 1.066/2007 exige identificação e breve currículo do avaliador no parecer."
            />
          </div>
        </Cartao>

        <Cartao
          titulo="Alertas de qualidade da amostra"
          descricao="Estes limites só geram avisos na tela; não bloqueiam nem entram no cálculo. Os valores iniciais são um ponto de partida do sistema — a avaliadora define os critérios que adota."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Campo label="Amostra mínima (comparáveis)" name="limiar_amostraMinima" defaultValue={l.amostraMinima} inputMode="numeric" ajuda={`Inicial: ${LIMIARES_PADRAO.amostraMinima}. Abaixo disso, exige justificativa.`} />
            <Campo label="Idade máxima da consulta (dias)" name="limiar_idadeMaximaDias" defaultValue={l.idadeMaximaDias} inputMode="numeric" ajuda={`Inicial: ${LIMIARES_PADRAO.idadeMaximaDias}.`} />
            <Campo label="Diferença de área (%)" name="limiar_diferencaAreaPct" defaultValue={l.diferencaAreaPct} inputMode="numeric" ajuda={`Inicial: ${LIMIARES_PADRAO.diferencaAreaPct}.`} />
            <Campo label="Desvio da mediana (%)" name="limiar_desvioAtipicoPct" defaultValue={l.desvioAtipicoPct} inputMode="numeric" ajuda={`Inicial: ${LIMIARES_PADRAO.desvioAtipicoPct}. Marca valor atípico.`} />
          </div>
        </Cartao>

        <Cartao
          titulo="Fontes externas autorizadas"
          descricao="Portais e serviços cujos dados a Sacra tem autorização para usar. Servem para identificar a origem nas planilhas importadas. O Vitral não acessa esses sites: não há busca automática nem integração por API configurada."
        >
          <AreaTexto
            label="Uma fonte por linha (nome | observação)"
            name="fontes_externas"
            rows={4}
            defaultValue={config.fontesExternas.map((f) => (f.observacao ? `${f.nome} | ${f.observacao}` : f.nome)).join("\n")}
            placeholder={"Nome do portal | exportação de anúncios autorizada em contrato"}
          />
        </Cartao>

        <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Salvando…">
          Salvar configuração
        </BotaoEnviar>
      </form>

      <Cartao
        titulo="Assinatura da avaliadora"
        descricao="Imagem da assinatura, aplicada ao PDF somente quando a própria avaliadora aprova e emite o documento. É uma assinatura visual — não é assinatura digital com certificado, e o PDF informa isso."
      >
        {papel.ehResponsavelTecnica ? (
          <div className="space-y-4">
            {assinatura ? (
              <div className="flex flex-wrap items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assinatura.imagem} alt="Assinatura cadastrada" className="h-20 rounded-md border border-border bg-white object-contain px-3" />
                <div className="text-xs text-ink-muted">
                  <p>Autorizada em {formatarDataHoraBR(assinatura.autorizada_em)}.</p>
                  <form action={salvarAssinaturaAvaliadora} className="mt-2">
                    <button type="submit" name="acao" value="remover" className={SECONDARY_BUTTON_CLASS}>
                      Remover assinatura
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <Aviso tom="alerta">Nenhuma assinatura cadastrada. Sem ela, o PTAM não pode ser aprovado nem emitido.</Aviso>
            )}
            <details className="rounded-lg border border-border/70 px-4 py-3" open={!assinatura}>
              <summary className="cursor-pointer text-sm font-semibold text-ink">{assinatura ? "Trocar a assinatura" : "Cadastrar a assinatura"}</summary>
              <div className="mt-4">
                <AssinaturaForm />
              </div>
            </details>
          </div>
        ) : (
          <Aviso tom="info">
            Só a própria avaliadora responsável{r.nome ? ` (${r.nome})` : ""} cadastra, vê e usa a assinatura dela. Nenhum outro usuário consegue aplicá-la a um documento.
          </Aviso>
        )}
      </Cartao>
    </div>
  );
}
