import { dataBR } from "@/lib/termo-entrega/calculo";
import { compradores, vendedores } from "@/lib/termo-entrega/conteudo";
import { formatarCentavos } from "@/lib/termo-entrega/extenso";
import { AssinaturaForm } from "./assinatura-form";
import { buscarPorToken } from "./dados";

export const metadata = { title: "Assinar Termo de Entrega de Chaves — Sacra Netimóveis" };

export default async function AssinarTermoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dados = await buscarPorToken(token);
  const r = dados?.retrato;
  const doc = r?.documento;

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 py-10">
      <div className="mb-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/sacra-logo-vertical-bordo.png" alt="Sacra Netimóveis" className="mx-auto h-24 w-auto object-contain" />
      </div>

      {!dados || !r || !doc ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-base font-semibold text-ink">Link inválido ou expirado</p>
          <p className="mt-1 text-sm text-ink-muted">O documento pode ter sido alterado. Peça à Sacra para enviar um novo link.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 space-y-4 rounded-xl border border-border bg-surface p-6 text-sm leading-relaxed text-ink shadow-sm">
            <h1 className="text-center text-base font-bold uppercase tracking-wide">Termo de Entrega de Chaves e Proporcionalidade</h1>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-ink-muted">Imóvel</dt>
                <dd>{doc.imovel.endereco}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Vendedor(es)</dt>
                <dd>{vendedores(doc).map((p) => p.nome).join("; ")}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Comprador(es)</dt>
                <dd>{compradores(doc).map((p) => p.nome).join("; ")}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Data da entrega das chaves</dt>
                <dd>{dataBR(doc.dataEntrega)}</dd>
              </div>
            </dl>
            <div className="rounded-lg bg-background px-4 py-3">
              <p className="text-xs text-ink-muted">Acerto entre as partes</p>
              <p className="text-lg font-bold">{formatarCentavos(r.acerto.saldoCentavos)}</p>
              <p className="text-xs font-semibold">{r.textos.resultado}</p>
            </div>
            <a href={`/assinar-termo/${token}/pdf`} target="_blank" rel="noreferrer" className="block rounded-md border border-brand px-4 py-2.5 text-center text-sm font-medium text-brand hover:bg-brand-soft">
              Abrir o documento completo (PDF)
            </a>
            <p className="text-xs text-ink-muted">Leia o documento completo antes de assinar. Em caso de dúvida ou divergência, não assine e fale com a Sacra.</p>
          </div>

          {dados.signatario.ja_assinado ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
              <p className="text-base font-semibold text-emerald-800">Você já assinou este documento</p>
              <p className="mt-1 text-sm text-emerald-700">
                {dados.termo.status === "assinado" ? "Todas as partes já assinaram. O PDF acima traz as assinaturas." : "Aguardando a assinatura das demais partes."}
              </p>
            </div>
          ) : (
            <AssinaturaForm token={token} nomeEsperado={dados.signatario.nome_esperado} />
          )}
        </>
      )}
    </div>
  );
}
