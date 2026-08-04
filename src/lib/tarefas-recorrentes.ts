import { addDays, getDay, setDate, startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";

export interface RegraTarefa {
  id: string;
  nome: string;
  tipo_regra: "primeiro_dia_util" | "dia_fixo" | "toda_segunda" | "primeira_segunda";
  dia_fixo: number | null;
  periodicidade: "mensal" | "semanal";
}

function ehFimDeSemana(d: Date): boolean {
  const dia = getDay(d); // 0 = domingo, 6 = sábado
  return dia === 0 || dia === 6;
}

function diaUtilAnteriorOuIgual(d: Date): Date {
  let data = d;
  while (ehFimDeSemana(data)) {
    data = addDays(data, -1);
  }
  return data;
}

function primeiroDiaUtilDoMes(referencia: Date): Date {
  let data = startOfMonth(referencia);
  while (ehFimDeSemana(data)) {
    data = addDays(data, 1);
  }
  return data;
}

function todasSegundasDoMes(referencia: Date): Date[] {
  return eachDayOfInterval({ start: startOfMonth(referencia), end: endOfMonth(referencia) }).filter(
    (d) => getDay(d) === 1
  );
}

/**
 * Calcula em que dia(s) do mês de referência essa tarefa ocorre, e
 * qual a "competência" (chave de rastreio do checkbox) de cada
 * ocorrência — mesma lógica usada na tela de Locação: tarefa
 * semanal usa a data da própria segunda-feira, tarefa mensal usa
 * o dia 1 do mês.
 */
export function ocorrenciasDaTarefa(
  tarefa: RegraTarefa,
  referencia: Date
): { data: Date; competencia: string }[] {
  const competenciaMes = format(startOfMonth(referencia), "yyyy-MM-dd");

  switch (tarefa.tipo_regra) {
    case "primeiro_dia_util":
      return [{ data: primeiroDiaUtilDoMes(referencia), competencia: competenciaMes }];

    case "dia_fixo": {
      const dia = tarefa.dia_fixo ?? 1;
      const dataAlvo = diaUtilAnteriorOuIgual(setDate(startOfMonth(referencia), dia));
      return [{ data: dataAlvo, competencia: competenciaMes }];
    }

    case "primeira_segunda": {
      const primeira = todasSegundasDoMes(referencia)[0];
      return primeira ? [{ data: primeira, competencia: competenciaMes }] : [];
    }

    case "toda_segunda":
      return todasSegundasDoMes(referencia).map((data) => ({
        data,
        competencia: format(data, "yyyy-MM-dd"),
      }));

    default:
      return [];
  }
}
