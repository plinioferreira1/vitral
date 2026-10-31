import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { VoltarLink } from "@/components/voltar-link";
import { CampoMoeda } from "@/components/campo-moeda";
import { BotaoSubmit } from "@/components/botao-submit";
import { hojeISO } from "@/lib/data-br";
import { criarTermoVisita } from "../actions";

const field = INPUT_CLASS + " min-h-11 w-full text-base sm:text-sm";

export default function NovoTermoVisitaPage() {
  const hoje = hojeISO();
  return (
    <div className="mx-auto w-full min-w-0 space-y-6">
      <div><VoltarLink href="/termos-visita" label="Termos de Visita" /><CabecalhoPagina titulo="Novo termo de visita" descricao="Ficha de visita no formato comercial da Sacra, com até sete imóveis, feedback e assinatura digital." /></div>
      <form action={criarTermoVisita} className={CARD_CLASS + " space-y-7 p-5 sm:p-7"}>
        <div className="flex items-end justify-between gap-3 border-b border-border pb-4"><h1 className="text-xl font-semibold text-ink">TERMO DE VISITA DE IMÓVEIS</h1><span className="text-xs text-ink-muted">SACRA NETIMÓVEIS</span></div>
        <section>
          <h2 className="mb-3 text-base font-semibold text-brand">Imóveis visitados</h2>
          <p className="mb-3 text-xs text-ink-muted">Preencha o primeiro imóvel e acrescente outros, se necessário. Até sete imóveis na mesma visita.</p>
          <div className="overflow-x-auto rounded-xl border border-border"><table className="min-w-[580px] w-full text-sm"><thead className="bg-background text-left text-xs text-ink-muted"><tr><th className="px-3 py-3">#</th><th>Imóvel visitado / endereço</th><th>Código</th><th>Valor (R$)</th></tr></thead><tbody>{Array.from({length:7},(_,i)=><tr key={i} className="border-t border-border"><td className="px-3 text-xs text-ink-muted">{String.fromCharCode(97+i)}</td><td className="p-1"><input name={i===0?"imovel":`imovel_${i}`} required={i===0} aria-label={`Imóvel ${i+1}`} className={field} placeholder={i===0?"Endereço ou identificação do imóvel":""}/></td><td className="p-1"><input name={i===0?"codigo_imovel":`codigo_imovel_${i}`} aria-label={`Código do imóvel ${i+1}`} className={field}/></td><td className="p-1"><CampoMoeda name={i===0?"valor_imovel":`valor_imovel_${i}`} className={field} placeholder="0,00"/></td></tr>)}</tbody></table></div>
        </section>
        <section className="space-y-3">
          <h2 className="border-b border-border pb-2 text-base font-semibold text-brand">Cliente</h2>
          <label className="block text-sm">Nome completo<input name="cliente_nome" required className={field}/></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">CPF<input name="cliente_cpf_informado" className={field}/></label><label className="block text-sm">RG<input name="cliente_rg_informado" className={field}/></label></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">Telefone(s)<input name="cliente_telefone" type="tel" className={field}/></label><label className="block text-sm">E-mail<input name="cliente_email" type="email" className={field}/></label></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">Data<input name="data_visita" type="date" defaultValue={hoje} className={field}/></label><label className="block text-sm">Hora<input name="hora_visita" type="time" className={field}/></label></div>
          <p className="rounded-lg bg-background p-3 text-xs text-ink-muted">Assinatura do cliente: coletada eletronicamente pelo link gerado após a criação do termo.</p>
        </section>
        <section className="space-y-3">
          <h2 className="border-b border-border pb-2 text-base font-semibold text-brand">Feedback da visita</h2>
          <p className="text-sm text-ink-muted">Nota atribuída ao imóvel (0 = muito ruim; 10 = excelente)</p>
          <div className="flex flex-wrap gap-3">{Array.from({length:11},(_,nota)=><label key={nota} className="flex items-center gap-1 text-sm"><input type="radio" name="nota" value={nota}/>{nota}</label>)}</div>
          <div className="space-y-2 text-sm">{[
            ["vai_fazer_proposta","Gostou e vai fazer proposta."],
            ["vai_voltar","Gostou mas vai querer voltar no imóvel."],
            ["vai_manter_consideracao","Gostou e vai manter este imóvel nas suas considerações."],
            ["nao_gostou_quer_outras","Não gostou do imóvel e quer ver outras opções."]
          ].map(([value,label])=><label key={value} className="flex items-start gap-3"><input type="radio" name="feedback" value={value} className="mt-1"/><span>{label}</span></label>)}</div>
        </section>
        <section><h2 className="mb-2 text-base font-semibold text-brand">Observações</h2><textarea name="observacoes" rows={4} className={field} placeholder="Observações sobre as visitas e preferências do cliente"/></section>
        <section className="space-y-3"><h2 className="border-b border-border pb-2 text-base font-semibold text-brand">Corretor | Parceiro</h2><label className="block text-sm">Nome<input name="corretor_nome" className={field}/></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">CRECI<input name="corretor_creci" className={field}/></label><label className="block text-sm">CRECI J.<input name="corretor_creci_j" className={field}/></label></div><label className="block text-sm">Imobiliária<input name="imobiliaria_parceira" className={field} defaultValue="Sacra Netimóveis"/></label><p className="text-xs text-ink-muted">Assinatura do corretor parceiro: espaço reservado na impressão. A assinatura eletrônica do corretor requer fluxo próprio de signatários.</p></section>
        <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-medium">Condições jurídicas do termo existente</summary><p className="mt-2 text-xs text-ink-muted">A declaração de intermediação, multa e ciência de tratamento de dados continuam disponíveis na página de assinatura digital. Não foram removidas.</p><label className="mt-3 block text-xs">Multa por descumprimento (%)<input className={field} name="multa_percentual" type="number" step=".01" defaultValue={6}/></label></details>
        <BotaoSubmit className={PRIMARY_BUTTON_CLASS+" min-h-11 w-full"}>Criar termo e gerar link de assinatura</BotaoSubmit>
      </form>
    </div>
  );
}
