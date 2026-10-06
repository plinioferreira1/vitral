/* eslint-disable @next/next/no-img-element */
import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import {
  CHECKLIST_VISTORIA,
  FINALIDADES,
  MODALIDADES,
  ROTULO_FINALIDADE,
  ROTULO_MODALIDADE,
  ROTULO_SITUACAO_CHECKLIST,
  ROTULO_TIPOLOGIA,
  ROTULO_VISTORIA,
  SITUACOES_CHECKLIST,
  TIPOLOGIAS,
  VISTORIA_STATUS,
  type ArquivoAvaliacao,
} from "@/lib/avaliacao/tipos";
import { atualizarArquivo, salvarEtapa } from "../../actions";
import type { AvaliacaoCompleta } from "../../dados";
import { AreaTexto, Aviso, Campo, Cartao, ROTULO_CLASS, Selecao } from "../../ui";
import { Uploader } from "../../uploader";

type Props = { c: AvaliacaoCompleta; tenantId: string; urls: Record<string, string> };

function FormEtapa({ id, etapa, children }: { id: string; etapa: string; children: React.ReactNode }) {
  return (
    <form action={salvarEtapa} className="space-y-5">
      <input type="hidden" name="avaliacao_id" value={id} />
      <input type="hidden" name="etapa" value={etapa} />
      {children}
      <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Salvando…">
        Salvar
      </BotaoEnviar>
    </form>
  );
}

function numero(v: number | undefined | null): string {
  return v === undefined || v === null ? "" : String(v).replace(".", ",");
}

// ---------------------------------------------------------------

export function EtapaDados({ c }: Props) {
  const a = c.avaliacao;
  const d = a.dados;
  const ptam = a.modalidade === "ptam";
  return (
    <FormEtapa id={a.id} etapa="dados">
      <Cartao titulo="Documento e finalidade" descricao="A finalidade define as unidades (venda: R$ e R$/m²; locação: R$/mês e R$/m²/mês) e quais comparáveis podem entrar.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ptam ? <Selecao
            label="Documento"
            name="modalidade"
            defaultValue={a.modalidade}
            opcoes={MODALIDADES.map((m) => ({ valor: m, rotulo: ROTULO_MODALIDADE[m] }))}
            ajuda={a.versao_atual > 0 ? "Não muda depois da primeira emissão." : undefined}
          /> : <input type="hidden" name="modalidade" value="estudo_comercial" />}
          <Selecao label="Finalidade" name="finalidade" defaultValue={a.finalidade} opcoes={FINALIDADES.map((f) => ({ valor: f, rotulo: ROTULO_FINALIDADE[f] }))} />
          <Selecao label="Tipo de imóvel" name="tipologia" defaultValue={a.tipologia} opcoes={TIPOLOGIAS.map((t) => ({ valor: t, rotulo: ROTULO_TIPOLOGIA[t] }))} />
          <Campo label="Data-base" name="data_base" type="date" defaultValue={a.data_base} required ajuda="Data de referência dos valores." />
        </div>
      </Cartao>

      <Cartao titulo="Solicitante e proprietário">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo label={`Solicitante${ptam ? " (obrigatório no PTAM)" : ""}`} name="solicitante_nome" defaultValue={d.solicitante_nome} />
          <Campo label="CPF/CNPJ do solicitante" name="solicitante_documento" defaultValue={d.solicitante_documento} />
          <Campo label="Contato do solicitante" name="solicitante_contato" defaultValue={d.solicitante_contato} />
          <Campo label={`Proprietário${ptam ? " (obrigatório no PTAM)" : ""}`} name="proprietario_nome" defaultValue={a.proprietario_nome} />
          <Campo label="CPF/CNPJ do proprietário" name="proprietario_documento" defaultValue={d.proprietario_documento} />
          <Campo label="Destinatário na capa" name="destinatario" defaultValue={d.destinatario} ajuda="Se vazio, usa o proprietário ou o solicitante." />
        </div>
      </Cartao>

      <Cartao titulo="Objetivo">
        <AreaTexto
          label="Para que serve esta avaliação?"
          name="objetivo"
          defaultValue={d.objetivo}
          rows={3}
          placeholder={ptam ? "Ex.: determinar o valor de mercado do imóvel para instruir partilha." : "Ex.: orientar o preço de anúncio na captação do imóvel."}
        />
      </Cartao>
    </FormEtapa>
  );
}

// ---------------------------------------------------------------

