import Link from "next/link";
import { calcularMetodo, ROTULO_METODO } from "@/lib/avaliacao/metodos";
import { MetodoForm } from "../../metodo-form";
import { FATORES_AJUSTE } from "@/lib/avaliacao/tipos";
import { BotaoEnviar } from "@/components/botao-enviar";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { podeAprovar, type PapelAvaliacao } from "@/lib/avaliacao/permissoes";
import { FINALIDADES, ROTULO_FINALIDADE, TIPOLOGIAS, ROTULO_TIPOLOGIA, type Comparavel } from "@/lib/avaliacao/tipos";
import type { ResultadoValidacao } from "@/lib/avaliacao/validacao";
import { hojeISO } from "@/lib/data-br";
import { salvarComparavel, salvarEtapa, salvarLaudoComercial, alterarInclusaoComparavel, adicionarAjuste, removerAjuste } from "../../actions";
import type { AvaliacaoCompleta } from "../../dados";
import { AreaTexto, Aviso, Campo, Cartao, moeda, Selecao } from "../../ui";
import { ListaArquivos } from "./formularios";
import { Uploader } from "../../uploader";

const numero = (n: number | null | undefined) => n == null ? "" : String(n).replace(".", ",");

export function DadosComerciais({ c, tenantId, urls }: { c: AvaliacaoCompleta; tenantId: string; urls: Record<string, string> }) {
  const a = c.avaliacao;
  const d = a.dados;
  return <div className="space-y-5">
    <form action={salvarEtapa} className="space-y-5">
      <input type="hidden" name="avaliacao_id" value={a.id} />
      <input type="hidden" name="etapa" value="dados_comerciais" />
      <input type="hidden" name="modalidade" value="estudo_comercial" />
      <Cartao titulo="Cliente">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Campo label="Nome do cliente" name="solicitante_nome" defaultValue={d.solicitante_nome ?? a.proprietario_nome ?? d.destinatario} required />
          <Campo label="Telefone ou e-mail (opcional)" name="solicitante_contato" defaultValue={d.solicitante_contato} />
          <Campo label="Proprietário (se diferente do cliente)" name="proprietario_nome" defaultValue={a.proprietario_nome} />
          <Campo label="CPF/CNPJ (opcional)" name="solicitante_documento" defaultValue={d.solicitante_documento} />
        </div>
      </Cartao>
      <Cartao titulo="Imóvel" descricao="Preencha o que deseja apresentar ao cliente. Apenas os dados preenchidos entram no laudo.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo label="Identificação do imóvel" name="titulo" defaultValue={a.titulo} required className="sm:col-span-2" />
          <Selecao label="Finalidade" name="finalidade" defaultValue={a.finalidade} opcoes={FINALIDADES.map(f => ({ valor: f, rotulo: ROTULO_FINALIDADE[f] }))} />
          <Selecao label="Tipo" name="tipologia" defaultValue={a.tipologia} opcoes={TIPOLOGIAS.map(t => ({ valor: t, rotulo: ROTULO_TIPOLOGIA[t] }))} />
          <Campo label="Subtipo" name="subtipo" defaultValue={d.subtipo} placeholder="Apartamento, casa, sala, lote…" />
          <Campo label="Data da avaliação" name="data_base" type="date" defaultValue={a.data_base} required />
          <Campo label="Endereço" name="endereco" defaultValue={d.endereco} required className="sm:col-span-2" />
          <Campo label="Complemento" name="complemento" defaultValue={d.complemento} />
          <Campo label="Bairro / região" name="bairro" defaultValue={a.bairro} />
          <Campo label="Cidade" name="cidade" defaultValue={a.cidade} />
          <Campo label="UF" name="uf" defaultValue={d.uf ?? "DF"} />
          <Campo label="Área (m²)" name="area_m2" defaultValue={numero(a.area_m2)} inputMode="decimal" required />
          {a.tipologia !== "terreno" && <>
            <Campo label="Quartos" name="quartos" defaultValue={d.quartos} inputMode="numeric" />
            <Campo label="Banheiros" name="banheiros" defaultValue={d.banheiros} inputMode="numeric" />
            <Campo label="Vagas" name="vagas" defaultValue={d.vagas} inputMode="numeric" />
            <Campo label="Estado de conservação" name="estado_conservacao" defaultValue={d.estado_conservacao} />
          </>}
        </div>
        <div className="mt-4"><AreaTexto label="Descrição e diferenciais" name="diferenciais" defaultValue={d.diferenciais} rows={4} /></div>
      </Cartao>
      <BotaoEnviar className={PRIMARY_BUTTON_CLASS}>Salvar dados</BotaoEnviar>
    </form>
    <Cartao titulo="Fotos (opcional)" descricao="Escolha uma foto de capa para personalizar o documento." acao={<Uploader avaliacaoId={a.id} tenantId={tenantId} tipo="imovel" rotulo="Adicionar fotos" />}>
      <ListaArquivos arquivos={c.arquivos.filter(x => x.tipo === "imovel")} avaliacaoId={a.id} urls={urls} permiteCapa />
    </Cartao>
  </div>;
}

