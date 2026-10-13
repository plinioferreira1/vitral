import { ArrowRight } from "lucide-react";
import { cx } from "../ui";

/* Caixilho de abertura: a estrutura de chumbo é a grade da interface; os vidros coloridos são as áreas. */
const VIDROS: { col: string; row: string; cor?: string; rotulo?: string }[] = [
  { col: "1 / 3", row: "1 / 3", cor: "var(--area-venda)", rotulo: "Venda" },
  { col: "3 / 4", row: "1 / 2" },
  { col: "4 / 6", row: "1 / 2", cor: "var(--ouro-luz)" },
  { col: "3 / 5", row: "2 / 4", cor: "var(--area-financiamento)", rotulo: "Financiamento" },
  { col: "5 / 6", row: "2 / 3" },
  { col: "1 / 2", row: "3 / 5" },
  { col: "2 / 3", row: "3 / 4", cor: "var(--area-documentos)" },
  { col: "5 / 6", row: "3 / 5", cor: "var(--area-locacao)", rotulo: "Locação" },
  { col: "2 / 5", row: "4 / 5", cor: "var(--area-financeiro)", rotulo: "Financeiro" },
];

export function PaginaVisao() {
  return (
    <div className="space-y-14">
      <section className="grid items-center gap-8 @5xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] @5xl:gap-14">
        <div>
          <p className="text-sm font-medium text-ouro">Proposta de identidade e experiência · outubro de 2026</p>
          <h1 className="mt-3 text-[38px] font-extrabold leading-[1.02] tracking-[-0.02em] @3xl:text-[56px]">Uma armação firme para a luz passar.</h1>
          <p className="mt-5 max-w-[58ch] text-[17px] leading-[1.6] text-chumbo-2">
            Num vitral, o chumbo segura os vidros e desenha a imagem; a cor só aparece onde a luz atravessa. A proposta para o Vitral segue a mesma lógica:
            uma estrutura neutra e precisa, painéis encostados uns nos outros, e cor apenas onde ela informa algo — a área do trabalho e a situação de cada prazo.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#telas-inicio" className="inline-flex h-11 items-center gap-2 bg-bordo px-4 text-[15px] font-medium text-vidro hover:bg-bordo-vivo">Ver as telas <ArrowRight size={16} aria-hidden /></a>
            <a href="#direcoes" className="inline-flex h-11 items-center border border-chumbo/80 bg-vidro px-4 text-[15px] font-medium hover:bg-vidro-2">Comparar as três direções</a>
          </div>
        </div>
        <figure className="mx-auto w-full max-w-[520px]">
          <div className="grid aspect-[5/4] w-full border-[6px] border-chumbo bg-chumbo p-0" style={{ gridTemplateColumns: "1.1fr .8fr 1fr .9fr 1fr", gridTemplateRows: "1fr 1fr .8fr 1fr", gap: 5 }}>
            {VIDROS.map((v, i) => (
              <div key={i} className={cx("anim-surgir relative flex items-end p-2", !v.cor && "bg-vidro")} style={{ gridColumn: v.col, gridRow: v.row, background: v.cor, animationDelay: `${i * 70}ms` }}>
                {v.rotulo && <span className="text-[12px] font-semibold text-white/95">{v.rotulo}</span>}
              </div>
            ))}
          </div>
          <figcaption className="mt-3 text-[13px] text-chumbo-3">O caixilho: cada vidro é um módulo do sistema; os vidros brancos são o espaço de trabalho. A cor é escassa de propósito.</figcaption>
        </figure>
      </section>

      <section className="grid gap-8 @5xl:grid-cols-[280px_minmax(0,1fr)]">
        <div>
          <h2 className="text-[26px] font-bold leading-tight">O que muda para quem usa</h2>
          <p className="mt-2 text-chumbo-2">Diagnóstico do Vitral atual, com o que a proposta faz a respeito.</p>
        </div>
        <div className="caixilho caixilho-forte @3xl:grid-cols-2">
          {[
            ["Tudo parece igualmente importante.", "Cartões iguais, sombras iguais e muitas cores competem entre si. A proposta tira sombra e cor do que é estrutura e reserva a cor para área e prazo."],
            ["O Início mostra listas, não decisões.", "A nova primeira tela responde “o que está atrasado, em qual área, e qual é a próxima ação”, numa tabela que cabe sem rolar."],
            ["No celular, tabelas apertadas.", "Cada tela tem uma versão de uma coluna pensada para o polegar: cartões com uma única seleção, barra inferior e ações a 44 px."],
            ["Situação dita só por cor.", "Todo selo traz ícone e palavra. Funciona para daltônicos, em impressão preto e branco e no modo escuro."],
            ["Documento ao cliente com cara de sistema.", "Relatórios ganham tipografia editorial e começam pela resposta: o preço recomendado na primeira tela do celular."],
            ["Cada módulo resolveu do seu jeito.", "Um único conjunto de componentes com estados definidos (carregando, vazio, erro, desabilitado) e regras escritas para novos módulos."],
          ].map(([t, d]) => (
            <div key={t} className="px-5 py-4"><p className="font-titulo text-[17px] font-semibold">{t}</p><p className="mt-1 text-[15px] text-chumbo-2">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="grid gap-8 @5xl:grid-cols-[280px_minmax(0,1fr)]">
        <div>
          <h2 className="text-[26px] font-bold leading-tight">Princípios</h2>
          <p className="mt-2 text-chumbo-2">Quando houver dúvida num módulo novo, estes decidem.</p>
        </div>
        <ol className="space-y-px bg-filete">
          {[
            ["A estrutura não chama atenção.", "Filetes, alinhamento e tipografia organizam; bordas compartilhadas no lugar de cartões soltos."],
            ["A cor é informação.", "Vidro da área (de onde vem) e situação (quanto urge). Nada mais é colorido, nem a decoração."],
            ["Resposta antes do detalhe.", "Cada tela abre com o número ou a ação que importa; o detalhe fica um toque abaixo, ao lado, sem trocar de página."],
            ["Nome longo não quebra o layout.", "Endereços de Brasília, espólios e nomes compostos quebram linha; nada é cortado onde a informação é necessária."],
            ["Um polegar, uma coluna.", "No celular, uma coluna, ações grandes e a barra de navegação ao alcance."],
          ].map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 bg-cal py-4">
              <span className="num font-titulo text-[22px] font-bold text-ouro">{i + 1}</span>
              <div><p className="text-[17px] font-semibold">{t}</p><p className="text-chumbo-2">{d}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border border-chumbo bg-vidro px-5 py-5 @3xl:px-8 @3xl:py-7">
        <h2 className="text-[22px] font-bold">Como explorar este laboratório</h2>
        <div className="mt-4 grid gap-5 @3xl:grid-cols-3">
          {[
            ["#direcoes", "Direções", "As três linhas criativas lado a lado, com prévia viva, referências, por que funcionam e onde falham."],
            ["#fundamentos", "Fundamentos e componentes", "Cores com contraste medido, tipografia, espaçamento, movimento, e cada componente em todos os seus estados."],
            ["#telas-inicio", "Telas", "Sete telas clicáveis com dados fictícios. Alterne entre Computador e Celular acima de cada uma."],
          ].map(([h, t, d]) => (
            <a key={h} href={h} className="group block border-t-2 border-chumbo pt-3"><p className="font-titulo text-[17px] font-semibold group-hover:underline">{t}</p><p className="mt-1 text-[15px] text-chumbo-2">{d}</p></a>
          ))}
        </div>
        <p className="mt-6 text-[13px] text-chumbo-3">Nada aqui está ligado ao banco do Vitral. Nomes, endereços e valores são inventados. Use o botão de tema no topo para ver o modo escuro.</p>
      </section>
    </div>
  );
}
