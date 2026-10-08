/**
 * Calendário financeiro da Sacra (Brasília/DF).
 *
 * As datas são tratadas como AAAA-MM-DD em UTC para não depender do fuso do
 * servidor. Além dos feriados nacionais e locais, Carnaval é considerado dia
 * não útil bancário. Pontos facultativos comuns não entram na regra.
 */

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function somarDias(iso: string, quantidade: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return paraISO(new Date(Date.UTC(ano, mes - 1, dia + quantidade)));
}

/** Calcula o Domingo de Páscoa pelo algoritmo gregoriano de Meeus/Jones/Butcher. */
function pascoa(ano: number): string {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return paraISO(new Date(Date.UTC(ano, mes - 1, dia)));
}

function feriadosFinanceirosDF(ano: number): Set<string> {
  const prefixo = String(ano);
  const domingoPascoa = pascoa(ano);

  return new Set([
    `${prefixo}-01-01`, // Confraternização Universal
    somarDias(domingoPascoa, -48), // segunda-feira de Carnaval (sem expediente bancário)
    somarDias(domingoPascoa, -47), // terça-feira de Carnaval (sem expediente bancário)
    somarDias(domingoPascoa, -2), // Paixão de Cristo
    `${prefixo}-04-21`, // Tiradentes e Aniversário de Brasília
    `${prefixo}-05-01`, // Dia do Trabalho
    somarDias(domingoPascoa, 60), // Corpus Christi (feriado local no DF)
    `${prefixo}-09-07`, // Independência do Brasil
    `${prefixo}-10-12`, // Nossa Senhora Aparecida
    `${prefixo}-11-02`, // Finados
    `${prefixo}-11-15`, // Proclamação da República
    `${prefixo}-11-20`, // Consciência Negra
    `${prefixo}-11-30`, // Dia do Evangélico (feriado local no DF)
    `${prefixo}-12-25`, // Natal
  ]);
}

export function ehDiaUtilFinanceiro(iso: string): boolean {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const semana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  if (semana === 0 || semana === 6) return false;
  return !feriadosFinanceirosDF(ano).has(iso);
}

/** Mantém a data quando útil; caso contrário, avança até o próximo dia útil. */
export function proximoDiaUtilFinanceiro(iso: string): string {
  let atual = iso;
  while (!ehDiaUtilFinanceiro(atual)) atual = somarDias(atual, 1);
  return atual;
}