function FormComparavel({ id, finalidade, comparavel: x }: { id: string; finalidade: "venda" | "locacao"; comparavel?: Comparavel }) {
  return <form action={salvarComparavel} className="space-y-4">
    <input type="hidden" name="avaliacao_id" value={id} />
    {x && <input type="hidden" name="comparavel_id" value={x.id} />}

    <input type="hidden" name="fonte_tipo" value={x?.fonte_tipo ?? "manual"} />
    <input type="hidden" name="fonte_nome" value={x?.fonte_nome ?? "Referência informada pela equipe"} />
    {x?.referencia_interna && <input type="hidden" name="referencia_interna" value={x.referencia_interna} />}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Campo label="Identificação / endereço" name="identificacao" defaultValue={x?.identificacao} required className="sm:col-span-2" />
      <Campo label="Bairro / localização" name="regiao" defaultValue={x?.regiao} />
      <Selecao label="Tipo do imóvel" name="tipologia" defaultValue={x?.tipologia ?? ""} opcoes={[{valor: "", rotulo: "Mesmo tipo do imóvel avaliado"}, ...TIPOLOGIAS.map(t => ({ valor: t, rotulo: ROTULO_TIPOLOGIA[t] }))]} />
      <Campo label="Data da consulta" name="data_coleta" type="date" defaultValue={x?.data_coleta ?? hojeISO()} />
      <Campo label="Área (m²)" name="area_m2" defaultValue={numero(x?.area_m2)} inputMode="decimal" required />
      <Campo label={finalidade === "venda" ? "Preço de venda (R$)" : "Aluguel mensal (R$)"} name="preco" defaultValue={numero(x?.preco)} inputMode="decimal" required />
      <Selecao label="Tipo de preço" name="tipo_preco" defaultValue={x?.tipo_preco ?? "oferta"} opcoes={[{ valor: "oferta", rotulo: "Anunciado" }, { valor: "transacao", rotulo: "Negociado / confirmado" }]} />
      <Campo label="Link do anúncio (opcional)" name="fonte_url" defaultValue={x?.fonte_url} type="url" className="sm:col-span-2" />
    </div>
    <AreaTexto label="Características e observações (opcional)" name="observacoes" defaultValue={x?.observacoes} />
    <BotaoEnviar className={x ? SECONDARY_BUTTON_CLASS : PRIMARY_BUTTON_CLASS}>{x ? "Salvar comparável" : "Adicionar comparável"}</BotaoEnviar>
  </form>;
}

