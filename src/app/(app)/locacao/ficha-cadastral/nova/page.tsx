import Link from "next/link";
import { FilePlus2, Link2, UserRound } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { VoltarLink } from "@/components/voltar-link";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { criarFichaLocacao } from "../actions";

const campo = `${INPUT_CLASS} mt-1.5 min-h-11 text-base sm:text-sm`;

export default function NovaFichaLocacaoPage() {
  return <div className="mx-auto max-w-4xl space-y-6">
    <div><VoltarLink href="/locacao/ficha-cadastral" label="Fichas cadastrais" /><CabecalhoPagina titulo="Nova ficha cadastral" descricao="Crie a solicitação do titular. O cliente recebe um link individual para preencher os dados e assinar." /></div>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <form action={criarFichaLocacao} className={`${CARD_CLASS} space-y-5 p-5 sm:p-6`}>
        <div className="flex items-center gap-3 border-b border-border pb-4"><span className="rounded-lg bg-brand-soft p-2 text-brand"><UserRound size={20} /></span><div><h2 className="font-semibold text-ink">Dados da solicitação</h2><p className="mt-0.5 text-xs text-ink-muted">Os campos abaixo são obrigatórios.</p></div></div>
        <label className="block text-sm font-medium text-ink">Nome do proponente<input className={campo} name="proponente_nome" required autoComplete="name" maxLength={200} placeholder="Nome completo do titular" /></label>
        <label className="block text-sm font-medium text-ink">E-mail do proponente<input className={campo} type="email" name="proponente_email" required autoComplete="email" maxLength={254} placeholder="nome@exemplo.com.br" /></label>
        <label className="block text-sm font-medium text-ink">Imóvel de interesse<input className={campo} name="imovel_referencia" required placeholder="Ex.: SQN 208 Bloco E, apto. 502" /></label>
        <label className="block text-sm font-medium text-ink">Validade do link<select className={campo} name="validade_dias" defaultValue="30"><option value="7">7 dias</option><option value="15">15 dias</option><option value="30">30 dias</option><option value="60">60 dias</option></select></label>
        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end"><Link href="/locacao/ficha-cadastral" className={`${SECONDARY_BUTTON_CLASS} min-h-11`}>Cancelar</Link><BotaoEnviar textoEnviando="Criando ficha…" className={`${PRIMARY_BUTTON_CLASS} min-h-11`}><FilePlus2 size={16} /> Criar e gerar link</BotaoEnviar></div>
      </form>
      <aside className={`${CARD_CLASS} p-5`}><Link2 size={21} className="text-brand" /><h2 className="mt-3 text-sm font-semibold text-ink">Depois de criar</h2><ol className="mt-3 space-y-3 text-sm leading-6 text-ink-muted"><li>1. Copie o link e envie ao titular.</li><li>2. Ele pode salvar o preenchimento e continuar depois.</li><li>3. Adicione corresponsável ou fiador dentro da ficha. Cada pessoa recebe seu próprio link.</li><li>4. Após a conclusão, confira os dados e baixe o PDF assinado.</li></ol></aside>
    </div>
  </div>;
}
