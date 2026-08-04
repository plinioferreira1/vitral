import { createClient } from "@/lib/supabase/server";
import { AssinaturaForm } from "./assinatura-form";

function brl(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function AssinarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: dataRaw } = await supabase.rpc("assinatura_buscar", { p_token: token }).maybeSingle();
  const data = dataRaw as {
    signatario_id: string;
    nome_esperado: string;
    ja_assinado: boolean;
    autorizacao_titulo: string;
    imovel_endereco: string;
    vendedor_nome: string;
    valor_imovel: number | null;
    comissao_percentual: number | null;
    prazo_dias: number | null;
    exclusividade: boolean;
    observacoes: string | null;
    status_autorizacao: string;
  } | null;

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 py-10">
      <div className="mb-6 text-center">
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
          <div className="mb-6 rounded-xl border border-border bg-surface p-6 shadow-sm">
            <h1 className="mb-1 text-lg font-semibold text-ink">{data.autorizacao_titulo}</h1>
            <p className="mb-4 text-sm text-ink-muted">Assinatura de: {data.nome_esperado}</p>

            <div className="space-y-3 text-sm leading-relaxed text-ink">
              <p>
                Eu, <strong>{data.vendedor_nome}</strong>, na qualidade de proprietário(a),
                autorizo a <strong>Sacra Netimóveis</strong> a intermediar a venda do imóvel
                situado em <strong>{data.imovel_endereco}</strong>, pelo valor de{" "}
                <strong>{brl(data.valor_imovel)}</strong>.
              </p>
              <p>
                A comissão devida à Sacra Netimóveis em caso de venda concretizada será de{" "}
                <strong>{data.comissao_percentual}%</strong> sobre o valor efetivo da venda.
              </p>
              <p>
                Esta autorização é válida por <strong>{data.prazo_dias} dias</strong> a partir
                da data de assinatura,{" "}
                {data.exclusividade
                  ? "em regime de EXCLUSIVIDADE — durante esse período, nenhuma outra imobiliária ou pessoa está autorizada a intermediar a venda deste imóvel."
                  : "sem regime de exclusividade."}
              </p>
              {data.observacoes && (
                <p className="text-ink-muted">
                  <strong className="text-ink">Observações:</strong> {data.observacoes}
                </p>
              )}
            </div>
          </div>

          <AssinaturaForm token={token} />
        </>
      )}
    </div>
  );
}
