import { createClient } from "@/lib/supabase/server";
import { AssinaturaForm } from "./assinatura-form";

function brl(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataExtenso(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface DadosAssinatura {
  signatario_id: string;
  nome_esperado: string;
  ja_assinado: boolean;
  imovel_endereco: string;
  imovel_cep: string | null;
  imovel_area_construida: string | null;
  imovel_area_lote: string | null;
  imovel_inscricao_iptu: string | null;
  imovel_matricula: string | null;
  imovel_valor_condominio: number | null;
  vendedor_nome: string;
  vendedor_cpf: string | null;
  vendedor_rg: string | null;
  vendedor_telefone: string | null;
  vendedor_endereco: string | null;
  conjuge_nome: string | null;
  conjuge_cpf: string | null;
  conjuge_rg: string | null;
  conjuge_telefone: string | null;
  conjuge_endereco: string | null;
  valor_imovel: number | null;
  comissao_percentual: number | null;
  prazo_dias: number | null;
  exclusividade: boolean;
  observacoes: string | null;
  foro: string;
  status_autorizacao: string;
  criado_em: string;
}

export default async function AssinarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: dataRaw } = await supabase.rpc("assinatura_buscar", { p_token: token }).maybeSingle();
  const data = dataRaw as DadosAssinatura | null;

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 py-10">
      <div className="mb-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/sacra-logo-vertical-bordo.png"
          alt="Sacra Netimóveis"
          className="mx-auto h-24 w-auto object-contain"
        />
      </div>

      {!data ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-base font-semibold text-ink">Link inválido ou expirado</p>
          <p className="mt-1 text-sm text-ink-muted">
            Confira o link recebido, ou peça pra Sacra reenviar.
          </p>
        </div>
      ) : data.ja_assinado ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-base font-semibold text-emerald-800">Este documento já foi assinado</p>
          <p className="mt-1 text-sm text-emerald-700">Obrigado — não precisa fazer mais nada.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 space-y-4 rounded-xl border border-border bg-surface p-6 text-sm leading-relaxed text-ink shadow-sm">
            <h1 className="text-center text-base font-bold uppercase tracking-wide">
              Autorização de Venda de Imóvel
            </h1>

            <div>
              <p className="font-semibold">Proprietário(s)</p>
              <p>
                Nome: {data.vendedor_nome}
                {data.vendedor_cpf && <> · CPF: {data.vendedor_cpf}</>}
                {data.vendedor_rg && <> · RG: {data.vendedor_rg}</>}
              </p>
              {data.vendedor_telefone && <p>Telefone: {data.vendedor_telefone}</p>}
              {data.vendedor_endereco && <p>Endereço: {data.vendedor_endereco}</p>}

              {data.conjuge_nome && (
                <>
                  <p className="mt-2">
                    Cônjuge/Co-proprietário(a): {data.conjuge_nome}
                    {data.conjuge_cpf && <> · CPF: {data.conjuge_cpf}</>}
                    {data.conjuge_rg && <> · RG: {data.conjuge_rg}</>}
                  </p>
                  {data.conjuge_telefone && <p>Telefone: {data.conjuge_telefone}</p>}
                  {data.conjuge_endereco && <p>Endereço: {data.conjuge_endereco}</p>}
                </>
              )}
            </div>

            <p>
              Pela presente autorização para venda de imóvel, que é feita em cumprimento à
              Resolução 458/95 do COFECI (Conselho Federal de Corretores de Imóveis),
              autorizo(a) a <strong>SACRA Soluções Imobiliárias</strong>, CNPJ
              30.577.408/0001-91 e CRECI J. 24.788/DF, com escritório sito à EPTG Chácara 68,
              Loja 01, Park Way (Águas Claras), Brasília-DF, CEP: 72005-355, doravante
              denominada simplesmente CONTRATADA, juntamente com todas as agências que compõem
              ou venham a compor a Rede Netimóveis, a intermediar a venda do imóvel abaixo
              descrito, a promoverem, em caráter irrevogável, irretratável, a venda, permuta ou
              cessão do imóvel de minha (nossa) propriedade, nos seguintes termos:
            </p>

            <div>
              <p className="font-semibold">Imóvel</p>
              <p>Endereço completo: {data.imovel_endereco}</p>
              <p>
                {data.imovel_cep && <>CEP: {data.imovel_cep} · </>}
                Valor Condomínio: {brl(data.imovel_valor_condominio)}
              </p>
              <p>
                {data.imovel_area_construida && <>Área construída: {data.imovel_area_construida} m² · </>}
                {data.imovel_area_lote && <>Área lote: {data.imovel_area_lote} m²</>}
              </p>
              {data.imovel_inscricao_iptu && <p>Inscrição de IPTU: {data.imovel_inscricao_iptu}</p>}
              {data.imovel_matricula && <p>Matrícula: {data.imovel_matricula}</p>}
              {data.observacoes && <p>Descrição do imóvel: {data.observacoes}</p>}
            </div>

            <p>
              <strong>Tipo de autorização:</strong>{" "}
              {data.exclusividade ? "COM exclusividade" : "SEM exclusividade"} ·{" "}
              <strong>Valor de anúncio:</strong> {brl(data.valor_imovel)} ·{" "}
              <strong>Comissão:</strong> {data.comissao_percentual}%
            </p>

            <div className="space-y-2 border-t border-border pt-3">
              <p className="font-semibold">Termos</p>
              <p>
                <strong>I.</strong> A presente autorização é concedida pelo prazo de{" "}
                {data.prazo_dias} ({data.prazo_dias} dias) contados da data de sua assinatura.
                Após o prazo estipulado neste item, não havendo manifestação expressa de
                qualquer das partes, a presente autorização de venda passará a vigorar por
                prazo indeterminado.
                {data.exclusividade && (
                  <>
                    {" "}
                    Durante o prazo de vigência, esta autorização é <strong>EXCLUSIVA</strong>{" "}
                    — não é permitida a intermediação da venda deste imóvel por qualquer outra
                    pessoa física ou jurídica.
                  </>
                )}
              </p>
              <p>
                <strong>II.</strong> Uma vez efetivada a transação imobiliária pela CONTRATADA,
                o(a)(s) PROPRIETÁRIO(A)(S) se compromete(m) a pagar à CONTRATADA o equivalente
                a {data.comissao_percentual}% do valor efetivo do negócio.
              </p>
              <p>
                <strong>III.</strong> A remuneração pactuada no item II será igual e
                integralmente devida se, vencido o prazo aqui estabelecido, o negócio se
                concretizar com qualquer pessoa, física ou jurídica, que tenha sido apresentada
                pela CONTRATADA (art. 727, do Código Civil Brasileiro).
              </p>
              <p>
                <strong>IV.</strong> Para a promoção da venda do imóvel objeto desta, será
                estabelecida pela CONTRATADA e por suas agências, às suas expensas, estratégias
                de marketing de sua livre escolha.
              </p>
              <p>
                <strong>V.</strong> O(A)(s) PROPRIETÁRIO(A)(S) autoriza(m) a irrestrita
                utilização e divulgação de fotos e dados do imóvel objeto desta autorização no
                site &quot;www.netimoveis.com&quot;, e suas redes sociais, ou qualquer outro,
                desde que idôneo, eleito pela CONTRATADA, autorizando também que a CONTRATADA,
                juntamente com as agências da Rede Netimóveis, façam a divulgação utilizando
                placas/adesivos/anúncios/faixas, na forma permitida na legislação municipal.
              </p>
              <p>
                <strong>VI.</strong> O(A)(s) PROPRIETÁRIO(A)(S) concede(m) e aceita(m),
                declara(m)-se ciente(s) e concorda(m), de forma inequívoca, com a utilização e
                tratamento dos seus dados pessoais aqui fornecidos, com a finalidade única e
                exclusiva de impulsionar o objeto deste contrato, ficando autorizada a
                veiculação dos dados dentro das integrantes da Rede Netimóveis e de outras
                imobiliárias, sites e portais de anúncios.
              </p>
              <p>
                <strong>VII.</strong> A presente autorização, sendo assinada eletronicamente
                pelas partes por meio de assinatura eletrônica simples (identificação por nome
                declarado, assinatura manuscrita digitalizada, data, hora e endereço IP de
                acesso registrados no momento da assinatura), possui validade jurídica nos
                termos do art. 10, §2º, da MP 2.200-2/2001, que reconhece a validade de
                assinaturas eletrônicas entre partes que consintam em utilizá-las como meio de
                prova.
              </p>
              <p>
                <strong>VIII.</strong> Fica eleito o foro da Comarca de {data.foro} como o
                competente para dirimir quaisquer dúvidas e/ou pendências decorrentes desta
                autorização, com exclusão de qualquer outro, por mais privilegiado que seja.
              </p>
            </div>

            <p className="text-ink-muted">{dataExtenso(data.criado_em)}.</p>
          </div>

          <AssinaturaForm token={token} nomeEsperado={data.nome_esperado} />
        </>
      )}
    </div>
  );
}