export function ComparaveisComerciais({ c }: { c: AvaliacaoCompleta }) {
  const a = c.avaliacao;
  return <div className="space-y-5">
    <Cartao titulo="Imóveis semelhantes" descricao="Referências opcionais para apoiar sua análise. Escolha referências com metragem, tipologia e localização compatíveis. Ajustes opcionais precisam de justificativa; o método comparativo pode ser calculado na etapa do laudo.">
      {c.comparaveis.length === 0 && <p className="text-sm text-ink-muted">Nenhum comparável cadastrado. Você pode adicionar abaixo ou seguir para o laudo.</p>}
      <div className="space-y-3">{c.comparaveis.map(x => <details key={x.id} className="rounded-xl border border-border p-4">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold text-ink">{x.identificacao} · {moeda(x.preco, x.finalidade)}{!x.incluido ? " · Fora do laudo" : ""}</summary>
        <div className="mt-4 space-y-4">
          <FormComparavel id={a.id} finalidade={a.finalidade} comparavel={x} />
          <details className="rounded-lg bg-background p-4">
            <summary className="min-h-11 cursor-pointer text-sm font-medium">Ajustes de comparação ({x.ajustes.length})</summary>
            <p className="mt-2 text-xs leading-5 text-ink-muted">Ajuste o comparável para as condições do imóvel avaliado. Positivo aumenta o preço de referência; negativo reduz. Os fatores são multiplicados e não são preenchidos automaticamente.</p>
            <ul className="my-3 space-y-3">{x.ajustes.map((aj, indice) => <li key={indice} className="text-sm">
              <p>{aj.fator}: {aj.percentual > 0 ? "+" : ""}{aj.percentual}% · {aj.justificativa}</p>
              <form action={removerAjuste}><input type="hidden" name="avaliacao_id" value={a.id} /><input type="hidden" name="comparavel_id" value={x.id} /><input type="hidden" name="indice" value={indice} /><BotaoEnviar className={SECONDARY_BUTTON_CLASS}>Remover ajuste</BotaoEnviar></form>
            </li>)}</ul>
            <form action={adicionarAjuste} className="space-y-3">
              <input type="hidden" name="avaliacao_id" value={a.id} /><input type="hidden" name="comparavel_id" value={x.id} />
              <div className="grid gap-4 sm:grid-cols-2"><Selecao label="Fator" name="fator" opcoes={FATORES_AJUSTE.map(f => ({ valor: f, rotulo: f }))} /><Campo label="Ajuste (%)" name="percentual" inputMode="decimal" required ajuda="Entre -60 e +60, diferente de zero." /></div>
              <AreaTexto label="Justificativa do ajuste" name="justificativa" /><Campo label="Fonte do percentual" name="origem" />
              <BotaoEnviar className={SECONDARY_BUTTON_CLASS}>Adicionar ajuste</BotaoEnviar>
            </form>
          </details>
          <form action={alterarInclusaoComparavel}>
            <input type="hidden" name="avaliacao_id" value={a.id} /><input type="hidden" name="comparavel_id" value={x.id} />
            <input type="hidden" name="acao" value={x.incluido ? "excluir" : "incluir"} />
            <input type="hidden" name="motivo_exclusao" value="Seleção de referências para o laudo comercial." />
            <BotaoEnviar className={SECONDARY_BUTTON_CLASS}>{x.incluido ? "Retirar do laudo" : "Incluir no laudo"}</BotaoEnviar>
          </form>
        </div>
      </details>)}</div>
    </Cartao>
    <Cartao titulo="Adicionar imóvel comparável"><FormComparavel id={a.id} finalidade={a.finalidade} /></Cartao>
    <Link href={`/avaliacoes/${a.id}?etapa=revisao`} className={SECONDARY_BUTTON_CLASS}>Continuar para o laudo →</Link>
  </div>;
}

