import { addDays, formatISO } from "date-fns";
import type { ModeloEtapa } from "@/lib/types";

export interface EtapaGerada {
  modelo_etapa_id: string;
  nome: string;
  ordem: number;
  data_prevista: string | null;
  etapa_dependencia_modelo_id: string | null; // resolvido depois para o id real
}

/**
 * Motor de geração de etapas (especificação seção 5 e 6.3).
 *
 * Suporta os dois tipos de regra que importam de verdade:
 * - `relativa_criacao`: data_criacao_do_processo + dias_offset
 * - `relativa_etapa_anterior`: data_realizada da etapa de referência + offset
 *   (na criação do processo, ainda não há data_realizada, então usamos a
 *   data prevista da etapa de referência como melhor estimativa — o valor
 *   real é recalculado quando essa etapa anterior é concluída, ver
 *   `recalcularDependentes`).
 * - `fixa`: usa a própria data informada na criação do processo.
 * - `manual`: fica sem data até alguém definir.
 */
export function gerarEtapas(
  modelosEtapa: ModeloEtapa[],
  dataBaseContrato: Date
): EtapaGerada[] {
  const ordenado = [...modelosEtapa].sort((a, b) => a.ordem - b.ordem);
  const dataPrevistaPorModeloId = new Map<string, Date | null>();

  const resultado: EtapaGerada[] = [];

  for (const modelo of ordenado) {
    let dataPrevista: Date | null = null;

    switch (modelo.tipo_regra_data) {
      case "fixa":
        dataPrevista = dataBaseContrato;
        break;
      case "relativa_criacao":
        dataPrevista = addDays(dataBaseContrato, modelo.dias_offset);
        break;
      case "relativa_etapa_anterior": {
        const dataReferencia = modelo.etapa_referencia_id
          ? dataPrevistaPorModeloId.get(modelo.etapa_referencia_id)
          : null;
        dataPrevista = dataReferencia
          ? addDays(dataReferencia, modelo.dias_offset)
          : addDays(dataBaseContrato, modelo.dias_offset);
        break;
      }
      case "manual":
      default:
        dataPrevista = null;
    }

    dataPrevistaPorModeloId.set(modelo.id, dataPrevista);

    resultado.push({
      modelo_etapa_id: modelo.id,
      nome: modelo.nome,
      ordem: modelo.ordem,
      data_prevista: dataPrevista ? formatISO(dataPrevista, { representation: "date" }) : null,
      etapa_dependencia_modelo_id: modelo.etapa_referencia_id,
    });
  }

  return resultado;
}

/**
 * Quando uma etapa é concluída com uma data_realizada diferente da
 * prevista, as etapas que dependem dela (relativa_etapa_anterior)
 * devem ter a data_prevista recalculada — é isso que evita que um
 * atraso na Intermediária "esconda" o atraso em cascata do Registro.
 */
export function recalcularDataDependente(
  dataRealizadaEtapaAnterior: Date,
  diasOffset: number
): string {
  return formatISO(addDays(dataRealizadaEtapaAnterior, diasOffset), { representation: "date" });
}
