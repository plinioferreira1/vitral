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
  imoveis_visitados: { descricao: string; codigo: string | null; valor: number | null }[] | null;
  hora_visita: string | null;
  nota: number | null;
  feedback: string | null;
  observacoes: string | null;
}

export default async function VisitarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: dataRaw } = await supabase.rpc("termo_visita_buscar_ficha" as "termo_visita_buscar", { p_token: token }).maybeSingle();
  const data = dataRaw as DadosVisita | null;

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:py-10">
      <div className="mb-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/sacra-logo-vertical-bordo.png"
          alt="Sacra Netimóveis"
          className="mx-auto h-20 w-auto object-contain sm:h-24"
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
          <div className="mb-6 space-y-5 overflow-hidden break-words rounded-2xl border border-border bg-surface p-5 text-sm leading-7 text-ink shadow-sm sm:p-8">
            <h1 className="border-b border-border pb-5 text-center text-xl font-bold leading-tight tracking-tight text-brand sm:text-2xl">
              Termo de Visita de Imóvel
            </h1>

            <div>
              <p className="font-semibold">Imóvel visitado</p>
              <div className="space-y-1">{(data.imoveis_visitados?.length ? data.imoveis_visitados : [{ descricao: data.imovel_endereco, codigo: data.codigo_imovel, valor: data.valor_imovel }]).map((imovel, i) => <p key={i}>{String.fromCharCode(97 + i)}. {imovel.descricao} — {imovel.codigo ?? "sem código"} — {brl(imovel.valor)}</p>)}</div>
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

            <div className="rounded-xl border border-border bg-background p-4">
              <p className="font-semibold">Feedback da visita</p>
              <p>Nota: {data.nota ?? "—"} / 10</p>
              <p>Impressão: {data.feedback === "vai_fazer_proposta" ? "Gostou e vai fazer proposta" : data.feedback === "vai_voltar" ? "Gostou e quer voltar" : data.feedback === "vai_manter_consideracao" ? "Manterá o imóvel em consideração" : data.feedback === "nao_gostou_quer_outras" ? "Quer ver outras opções" : "Não informado"}</p>
              <p>Observações: {data.observacoes ?? "—"}</p>
            </div>
            <p className="text-ink-muted">{dataExtenso(data.data_visita)}.</p>
            <div className="border-t border-border pt-4"><h2 className="mb-2 font-semibold text-brand">Assinatura do cliente</h2><AssinaturaVisitaForm token={token} /></div>
          </div>
        </>
      )}
    </div>
  );
}