export function LaudoComercial({ c, papel, validacao }: { c: AvaliacaoCompleta; papel: PapelAvaliacao; validacao: ResultadoValidacao }) {
  const a = c.avaliacao;
  const d = a.dados;
  const aprova = podeAprovar(papel, a.modalidade);
  const metodo = calcularMetodo(d.metodologia, a.finalidade, a.area_m2, a.tipologia, c.comparaveis);
  return <div className="space-y-5">
    <Cartao titulo="Método de avaliação" descricao="Apoio opcional ao preço. Escolha o método, informe as premissas e decida se deseja aplicar o resultado ao laudo.">
      <MetodoForm key={`${a.revisao}-${a.finalidade}`} id={a.id} finalidade={a.finalidade} premissas={d.metodologia} />
      {d.metodologia && <div className="mt-5 rounded-xl border border-border p-4">
        <h3 className="font-semibold">{ROTULO_METODO[d.metodologia.metodo]} · {metodo.valor == null ? "Revise as premissas" : moeda(metodo.valor, a.finalidade)}</h3>
        <p className="mt-2 text-xs text-ink-muted">Resultado das premissas salvas. O valor sugerido ao cliente continua no campo abaixo.</p>
        {metodo.erros.map((e, i) => <p key={i} className="mt-2 text-sm text-brand">{e}</p>)}
        <details className="mt-3"><summary className="min-h-11 cursor-pointer text-sm">Ver memória de cálculo</summary><ul className="list-disc space-y-2 pl-5 text-sm leading-6">{metodo.memoria.map((m, i) => <li key={i}>{m}</li>)}</ul></details>
      </div>}
    </Cartao>
    <form action={salvarLaudoComercial} className="space-y-5">
      <input type="hidden" name="avaliacao_id" value={a.id} />
      <Cartao titulo="Valor e conclusão" descricao="Defina o valor e personalize os textos. Para conferir o PDF, salve primeiro. Salvar e emitir faz as duas ações de uma vez.">
        <Campo label={a.finalidade === "venda" ? "Valor sugerido para venda (R$)" : "Aluguel mensal sugerido (R$)"} name="valor_sugerido" defaultValue={numero(a.valor_sugerido)} inputMode="decimal" required className="xl:w-1/2 xl:pr-2" />
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <AreaTexto label="Apresentação ao cliente" name="carta_texto" defaultValue={d.carta_texto ?? "Apresentamos nossa avaliação comercial do imóvel, preparada para apoiar sua decisão e a definição do preço de divulgação."} />
          <AreaTexto label="Análise do imóvel e do mercado (opcional)" name="parecer_avaliadora" defaultValue={d.parecer_avaliadora ?? d.fundamentacao} rows={5} />
          <AreaTexto label="Conclusão" name="conclusao_texto" defaultValue={d.conclusao_texto ?? "O valor sugerido considera as características informadas do imóvel e as referências disponíveis na data desta avaliação. A negociação final dependerá das condições do mercado e das propostas recebidas."} rows={4} />
          <AreaTexto label="Observações finais (opcional)" name="limitacoes_texto" defaultValue={d.limitacoes_texto} />
        </div>
      </Cartao>
      <BotaoEnviar className={PRIMARY_BUTTON_CLASS}>Salvar laudo</BotaoEnviar>
    <Cartao titulo="Conferir e emitir" descricao="O PDF reúne capa, dados do imóvel, comparáveis, conclusão e identificação do responsável pela emissão.">
      {validacao.bloqueios.length > 0 ? <Aviso tom="alerta"><ul className="list-inside list-disc">{validacao.bloqueios.map((b,i) => <li key={i}>{b.mensagem}</li>)}</ul></Aviso> : <Aviso tom="info">Tudo pronto. Confira o PDF e emita a versão para o cliente.</Aviso>}
      <div className="mt-4 flex flex-wrap gap-3">
        <a href={`/avaliacoes/${a.id}/pdf`} target="_blank" rel="noreferrer" className={SECONDARY_BUTTON_CLASS}>Conferir PDF</a>
        {a.status === "emitido" ? <Link href={`/avaliacoes/${a.id}?etapa=historico`} className={PRIMARY_BUTTON_CLASS}>Baixar laudo emitido</Link> : a.status !== "arquivado" && <div>
          <input type="hidden" name="avaliacao_id" value={a.id} />
          <BotaoEnviar className={PRIMARY_BUTTON_CLASS} name="acao" value={aprova ? "emitir" : "revisao"} disabled={validacao.bloqueios.some(b => b.etapa === "dados" || b.etapa === "comparaveis") || (!aprova && a.status !== "rascunho")} textoEnviando={aprova ? "Emitindo…" : "Enviando…"}>{aprova ? "Salvar e emitir laudo" : a.status === "rascunho" ? "Salvar e enviar para emissão" : "Aguardando emissão"}</BotaoEnviar>
        </div>}
      </div>
      {!aprova && <p className="mt-3 text-xs text-ink-muted">A emissão é feita por um diretor, gerente ou responsável configurado.</p>}
    </Cartao>
    </form>
  </div>;
}
