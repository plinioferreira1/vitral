import { ShieldCheck } from "lucide-react";

const FASES = [
  { nome: "Fundação", prazo: "1 semana", entra: ["Tokens de cor, tipografia e movimento no estilo global, com modo escuro.", "Fontes Gabarito, Archivo e Newsreader carregadas pelo Next.", "Componentes base: botão, campo, seleção, selo, abas, menu, diálogo, painel lateral, avisos e estados."], risco: "Baixo: telas antigas continuam funcionando; os componentes novos convivem com os atuais.", confere: "Typecheck, lint, testes e build; comparação visual das telas principais antes e depois." },
  { nome: "Casca e Início", prazo: "1 semana", entra: ["Menu lateral e barra inferior no celular; “Buscar ou criar”.", "Novo Início com a tabela área × urgência e próximos passos, usando os dados reais e as permissões atuais."], risco: "Médio: é a primeira tela de todos. Liberar primeiro só para a gestão.", confere: "Conferir contagens contra o banco; testar com os perfis gestor, supervisor e corretor." },
  { nome: "Processos e Financeiro", prazo: "2 semanas", entra: ["Detalhe do processo com linha do tempo, documentos e histórico.", "Lançamentos com baixa em lote, cartões no celular e estados vazios e de erro."], risco: "Médio: telas com muitas ações. Nenhuma regra de negócio muda, só a apresentação.", confere: "Saldos por movimentoPorConta(); baixa em lote testada com desfazer; celular a 390 px." },
  { nome: "Avaliação e relatório", prazo: "2 semanas", entra: ["Estudo de mercado em três passos com a regra de preço proposta (com teste).", "Novo PDF do cliente em A4 vertical, começando pelo preço."], risco: "Médio: versões emitidas antigas não mudam; só estudos novos usam o fluxo.", confere: "Cálculo com testes; PDF conferido com dados fictícios; validação profissional das 11 dúvidas do documento de Avaliação." },
  { nome: "Minhas vendas, Resultados e restante", prazo: "2 semanas", entra: ["Minhas vendas e Resultados no novo visual, mantendo as mesmas consultas e restrições.", "Demais módulos migrados um a um (Locação, Débitos, DP, Férias, Documentos)."], risco: "Baixo a médio, um módulo por vez.", confere: "Testes de isolamento já existentes (Minhas vendas) e revisão de cada módulo." },
];

export function PaginaImplementacao() {
  return (
    <div className="space-y-10">
      <header className="max-w-[72ch]"><h1 className="text-[32px] font-bold leading-tight">Sequência de implementação</h1><p className="mt-2 text-[17px] text-chumbo-2">Em cinco fases, de modo que o Vitral continue funcionando o tempo todo. Cada fase pode ser publicada sozinha, depois da sua aprovação.</p></header>

      <ol className="space-y-px bg-chumbo">
        {FASES.map((f, i) => (
          <li key={f.nome} className="grid gap-4 bg-vidro px-5 py-5 @4xl:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)] @4xl:gap-8 @3xl:px-7">
            <div><span className="num font-titulo text-[30px] font-bold leading-none text-ouro">{i + 1}</span><h2 className="mt-1 text-[20px] font-bold">{f.nome}</h2><p className="text-sm text-chumbo-3">cerca de {f.prazo}</p></div>
            <div><h3 className="text-sm font-semibold">O que entra</h3><ul className="mt-1.5 space-y-1.5 text-[15px] text-chumbo-2">{f.entra.map((e) => <li key={e} className="flex gap-2"><span aria-hidden className="mt-2.5 size-1.5 shrink-0 bg-ouro-luz" />{e}</li>)}</ul></div>
            <div className="space-y-3 text-[15px]"><div><h3 className="text-sm font-semibold">Risco</h3><p className="text-chumbo-2">{f.risco}</p></div><div><h3 className="text-sm font-semibold">Como conferir</h3><p className="text-chumbo-2">{f.confere}</p></div></div>
          </li>
        ))}
      </ol>

      <section className="grid gap-6 @4xl:grid-cols-2">
        <div className="border border-chumbo bg-vidro px-5 py-5">
          <h2 className="text-[20px] font-bold">O que não muda</h2>
          <ul className="mt-2 space-y-1.5 text-[15px] text-chumbo-2">
            <li>Regras de negócio, permissões, RLS e cálculos já testados.</li>
            <li>Versões emitidas de laudos, termos e estudos (são imutáveis).</li>
            <li>Endereços das telas: links salvos continuam funcionando.</li>
            <li>Dados: nenhuma migração de banco é necessária para o visual.</li>
          </ul>
        </div>
        <div className="border border-ok/60 bg-ok-vidro px-5 py-5">
          <h2 className="flex items-center gap-2 text-[20px] font-bold"><ShieldCheck size={22} className="text-ok" aria-hidden />Isolamento deste laboratório</h2>
          <ul className="mt-2 space-y-1.5 text-[15px]">
            <li>Página estática, sem acesso ao banco, às chaves ou ao e-mail do Vitral.</li>
            <li>Todos os nomes, endereços e valores são fictícios.</li>
            <li>Código num ramo separado (laboratorio-design), com publicação automática desligada.</li>
            <li>Nada foi publicado no domínio oficial. A fase 1 só começa com a sua autorização.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
