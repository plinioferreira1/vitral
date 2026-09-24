import { VoltarLink } from "@/components/voltar-link";
import { CampoMoeda } from "@/components/campo-moeda";
import { CampoCPF } from "@/components/campo-cpf";
import { BotaoSubmit } from "@/components/botao-submit";
import { criarCartaProposta } from "../actions";

const campoClasse =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

const NUM_CONDICOES = 6;

export default function NovaCartaPropostaPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <VoltarLink href="/propostas" label="Cartas Proposta" />
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Nova carta proposta</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Depois de criar, você vai poder copiar o link de assinatura do proponente, ou passar o
          celular/tablet pra assinar na hora.
        </p>
      </div>

      <form
        action={criarCartaProposta}
        className="space-y-5 rounded-xl border border-border bg-surface p-5 shadow-sm"
      >
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Proponente (comprador)
          </p>
          <div className="space-y-3">
            <input
              name="proponente_nome"
              required
              placeholder="Nome completo"
              className={campoClasse}
            />
            <CampoCPF name="proponente_cpf" className={campoClasse} />
          </div>
        </div>

        <details className="group">
          <summary className="cursor-pointer select-none text-xs font-medium text-brand">
            + Adicionar segundo proponente
          </summary>
          <div className="mt-3 space-y-3">
            <input
              name="segundo_proponente_nome"
              placeholder="Nome completo"
              className={campoClasse}
            />
            <CampoCPF name="segundo_proponente_cpf" className={campoClasse} />
          </div>
        </details>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Imóvel (referência da proposta)
          </label>
          <input
            name="imovel"
            required
            placeholder="Ex: Apartamento 1402 Bloco A/B, Residencial Duetto"
            className={campoClasse}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Código SAN</label>
          <input name="codigo_san" placeholder="Opcional" className={campoClasse} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Valor total da proposta
          </label>
          <CampoMoeda name="valor_total" placeholder="735.000,00" />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Condições de pagamento
          </p>
          <p className="mb-2 text-[11px] text-ink-muted">
            Uma linha pra cada forma de pagamento (ex: entrada, FGTS, financiamento). Deixe em
            branco as que não usar.
          </p>
          <div className="space-y-2">
            {Array.from({ length: NUM_CONDICOES }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  name={`condicao_descricao_${i}`}
                  placeholder={
                    i === 0
                      ? "Ex: Entrada de 10% na assinatura do Contrato"
                      : "Ex: Recursos próprios na assinatura da Escritura"
                  }
                  className={campoClasse}
                />
                <div className="w-36">
                  <CampoMoeda name={`condicao_valor_${i}`} placeholder="0,00" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Prazo de validade da proposta (dias úteis)
          </label>
          <input
            name="prazo_dias_validade"
            type="number"
            defaultValue={5}
            className={`${campoClasse} max-w-[140px]`}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Observações (opcional)
          </label>
          <textarea
            name="observacoes"
            rows={3}
            placeholder="Alguma condição especial da proposta"
            className={campoClasse}
          />
        </div>

        <BotaoSubmit className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
          Criar proposta
        </BotaoSubmit>
      </form>
    </div>
  );
}
