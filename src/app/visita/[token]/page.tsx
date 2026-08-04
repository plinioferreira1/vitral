import { createClient } from "@/lib/supabase/server";
import { AssinaturaVisitaForm } from "./assinatura-form";

function brl(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataExtenso(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface DadosVisita {
  termo_id: string;
  ja_assinado: boolean;
  imovel_endereco: string;
  codigo_imovel: string | null;
  valor_imovel: number | null;
  cliente_nome: string;
  cliente_telefone: string | null;
  cliente_email: string | null;
  corretor_nome: string | null;
  multa_percentual: number;
  data_visita: string;
  status_termo: string;
}

export default async function VisitarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: dataRaw } = await supabase.rpc("termo_visita_buscar", { p_token: token }).maybeSingle();
  const data = dataRaw as DadosVisita | null;

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
          <p className="text-base font-semibold text-emerald-800">Este termo já foi assinado</p>
          <p className="mt-1 text-sm text-emerald-700">Obrigado — não precisa fazer mais nada.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 space-y-4 rounded-xl border border-border bg-surface p-6 text-sm leading-relaxed text-ink shadow-sm">
            <h1 className="text-center text-base font-bold uppercase tracking-wide">
              Termo de Visita de Imóvel
            </h1>

            <div>
              <p className="font-semibold">Imóvel visitado</p>
              <p>{data.imovel_endereco}</p>
              <p className="text-ink-muted">
                {data.codigo_imovel && <>Código: {data.codigo_imovel} · </>}
                Valor: {brl(data.valor_imovel)}
              </p>
            </div>

            <div>
              <p className="font-semibold">Cliente</p>
              <p>{data.cliente_nome}</p>
              {data.cliente_telefone && <p className="text-ink-muted">Telefone: {data.cliente_telefone}</p>}
            </div>

            <p>
              Declaro que, nesta data, conheci, visitei e obtive as informações necessárias à
              aquisição do imóvel acima descrito, por intermédio d
              {data.corretor_nome ? `o(a) corretor(a) ${data.corretor_nome}` : "e corretor(a)"}
              , ligado(a) à <strong>Sacra Netimóveis</strong>, o(a) qual, de maneira clara e
              diligente, prestou-me toda a consultoria sobre a viabilidade da negociação por
              mim pretendida.
            </p>

            <p>
              Tendo em vista a assessoria prestada, comprometo-me a não efetivar a aquisição do
              imóvel acima relacionado através de outro intermediário ou diretamente do(a)
              proprietário(a); sob pena de, assim o fazendo, obrigar-me a pagar pela assessoria
              que me foi prestada o valor de <strong>{data.multa_percentual}%</strong> (a
              título de multa), calculado sobre o valor do imóvel acima citado, pelo
              descumprimento desta obrigação de fazer.
            </p>

            <p>
              Caso o negócio seja viabilizado por intermédio da Sacra Netimóveis, nada além do
              já pactuado será devido por mim.
            </p>

            <p>
              Concedo e aceito, declaro-me ciente e concordo, de forma inequívoca, que meus
              dados pessoais aqui fornecidos sejam coletados com a finalidade de gerenciar os
              imóveis visitados e traçar o perfil de interesse, sendo armazenados, utilizados e
              descartados de acordo com os Termos de Uso e a Política de Privacidade da Sacra
              Netimóveis, respeitando as normas de segurança da informação e as disposições da
              Lei 13.709/2018 (LGPD).
            </p>

            <p>
              A presente declaração, sendo assinada eletronicamente por meio de assinatura
              eletrônica simples (identificação por nome declarado, assinatura manuscrita
              digitalizada, data, hora e endereço IP de acesso registrados no momento da
              assinatura), possui validade jurídica nos termos do art. 10, §2º, da MP
              2.200-2/2001.
            </p>

            <p className="text-ink-muted">{dataExtenso(data.data_visita)}.</p>
          </div>

          <AssinaturaVisitaForm token={token} />
        </>
      )}
    </div>
  );
}
