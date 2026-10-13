import type { ReactNode } from "react";
import { Palco } from "../casca";
import { cx } from "../ui";
import { TelaInicio } from "../telas/inicio";
import { TelaProcesso } from "../telas/processo";
import { TelaFinanceiro } from "../telas/financeiro";
import { TelaMinhasVendas } from "../telas/minhas-vendas";
import { TelaResultados } from "../telas/resultados";
import { TelaAvaliacao } from "../telas/avaliacao";
import { TelaRelatorio } from "../telas/relatorio";

type Tela = { id: string; rotulo: string; resumo: string; testar: string[]; decisoes: string[]; render: () => ReactNode; altura?: number };

export const TELAS: Tela[] = [
  {
    id: "inicio", rotulo: "Início", resumo: "O que precisa de atenção hoje, já com a próxima ação.",
    testar: ["Troque o perfil entre Gestão, Operacional e Corretor.", "Toque num vidro da tabela “O dia, por área” para filtrar a lista.", "Abra uma pendência, marque como feita e use “Desfazer” no aviso.", "Abra “Buscar ou criar” e procure “SQN”."],
    decisoes: ["A tabela área × urgência substitui os quadros kanban do início: mostra onde está o trabalho sem rolar.", "A cor só aparece nos vidros que têm pendência; vazio fica neutro.", "Cada linha tem uma ação direta; o detalhe abre ao lado, sem trocar de tela."],
    render: () => <TelaInicio />,
  },
  {
    id: "processo", rotulo: "Processo de venda", resumo: "Etapas, prazos, responsáveis e o que falta para andar.",
    testar: ["Conclua a etapa atrasada informando a data.", "Veja a etapa ocasional (alvará) fora da linha do tempo.", "No celular, as etapas viram uma lista vertical e as abas ficam roláveis."],
    decisoes: ["Linha do tempo horizontal no computador mostra o processo inteiro de uma vez.", "Nomes longos de partes quebram linha em vez de serem cortados.", "Documentos mostram o que falta, não só o que existe."],
    render: () => <TelaProcesso />,
  },
  {
    id: "financeiro", rotulo: "Financeiro", resumo: "Lançamentos por situação, com baixa em lote e leitura clara de valores.",
    testar: ["Filtre por “Vencidos” e “Hoje”.", "Selecione vários lançamentos e dê baixa de uma vez (há confirmação e desfazer).", "Busque por um texto que não existe para ver o estado vazio.", "Simule erro de conexão e carregamento."],
    decisoes: ["Valores alinhados à direita, com fonte de números tabulares.", "Situação com ícone e palavra, nunca só cor.", "No celular, cada lançamento vira um cartão com uma única caixa de seleção."],
    render: () => <TelaFinanceiro />,
  },
  {
    id: "minhas", rotulo: "Minhas vendas", resumo: "O corretor acompanha suas vendas, prazos e comissões.",
    testar: ["Abra uma venda para ver a linha do tempo de atualizações.", "Veja a venda sem comissão cadastrada.", "Troque para a aba Comissões."],
    decisoes: ["Só o que é do corretor: nenhuma informação interna ou de outros beneficiários.", "Comissão “sem valor cadastrado” aparece como ausência explícita, não como zero."],
    render: () => <TelaMinhasVendas />,
  },
  {
    id: "resultados", rotulo: "Resultados", resumo: "VGV, VGC, meta e ranking da equipe.",
    testar: ["Passe o mouse ou toque nas barras dos meses.", "Note julho sem vendas: o mês aparece, com zero.", "Veja o aviso de pendências na conferência do VGC."],
    decisoes: ["Um número principal por bloco; comparação sempre com a meta.", "Ranking com barras proporcionais e nomes longos quebrando linha."],
    render: () => <TelaResultados />,
  },
  {
    id: "avaliacao", rotulo: "Avaliação de imóvel", resumo: "Estudo de mercado em 3 passos, com preço sugerido editável.",
    testar: ["Passo 2: desligue e ligue referências e veja a referência calculada mudar.", "Ajuste uma referência (pior, igual, melhor) e veja o R$/m².", "Tente usar a referência que é o próprio imóvel.", "Passo 3: mude o preço recomendado em mais de 5% para ver o motivo obrigatório.", "Deixe menos de 3 referências para ver como o sistema trata a falta de dados."],
    decisoes: ["Comparativo calculado sozinho; outros métodos só quando fazem sentido.", "Quatro valores por dentro, um em destaque para o cliente.", "Fator de oferta aplicado aos anúncios e visível."],
    render: () => <TelaAvaliacao />, altura: 900,
  },
  {
    id: "relatorio", rotulo: "Relatório ao cliente", resumo: "Estudo de mercado em A4 vertical, legível no celular.",
    testar: ["Veja no celular: o preço aparece na primeira tela.", "Compare com o estudo do DIL: um único preço em todo o documento."],
    decisoes: ["Serifada editorial só nos documentos ao cliente.", "Quatro páginas e anexos opcionais.", "Aviso legal de que não é laudo nem PTAM."],
    render: () => <TelaRelatorio />, altura: 980,
  },
];

