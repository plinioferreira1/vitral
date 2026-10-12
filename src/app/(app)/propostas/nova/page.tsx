import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { VoltarLink } from "@/components/voltar-link";
import { CampoMoeda } from "@/components/campo-moeda";
import { CampoCPF } from "@/components/campo-cpf";
import { BotaoSubmit } from "@/components/botao-submit";
import { criarCartaProposta } from "../actions";
import { User, ListChecks } from "lucide-react";

const campoClasse = `${INPUT_CLASS} min-h-11 text-base sm:text-sm`;

const NUM_CONDICOES = 6;

export default function NovaCartaPropostaPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6">
      <div>
        <VoltarLink href="/propostas" label="Cartas Proposta" />
        <CabecalhoPagina titulo="Nova carta proposta" descricao={<>
          Depois de criar, você vai poder copiar o link de assinatura do proponente, ou passar o
          celular/tablet pra assinar na hora.
        </>} />
      </div>

      <form
        action={criarCartaProposta}
        className={`${CARD_CLASS} space-y-6 p-5 sm:p-7`}
      >
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <User size={14} strokeWidth={2} />
            Proponente (comprador)
          </p>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ink">Nome completo do proponente<input name="proponente_nome"
              required
              placeholder="Nome completo"
              className={campoClasse}
            /></label>
            <label className="block text-sm font-medium text-ink">CPF do proponente<CampoCPF name="proponente_cpf" className={campoClasse} /></label>
          </div>
        </div>

        <details className="group">
          <summary className="flex min-h-11 cursor-pointer items-center rounded-xl border border-border bg-background/50 p-4 text-sm font-medium text-brand">
            + Adicionar segundo proponente
          </summary>
          <div className="mt-3 space-y-3">
            <label className="block text-sm font-medium text-ink">Nome completo do segundo proponente<input name="segundo_proponente_nome"
              placeholder="Nome completo"
              className={campoClasse}
            /></label>
            <label className="block text-sm font-medium text-ink">CPF do segundo proponente<CampoCPF name="segundo_proponente_cpf" className={campoClasse} /></label>
          </div>
        </details>

        <div>
          <label htmlFor="imovel" className="mb-1 block text-xs font-medium text-ink-muted">
            Imóvel (referência da proposta)
          </label>
          <input id="imovel" name="imovel"
            required
            placeholder="Ex: Apartamento 1402 Bloco A/B, Residencial Duetto"
            className={campoClasse}
          />
        </div>

        <div>
          <label htmlFor="codigo_san" className="mb-1 block text-xs font-medium text-ink-muted">Código SAN</label>
          <input id="codigo_san" name="codigo_san" placeholder="Opcional" className={campoClasse} />
        </div>

        <div>
          <label htmlFor="valor_total" className="mb-1 block text-xs font-medium text-ink-muted">
            Valor total da proposta
          </label>
          <CampoMoeda id="valor_total" className={campoClasse} name="valor_total" placeholder="735.000,00" />
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <ListChecks size={14} strokeWidth={2} />
            Condições de pagamento
          </p>
          <p className="mb-2 text-[11px] text-ink-muted">
            Uma linha pra cada forma de pagamento (ex: entrada, FGTS, financiamento). Deixe em
            branco as que não usar.
          </p>
          <div className="space-y-2">
            {Array.from({ length: NUM_CONDICOES }).map((_, i) => (
              <div key={i} className="grid gap-3 rounded-xl border border-border bg-background/40 p-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                <label className="block text-sm font-medium text-ink">Condição {i + 1}<input name={`condicao_descricao_${i}`}
                  placeholder={
                    i === 0
                      ? "Ex: Entrada de 10% na assinatura do Contrato"
                      : "Ex: Recursos próprios na assinatura da Escritura"
                  }
                  className={campoClasse}
                /></label>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-ink">Valor da condição {i + 1}<CampoMoeda name={`condicao_valor_${i}`} className={campoClasse} placeholder="0,00" /></label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="prazo_dias_validade" className="mb-1 block text-xs font-medium text-ink-muted">
            Prazo de validade da proposta (dias úteis)
          </label>
          <input id="prazo_dias_validade" name="prazo_dias_validade"
            type="number"
            defaultValue={5}
            className={`${campoClasse} max-w-[140px]`}
          />
        </div>

        <div>
          <label htmlFor="observacoes" className="mb-1 block text-xs font-medium text-ink-muted">
            Observações (opcional)
          </label>
          <textarea id="observacoes" name="observacoes"
            rows={3}
            placeholder="Alguma condição especial da proposta"
            className={campoClasse}
          />
        </div>

        <BotaoSubmit className={`${PRIMARY_BUTTON_CLASS} min-h-11 w-full`}>
          Criar proposta
        </BotaoSubmit>
      </form>
    </div>
  );
}
