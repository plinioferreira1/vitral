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

interface Condicao {
  descricao: string;
  valor: number | null;
}

interface DadosAssinatura {
  signatario_id: string;
  nome_esperado: string;
  ja_assinado: boolean;
  imovel_endereco: string;
  proponente_nome: string;
  proponente_cpf: string | null;
  segundo_proponente_nome: string | null;
  segundo_proponente_cpf: string | null;
  valor_total: number | null;
  prazo_dias_validade: number | null;
  condicoes: Condicao[];
  observacoes: string | null;
  status_proposta: string;
  criado_em: string;
}

export default async function AssinarPropostaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: dataRaw } = await supabase
    .rpc("carta_proposta_assinatura_buscar", { p_token: token })
    .maybeSingle();
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
              Carta Proposta de Compra de Imóvel
            </h1>

            <p>À Sacra Imóveis</p>
            <p>
              Ref.: Proposta de compra – {data.imovel_endereco}
            </p>

            <p>
              Eu, <strong>{data.proponente_nome}</strong>
              {data.proponente_cpf && <>, inscrito(a) no CPF {data.proponente_cpf}</>}
              {data.segundo_proponente_nome && (
                <>
                  , em conjunto com <strong>{data.segundo_proponente_nome}</strong>
                  {data.segundo_proponente_cpf && <>, CPF {data.segundo_proponente_cpf}</>}
                </>
              )}
              , venho, por meio desta, formalizar proposta de compra do imóvel localizado em{" "}
              {data.imovel_endereco}, pelo valor total de <strong>{brl(data.valor_total)}</strong>,
              nas seguintes condições de pagamento:
            </p>

            {data.condicoes.length > 0 && (
              <ul className="list-disc space-y-1 pl-5">
                {data.condicoes.map((c, i) => (
                  <li key={i}>
                    {c.descricao} — {brl(c.valor)}
                  </li>
                ))}
              </ul>
            )}

            <p>
              A presente proposta é válida pelo prazo de{" "}
              <strong>{data.prazo_dias_validade} dias úteis</strong>, contados a partir da data
              desta carta.
            </p>

            <p>
              Declaro estar ciente de que esta proposta está sujeita à aceitação do proprietário e,
              se for o caso, à aprovação de crédito junto à instituição financeira responsável pelo
              financiamento.
            </p>

            <p>
              Coloco-me à disposição para quaisquer esclarecimentos e para formalização dos
              trâmites necessários à efetivação da compra, caso a proposta seja aceita.
            </p>

            {data.observacoes && (
              <p className="border-t border-border pt-3">
                <strong>Observações:</strong> {data.observacoes}
              </p>
            )}

            <p className="border-t border-border pt-3 text-xs text-ink-muted">
              A presente proposta, sendo assinada eletronicamente pelas partes por meio de
              assinatura eletrônica simples (identificação por nome declarado, assinatura
              manuscrita digitalizada, data, hora e endereço IP de acesso registrados no momento da
              assinatura), possui validade jurídica nos termos do art. 10, §2º, da MP 2.200-2/2001,
              que reconhece a validade de assinaturas eletrônicas entre partes que consintam em
              utilizá-las como meio de prova. Representado por: Sacra Imóveis.
            </p>

            <p className="text-ink-muted">{dataExtenso(data.criado_em)}.</p>
          </div>

          <AssinaturaForm token={token} nomeEsperado={data.nome_esperado} />
        </>
      )}
    </div>
  );
}
