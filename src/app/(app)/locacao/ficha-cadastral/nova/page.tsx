import Link from "next/link";
import { criarFichaLocacao } from "../actions";

const campo = "mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";

export default function NovaFichaLocacaoPage() {
  return <div className="mx-auto max-w-2xl space-y-5">
    <div><Link href="/locacao/ficha-cadastral" className="text-sm text-ink-muted hover:text-brand">← Voltar às fichas</Link><h1 className="mt-3 text-3xl font-bold tracking-tight">Nova ficha cadastral</h1><p className="mt-2 text-sm text-ink-muted">Informe apenas os dados necessários para identificar a solicitação. O cliente preencherá o restante. Esta é a ficha do titular; corresponsável e fiador ganham cada um a própria ficha, que você cria depois, dentro desta.</p></div>
    <form action={criarFichaLocacao} className="space-y-5 rounded-xl border border-border bg-white p-5 shadow-sm sm:p-7">
      <label className="block text-sm font-medium">Nome do proponente<input className={campo} name="proponente_nome" required autoComplete="name" /></label>
      <label className="block text-sm font-medium">E-mail do proponente<input className={campo} type="email" name="proponente_email" required autoComplete="email" /></label>
      <label className="block text-sm font-medium">Imóvel de interesse<input className={campo} name="imovel_referencia" required placeholder="Ex.: SQN 208 Bloco E, apto. 502" /></label>
      <label className="block text-sm font-medium">Validade do link<select className={campo} name="validade_dias" defaultValue="30"><option value="7">7 dias</option><option value="15">15 dias</option><option value="30">30 dias</option><option value="60">60 dias</option></select></label>
      <div className="flex justify-end gap-3 border-t border-border pt-5"><Link href="/locacao/ficha-cadastral" className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold">Cancelar</Link><button className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white">Criar e gerar link</button></div>
    </form>
  </div>;
}
