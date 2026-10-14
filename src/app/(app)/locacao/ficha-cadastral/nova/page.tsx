import Link from "next/link";
import { FilePlus2, Link2 } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { VoltarLink } from "@/components/voltar-link";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { criarFichaLocacao } from "../actions";

const campo = `${INPUT_CLASS} mt-1.5 min-h-11 text-base sm:text-sm`;

export default function NovaFichaLocacaoPage() {
  return <div className="mx-auto w-full min-w-0 space-y-6">
    <div><VoltarLink href="/locacao/ficha-cadastral" label="Fichas cadastrais" /><CabecalhoPagina titulo="Nova ficha cadastral" descricao="Gere um link individual sem cadastrar o cliente. Ele informa os próprios dados e assina a ficha." /></div>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <form action={criarFichaLocacao} className={`${CARD_CLASS} space-y-5 p-5 sm:p-6`}>
        <div className="flex items-center gap-3 border-b border-border pb-4"><span className="rounded-lg bg-brand-soft p-2 text-brand"><Link2 size={20} /></span><div><h2 className="font-semibold text-ink">Link para preenchimento</h2><p className="mt-0.5 text-sm text-ink-muted">Você não precisa informar nome nem e-mail para gerar o link.</p></div></div>
        <label className="block text-sm font-medium text-ink">Imóvel de interesse (opcional)<input className={campo} name="imovel_referencia" maxLength={500} placeholder="Ex.: SQN 208 Bloco E, apto. 502" /><span className="mt-1.5 block text-xs font-normal text-ink-muted">Se deixar em branco, o cliente informa o imóvel na ficha.</span></label>
        <label className="block text-sm font-medium text-ink">Validade do link<select className={campo} name="validade_dias" defaultValue="30"><option value="7">7 dias</option><option value="15">15 dias</option><option value="30">30 dias</option><option value="60">60 dias</option></select></label>
        <details className="rounded-lg border border-border p-4"><summary className="min-h-11 cursor-pointer text-sm font-semibold text-ink">Preencher dados do cliente antecipadamente (opcional)</summary><div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">Nome do proponente (opcional)<input className={campo} name="proponente_nome" autoComplete="name" maxLength={200} placeholder="Nome completo do titular" /></label>
          <label className="block text-sm font-medium text-ink">E-mail do proponente (opcional)<input className={campo} type="email" name="proponente_email" autoComplete="email" maxLength={254} placeholder="nome@exemplo.com.br" /></label>
        </div></details>
        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end"><Link href="/locacao/ficha-cadastral" className={`${SECONDARY_BUTTON_CLASS} min-h-11`}>Cancelar</Link><BotaoEnviar textoEnviando="Criando ficha…" className={`${PRIMARY_BUTTON_CLASS} min-h-11`}><FilePlus2 size={16} /> Gerar link do cliente</BotaoEnviar></div>
      </form>
      <aside className={`${CARD_CLASS} p-5`}><Link2 size={21} className="text-brand" /><h2 className="mt-3 text-sm font-semibold text-ink">Como funciona</h2><ol className="mt-3 space-y-3 text-sm leading-6 text-ink-muted"><li>1. Gere um link para cada cliente, copie e envie ao titular.</li><li>2. Ele informa nome, e-mail e os demais dados. Pode salvar e continuar depois.</li><li>3. Adicione corresponsável ou fiador dentro da ficha. Cada pessoa recebe seu próprio link.</li><li>4. Após a conclusão, confira os dados e baixe o PDF assinado.</li></ol></aside>
    </div>
  </div>;
}