export function PaginaTelas({ tela }: { tela: string }) {
  const atual = TELAS.find((t) => t.id === tela) ?? TELAS[0];
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 @5xl:flex-row @5xl:items-end @5xl:justify-between">
        <div>
          <h1 className="text-[32px] font-bold leading-tight">Telas representativas</h1>
          <p className="mt-1 max-w-[70ch] text-chumbo-2">Sete telas escolhidas para pôr o sistema à prova: muita informação, nomes longos, pendências e ausência de dados. Tudo é clicável e usa dados fictícios.</p>
        </div>
      </div>
      <nav aria-label="Telas" className="rolagem -mx-4 flex gap-px overflow-x-auto border-y border-chumbo bg-filete px-4 @3xl:mx-0 @3xl:border-x @3xl:px-0">
        {TELAS.map((t, i) => (
          <a key={t.id} href={`#telas-${t.id}`} aria-current={t.id === atual.id ? "page" : undefined}
            className={cx("flex min-h-12 shrink-0 items-center gap-2 px-4 text-sm font-medium @3xl:flex-1 @3xl:justify-center", t.id === atual.id ? "bg-chumbo text-vidro" : "bg-vidro text-chumbo-2 hover:text-chumbo")}>
            <span className={cx("num text-xs", t.id === atual.id ? "text-ouro-luz" : "text-chumbo-3")}>{i + 1}</span>{t.rotulo}
          </a>
        ))}
      </nav>
      <div className="space-y-5">
        <aside className="grid min-w-0 gap-5 @5xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          <div>
            <h2 className="text-[22px] font-bold">{atual.rotulo}</h2>
            <p className="mt-1 text-chumbo-2">{atual.resumo}</p>
          </div>
          <div className="caixilho @3xl:grid-cols-2">
            <div className="px-4 py-3">
              <h3 className="text-sm font-semibold">Para testar</h3>
              <ul className="mt-2 space-y-1.5 text-[14px] text-chumbo-2">{atual.testar.map((t) => <li key={t} className="flex gap-2"><span aria-hidden className="mt-2 size-1.5 shrink-0 bg-ouro-luz" />{t}</li>)}</ul>
            </div>
            <div className="px-4 py-3">
              <h3 className="text-sm font-semibold">Decisões</h3>
              <ul className="mt-2 space-y-1.5 text-[14px] text-chumbo-2">{atual.decisoes.map((t) => <li key={t} className="flex gap-2"><span aria-hidden className="mt-2 size-1.5 shrink-0 bg-chumbo-3" />{t}</li>)}</ul>
            </div>
          </div>
        </aside>
        <Palco key={atual.id} altura={atual.altura ?? 820}>{() => atual.render()}</Palco>
      </div>
    </div>
  );
}