function ListaArquivos({ arquivos, avaliacaoId, urls, permiteCapa }: { arquivos: ArquivoAvaliacao[]; avaliacaoId: string; urls: Record<string, string>; permiteCapa?: boolean }) {
  if (arquivos.length === 0) return <p className="text-sm text-ink-muted">Nenhum arquivo ainda.</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {arquivos.map((arquivo) => (
        <li key={arquivo.id} className="overflow-hidden rounded-xl border border-border/70 bg-surface">
          {arquivo.mime_type.startsWith("image/") && urls[arquivo.caminho_storage] ? (
            <img src={urls[arquivo.caminho_storage]} alt={arquivo.legenda ?? arquivo.nome_arquivo} className="h-36 w-full object-cover" />
          ) : (
            <a href={urls[arquivo.caminho_storage] ?? "#"} target="_blank" rel="noreferrer" className="flex h-36 items-center justify-center bg-background px-3 text-center text-xs text-brand underline">
              {arquivo.nome_arquivo}
            </a>
          )}
          <div className="space-y-2 p-3">
            <form action={atualizarArquivo} className="flex gap-2">
              <input type="hidden" name="avaliacao_id" value={avaliacaoId} />
              <input type="hidden" name="arquivo_id" value={arquivo.id} />
              <input name="legenda" defaultValue={arquivo.legenda ?? ""} placeholder="Legenda" className={`${INPUT_CLASS} !py-1.5 text-xs`} />
              <button type="submit" name="acao" value="legenda" className="rounded-md border border-border px-2 text-xs text-ink-muted hover:text-ink">
                OK
              </button>
            </form>
            <form action={atualizarArquivo} className="flex items-center justify-between gap-2 text-xs">
              <input type="hidden" name="avaliacao_id" value={avaliacaoId} />
              <input type="hidden" name="arquivo_id" value={arquivo.id} />
              {permiteCapa &&
                (arquivo.capa ? (
                  <span className="font-semibold text-brand">Foto de capa</span>
                ) : (
                  <button type="submit" name="acao" value="capa" className="text-ink-muted hover:text-brand hover:underline">
                    Usar na capa
                  </button>
                ))}
              <button type="submit" name="acao" value="remover" className="ml-auto text-rose-700 hover:underline">
                Remover
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EtapaImovel({ c, tenantId, urls }: Props) {
  const a = c.avaliacao;
  const d = a.dados;
  const ptam = a.modalidade === "ptam";
  const terreno = a.tipologia === "terreno";
  const fotos = c.arquivos.filter((x) => x.tipo === "imovel");
  const anexos = c.arquivos.filter((x) => x.tipo === "mapa" || x.tipo === "matricula" || x.tipo === "anexo");
  return (
    <div className="space-y-5">
      <FormEtapa id={a.id} etapa="imovel">
        <Cartao titulo="Identificação e endereço">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Campo label="Identificação (título)" name="titulo" defaultValue={a.titulo} required className="sm:col-span-2" />
            <Campo label="Subtipo" name="subtipo" defaultValue={d.subtipo} placeholder={terreno ? "Lote, chácara…" : a.tipologia === "comercial" ? "Sala, loja, galpão…" : "Apartamento, casa…"} />
            <Campo label="CEP" name="cep" defaultValue={d.cep} />
            <Campo label="Endereço" name="endereco" defaultValue={d.endereco} required className="sm:col-span-2" />
            <Campo label="Complemento / condomínio" name="complemento" defaultValue={d.complemento} className="sm:col-span-2" />
            <Campo label="Bairro / região" name="bairro" defaultValue={a.bairro} required />
            <Campo label="Cidade" name="cidade" defaultValue={a.cidade} required />
            <Campo label="UF" name="uf" defaultValue={d.uf ?? "DF"} />
          </div>
          {!ptam && (
            <label className="mt-4 flex items-start gap-2 text-sm text-ink">
              <input type="hidden" name="endereco_abreviado_pdf__presente" value="1" />
              <input type="checkbox" name="endereco_abreviado_pdf" defaultChecked={!!d.endereco_abreviado_pdf} className="mt-1 accent-brand" />
              Mostrar só bairro e cidade no PDF (privacidade do proprietário)
            </label>
          )}
        </Cartao>

        <Cartao titulo="Medidas e características" descricao="Só os campos preenchidos aparecem no PDF.">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Campo
              label={terreno ? "Área do terreno (m²)" : "Área privativa (m²)"}
              name="area_m2"
              defaultValue={numero(a.area_m2)}
              inputMode="decimal"
              required
              ajuda="Base do cálculo do preço por m²."
            />
            {!terreno && <Campo label="Área total (m²)" name="area_total_m2" defaultValue={numero(d.area_total_m2)} inputMode="decimal" />}
            {!terreno && <Campo label="Área do terreno (m²)" name="area_terreno_m2" defaultValue={numero(d.area_terreno_m2)} inputMode="decimal" />}
            {a.tipologia === "residencial" && (
              <>
                <Campo label="Quartos" name="quartos" defaultValue={d.quartos} inputMode="numeric" />
                <Campo label="Suítes" name="suites" defaultValue={d.suites} inputMode="numeric" />
              </>
            )}
            {!terreno && (
              <>
                <Campo label="Banheiros" name="banheiros" defaultValue={d.banheiros} inputMode="numeric" />
                <Campo label="Vagas" name="vagas" defaultValue={d.vagas} inputMode="numeric" />
                <Campo label="Andar" name="andar" defaultValue={d.andar} />
                <Campo label="Posição solar / vista" name="posicao_solar" defaultValue={d.posicao_solar} />
                <Campo label="Idade aparente (anos)" name="idade_anos" defaultValue={d.idade_anos} inputMode="numeric" />
                <Campo label="Estado de conservação" name="estado_conservacao" defaultValue={d.estado_conservacao} />
                <Campo label="Padrão de acabamento" name="padrao_acabamento" defaultValue={d.padrao_acabamento} />
                <Campo label="Condomínio (R$/mês)" name="valor_condominio" defaultValue={numero(d.valor_condominio)} inputMode="decimal" />
              </>
            )}
            {a.tipologia === "comercial" && <Campo label="Pé-direito (m)" name="pe_direito_m" defaultValue={numero(d.pe_direito_m)} inputMode="decimal" />}
            {(terreno || a.tipologia === "comercial") && <Campo label="Frente (m)" name="frente_m" defaultValue={numero(d.frente_m)} inputMode="decimal" />}
            {terreno && <Campo label="Topografia" name="topografia" defaultValue={d.topografia} placeholder="Plano, aclive…" />}
            {(terreno || a.tipologia === "comercial") && <Campo label="Zoneamento / uso permitido" name="zoneamento" defaultValue={d.zoneamento} />}
            <Campo label="IPTU (R$/ano)" name="valor_iptu" defaultValue={numero(d.valor_iptu)} inputMode="decimal" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AreaTexto label="Diferenciais observados" name="diferenciais" defaultValue={d.diferenciais} />
            <AreaTexto label={`Acessórios e benfeitorias${ptam ? " (obrigatório no PTAM)" : ""}`} name="benfeitorias" defaultValue={d.benfeitorias} />
          </div>
        </Cartao>

        <Cartao
          titulo={ptam ? "Registro e caracterização (obrigatórios no PTAM)" : "Registro e documentos"}
          descricao={ptam ? "Conteúdo mínimo do art. 5º da Resolução COFECI nº 1.066/2007. Sem estes campos o PTAM não é emitido, mas o rascunho pode ser salvo." : undefined}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo label="Matrícula" name="matricula" defaultValue={d.matricula} />
            <Campo label="Cartório de Registro de Imóveis" name="cartorio" defaultValue={d.cartorio} />
            <Campo label="Inscrição imobiliária (IPTU)" name="inscricao_iptu" defaultValue={d.inscricao_iptu} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AreaTexto label="Medidas perimétricas e superfície" name="medidas_perimetricas" defaultValue={d.medidas_perimetricas} />
            <AreaTexto label="Localização e confrontações" name="confrontacoes" defaultValue={d.confrontacoes} />
            <AreaTexto label="Aproveitamento econômico" name="aproveitamento_economico" defaultValue={d.aproveitamento_economico} placeholder="Uso atual, ocupação, renda…" />
            <AreaTexto label="Documentos conferidos" name="documentos_conferidos" defaultValue={d.documentos_conferidos} placeholder="Matrícula de dd/mm/aaaa, IPTU…" />
            <AreaTexto
              label="Lacunas (o que não foi possível obter ou conferir)"
              name="lacunas"
              defaultValue={d.lacunas}
              className="sm:col-span-2"
              ajuda="Aparece nas limitações do documento."
            />
          </div>
        </Cartao>
      </FormEtapa>

      <Cartao
        titulo="Fotos do imóvel"
        descricao="A primeira foto vira a capa (você pode trocar). As fotos são reduzidas automaticamente antes do envio."
        acao={<Uploader avaliacaoId={a.id} tenantId={tenantId} tipo="imovel" rotulo="Adicionar fotos" />}
      >
        <ListaArquivos arquivos={fotos} avaliacaoId={a.id} urls={urls} permiteCapa />
      </Cartao>

      <Cartao
        titulo="Anexos"
        descricao={ptam ? "A Resolução recomenda anexar mapa de localização, certidão atualizada da matrícula e relatório fotográfico." : "Mapa, matrícula e outros documentos de apoio."}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <Uploader avaliacaoId={a.id} tenantId={tenantId} tipo="mapa" aceitaPdf multiplo={false} rotulo="Mapa de localização" compacto />
          <Uploader avaliacaoId={a.id} tenantId={tenantId} tipo="matricula" aceitaPdf rotulo="Matrícula" compacto />
          <Uploader avaliacaoId={a.id} tenantId={tenantId} tipo="anexo" aceitaPdf rotulo="Outro anexo" compacto />
        </div>
        <ListaArquivos arquivos={anexos} avaliacaoId={a.id} urls={urls} />
        <p className="mt-3 text-xs text-ink-muted">Imagens de mapa e matrícula entram no fim do PDF; arquivos em PDF ficam arquivados no Vitral e são listados no documento.</p>
      </Cartao>
    </div>
  );
}

// ---------------------------------------------------------------

export function EtapaVistoria({ c, tenantId, urls }: Props) {
  const a = c.avaliacao;
  const d = a.dados;
  const fotos = c.arquivos.filter((x) => x.tipo === "vistoria");
  return (
    <div className="space-y-5">
      {a.modalidade === "ptam" && d.vistoria_status !== "realizada" && (
        <Aviso tom="alerta">O PTAM exige vistoria realizada, com data. Enquanto isso, o rascunho pode ser salvo normalmente.</Aviso>
      )}
      <FormEtapa id={a.id} etapa="vistoria">
        <Cartao titulo="Situação da vistoria" descricao="Sem vistoria realizada, o PDF declara de forma visível que a análise se baseou só em informações fornecidas.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Selecao label="Situação" name="vistoria_status" defaultValue={d.vistoria_status ?? "nao_realizada"} opcoes={VISTORIA_STATUS.map((s) => ({ valor: s, rotulo: ROTULO_VISTORIA[s] }))} />
            <Campo label="Data" name="vistoria_data" type="date" defaultValue={d.vistoria_data} />
            <Campo label="Quem realizou" name="vistoria_responsavel" defaultValue={d.vistoria_responsavel} />
          </div>
        </Cartao>

        <Cartao titulo={`Itens conferidos — ${ROTULO_TIPOLOGIA[a.tipologia].toLowerCase()}`} descricao="Preencha só o que foi efetivamente conferido. Itens em branco não aparecem no PDF.">
          <ul className="divide-y divide-border">
            {CHECKLIST_VISTORIA[a.tipologia].map((item) => {
              const marca = d.vistoria_checklist?.[item.chave];
              return (
                <li key={item.chave} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1.3fr)_170px_minmax(0,1fr)] sm:items-center">
                  <span className="text-sm text-ink">{item.rotulo}</span>
                  <select name={`ck_${item.chave}`} defaultValue={marca?.situacao ?? ""} className={`${INPUT_CLASS} !py-2`} aria-label={`Situação: ${item.rotulo}`}>
                    <option value="">Não conferido</option>
                    {SITUACOES_CHECKLIST.map((s) => (
                      <option key={s} value={s}>
                        {ROTULO_SITUACAO_CHECKLIST[s]}
                      </option>
                    ))}
                  </select>
                  <input name={`ckobs_${item.chave}`} defaultValue={marca?.observacao ?? ""} placeholder="Observação" className={`${INPUT_CLASS} !py-2`} aria-label={`Observação: ${item.rotulo}`} />
                </li>
              );
            })}
          </ul>
        </Cartao>

        <Cartao titulo="Ressalvas e divergências">
          <div className="grid gap-4 sm:grid-cols-2">
            <AreaTexto label="Ressalvas" name="vistoria_ressalvas" defaultValue={d.vistoria_ressalvas} placeholder="O que não pôde ser verificado, limitações de acesso…" />
            <AreaTexto label="Divergências em relação ao cadastro" name="vistoria_divergencias" defaultValue={d.vistoria_divergencias} placeholder="Área, vagas, estado… diferentes do informado" />
          </div>
        </Cartao>
      </FormEtapa>

      <Cartao titulo="Fotos da vistoria" acao={<Uploader avaliacaoId={a.id} tenantId={tenantId} tipo="vistoria" rotulo="Adicionar fotos" />}>
        <ListaArquivos arquivos={fotos} avaliacaoId={a.id} urls={urls} />
        <span className={`${ROTULO_CLASS} mt-3`}>Só entram no PDF quando a vistoria está marcada como realizada.</span>
      </Cartao>
    </div>
  );
}

// ---------------------------------------------------------------

export function EtapaLocalizacao({ c }: Props) {
  const a = c.avaliacao;
  const d = a.dados;
  return (
    <FormEtapa id={a.id} etapa="localizacao">
      <Cartao
        titulo="Localização"
        descricao="Separe o que é observação comercial do que é verificável. Não use números de população, renda ou valorização sem fonte e data — o PDF não os apresenta."
      >
        <div className="space-y-4">
          <AreaTexto label="Descrição do entorno (texto editorial, revisado por pessoa)" name="localizacao_descricao" defaultValue={d.localizacao_descricao} rows={4} />
          <AreaTexto
            label="Atributos verificáveis (um por linha)"
            name="localizacao_atributos"
            defaultValue={d.localizacao_atributos}
            rows={4}
            placeholder={"Estação de metrô a 600 m\nSupermercado na mesma quadra"}
          />
          <AreaTexto
            label={`Vizinhança e infraestrutura${a.modalidade === "ptam" ? " (obrigatório no PTAM)" : ""}`}
            name="infraestrutura_entorno"
            defaultValue={d.infraestrutura_entorno}
            placeholder="Pavimentação, redes de água, esgoto e energia, transporte, comércio…"
          />
          <AreaTexto label="Como a localização influencia o preço" name="localizacao_influencia" defaultValue={d.localizacao_influencia} />
        </div>
      </Cartao>
    </FormEtapa>
  );
}

// ---------------------------------------------------------------

export function EtapaTextos({ c }: Props) {
  const a = c.avaliacao;
  const d = a.dados;
  const ptam = a.modalidade === "ptam";
  return (
    <FormEtapa id={a.id} etapa="textos">
      <Cartao titulo="Apresentação" descricao="Se ficar em branco, o PDF usa um texto padrão com o objetivo, a finalidade e a data-base.">
        <AreaTexto label={ptam ? "Texto de abertura do parecer" : "Carta ao proprietário"} name="carta_texto" defaultValue={d.carta_texto} rows={5} />
      </Cartao>

      <Cartao titulo={ptam ? "Análise da avaliadora" : "Análise da equipe"} descricao={ptam ? "Interpretação dos dados, dos ajustes, das exclusões e das limitações. Obrigatória no PTAM." : "Opcional no estudo comercial."}>
        <AreaTexto label="Análise" name="parecer_avaliadora" defaultValue={d.parecer_avaliadora} rows={5} />
      </Cartao>

      {!ptam && (
        <Cartao titulo="Estratégia comercial" descricao="Só o que for preenchido aparece. Não prometa prazo de venda; o público é uma hipótese de trabalho.">
          <div className="grid gap-4 sm:grid-cols-2">
            <AreaTexto label="Posicionamento" name="estrategia_posicionamento" defaultValue={d.estrategia_posicionamento} />
            <AreaTexto label="Público provável (hipótese)" name="estrategia_publico" defaultValue={d.estrategia_publico} />
            <AreaTexto label="Preparação e fotografia" name="estrategia_preparacao" defaultValue={d.estrategia_preparacao} />
            <AreaTexto label="Canais de divulgação (os que a Sacra realmente usa)" name="estrategia_canais" defaultValue={d.estrategia_canais} />
            <AreaTexto label="Quando reavaliar o preço" name="estrategia_reavaliacao" defaultValue={d.estrategia_reavaliacao} className="sm:col-span-2" />
          </div>
        </Cartao>
      )}

      <Cartao titulo="Conclusão e limitações">
        <div className="space-y-4">
          <AreaTexto label="Conclusão" name="conclusao_texto" defaultValue={d.conclusao_texto} rows={4} />
          <AreaTexto
            label="Limitações adicionais (opcional)"
            name="limitacoes_texto"
            defaultValue={d.limitacoes_texto}
            ajuda="O PDF já inclui automaticamente: data-base, situação da vistoria, oferta × transação, amostra reduzida e lacunas."
          />
        </div>
      </Cartao>

      {ptam && (
        <Cartao
          titulo="Selo certificador e DAM"
          descricao="Preencha apenas se o selo e a Declaração de Avaliação Mercadológica foram de fato obtidos no CRECI. O Vitral não gera nem simula selo; em branco, o PDF informa que o selo não foi aplicado."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Número do selo certificador" name="selo_numero" defaultValue={d.selo_numero} />
            <Campo label="Número da DAM" name="dam_numero" defaultValue={d.dam_numero} />
          </div>
        </Cartao>
      )}

      <Cartao titulo="Observações sobre anexos">
        <AreaTexto label="Observações (opcional)" name="anexos_observacoes" defaultValue={d.anexos_observacoes} rows={2} />
      </Cartao>
    </FormEtapa>
  );
}
