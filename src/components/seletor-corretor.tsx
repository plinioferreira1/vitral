import { corretoresComissao, type Corretor } from "@/lib/corretores-comissao";
import { INPUT_CLASS } from "@/components/ui/styles";

export function SeletorCorretor({ nome, rotulo, corretores, atual, id = `seletor-${nome}` }: {
  nome: string; rotulo: string; corretores: Corretor[]; atual?: string | null; id?: string;
}) {
  const opcoes = corretoresComissao(corretores, atual);
  const anterior = corretores.find(c => c.id === atual);
  return <div>
    <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-muted">{rotulo}</label>
    <select id={id} name={nome} defaultValue={atual ?? ""} className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}>
      <option value="">Selecione</option>
      {anterior && !opcoes.some(c => c.id === anterior.id) && <option value={anterior.id} hidden>{anterior.nome} (cadastro anterior)</option>}
      {opcoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
    </select>
  </div>;
}
