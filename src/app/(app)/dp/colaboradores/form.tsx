import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { DIAS_SEMANA, cargaSemanalHoras } from "@/lib/dp/ponto";
import { salvarColaborador } from "../actions";
import { CampoArquivo } from "../campo-arquivo";
import { jornadaDe, type Colaborador, type ConfigDP } from "../dados";
import { ROTULO } from "../ui";

/** Formulário da ficha (novo e edição). */
export function FormColaborador({ c, config, colaboradores, usuarios, hoje }: { c: Colaborador | null; config: ConfigDP; colaboradores: { id: string; nome: string }[]; usuarios: { id: string; nome: string; ocupado: boolean }[]; hoje: string }) {
  const jornada = c ? jornadaDe(c, config) : config.jornada;
  const opcoes = (lista: string[], atual: string | null | undefined) => [...new Set([...(atual ? [atual] : []), ...lista])];
  return (
    <form action={salvarColaborador} className="space-y-6">
      {c && <input type="hidden" name="id" value={c.id} />}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block sm:col-span-2">
          <span className={ROTULO}>Nome completo *</span>
          <input name="nome" required defaultValue={c?.nome ?? ""} className={INPUT_CLASS} />
        </label>
        <label className="block">
          <span className={ROTULO}>Situação</span>
          <select name="status" defaultValue={c?.status ?? "ativo"} className={INPUT_CLASS}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="desligado">Desligado</option>
          </select>
        </label>
        <label className="block">
          <span className={ROTULO}>Empresa</span>
          <select name="empresa" defaultValue={c?.empresa ?? ""} className={INPUT_CLASS}>
            <option value="">Não informada</option>
            {opcoes(config.empresas, c?.empresa).map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={ROTULO}>Departamento</span>
          <input name="departamento" list="dp-departamentos" defaultValue={c?.departamento ?? ""} className={INPUT_CLASS} />
          <datalist id="dp-departamentos">
            {config.departamentos.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className={ROTULO}>Cargo</span>
          <input name="cargo" list="dp-cargos" defaultValue={c?.cargo ?? ""} className={INPUT_CLASS} />
          <datalist id="dp-cargos">
            {config.cargos.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className={ROTULO}>Gestor responsável</span>
          <select name="gestor_id" defaultValue={c?.gestor_id ?? ""} className={INPUT_CLASS}>
            <option value="">Diretoria / gerência</option>
            {colaboradores
              .filter((g) => g.id !== c?.id)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
          </select>
        </label>
        <label className="block">
          <span className={ROTULO}>Tipo de vínculo</span>
          <select name="vinculo" defaultValue={c?.vinculo ?? ""} className={INPUT_CLASS}>
            <option value="">Não informado</option>
            {config.vinculos.map((v) => (
              <option key={v.nome}>{v.nome}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={ROTULO}>Data de admissão</span>
          <input type="date" name="data_admissao" max={hoje} defaultValue={c?.data_admissao ?? ""} className={INPUT_CLASS} />
        </label>
        <label className="block">
          <span className={ROTULO}>Data de nascimento (opcional)</span>
          <input type="date" name="data_nascimento" max={hoje} defaultValue={c?.data_nascimento ?? ""} className={INPUT_CLASS} />
        </label>
        <label className="block">
          <span className={ROTULO}>E-mail</span>
          <input type="email" name="email" defaultValue={c?.email ?? ""} className={INPUT_CLASS} />
        </label>
        <label className="block">
          <span className={ROTULO}>Telefone</span>
          <input name="telefone" defaultValue={c?.telefone ?? ""} className={INPUT_CLASS} />
        </label>
        <label className="block">
          <span className={ROTULO}>Desligamento (se desligado)</span>
          <input type="date" name="data_desligamento" defaultValue={c?.data_desligamento ?? ""} className={INPUT_CLASS} />
        </label>
        <label className="block sm:col-span-2">
          <span className={ROTULO}>Usuário do Vitral</span>
          <select name="usuario_id" defaultValue={c?.usuario_id ?? ""} className={INPUT_CLASS}>
            <option value="">Sem usuário (não acessa o Vitral)</option>
            {usuarios
              .filter((u) => !u.ocupado || u.id === c?.usuario_id)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
          </select>
          <span className="mt-1 block text-[11px] text-ink-muted">Só quem tem usuário consegue bater ponto e pedir férias pelo sistema.</span>
        </label>
        <div>
          <span className={ROTULO}>Foto</span>
          {c ? <CampoArquivo destino="foto" colaboradorId={c.id} rotulo={c.foto_caminho ? "Trocar foto" : "Enviar foto"} nome="foto" /> : <p className="text-xs text-ink-muted">Salve a ficha para enviar a foto.</p>}
        </div>
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-ink">Jornada de trabalho</h3>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="jornada_propria" defaultChecked={!!c?.jornada} className="accent-brand" /> Jornada própria (desmarcado = jornada padrão das configurações)
        </label>
        <div className="flex flex-wrap gap-3">
          {DIAS_SEMANA.map((d, i) => (
            <label key={d} className="inline-flex items-center gap-1.5 text-sm text-ink">
              <input type="checkbox" name="jornada_dias" value={i} defaultChecked={jornada.dias.includes(i)} className="accent-brand" /> {d}
            </label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className={ROTULO}>Entrada</span>
            <input type="time" name="jornada_entrada" defaultValue={jornada.entrada} className={INPUT_CLASS} />
          </label>
          <label className="block">
            <span className={ROTULO}>Saída</span>
            <input type="time" name="jornada_saida" defaultValue={jornada.saida} className={INPUT_CLASS} />
          </label>
          <label className="block">
            <span className={ROTULO}>Intervalo (minutos)</span>
            <input type="number" name="jornada_intervalo" min={0} max={240} defaultValue={jornada.intervalo_min} className={`${INPUT_CLASS} num`} />
          </label>
          <label className="block">
            <span className={ROTULO}>Carga horária semanal</span>
            <input name="carga_semanal_horas" inputMode="decimal" defaultValue={c?.carga_semanal_horas ?? ""} placeholder={`${cargaSemanalHoras(jornada)} (pela jornada)`} className={`${INPUT_CLASS} num`} />
          </label>
        </div>
      </section>

      <section className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" name="registra_ponto" defaultChecked={c?.registra_ponto ?? false} className="mt-1 accent-brand" />
            <span>
              Registra ponto pelo Vitral
              <span className="block text-[11px] text-ink-muted">Faltas e banco de horas só contam a partir da data abaixo.</span>
            </span>
          </label>
          <label className="block sm:max-w-[220px]">
            <span className={ROTULO}>Início do controle de ponto</span>
            <input type="date" name="ponto_inicio" defaultValue={c?.ponto_inicio ?? ""} className={INPUT_CLASS} />
            <span className="mt-1 block text-[11px] text-ink-muted">Em branco: começa hoje.</span>
          </label>
        </div>
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" name="tem_ferias" defaultChecked={c?.tem_ferias ?? false} className="mt-1 accent-brand" />
            <span>
              Tem direito a férias (pode solicitar pelo Vitral)
              <span className="block text-[11px] text-ink-muted">Exige data de admissão. As regras de abono e 13º seguem o tipo de vínculo.</span>
            </span>
          </label>
          <label className="block sm:max-w-[220px]">
            <span className={ROTULO}>Dias de férias por período</span>
            <input type="number" name="dias_ferias_periodo" min={1} max={60} defaultValue={c?.dias_ferias_periodo ?? 30} className={`${INPUT_CLASS} num`} />
          </label>
        </div>
      </section>

      <label className="block border-t border-border pt-5">
        <span className={ROTULO}>Observações</span>
        <textarea name="observacoes" rows={2} defaultValue={c?.observacoes ?? ""} className={INPUT_CLASS} />
      </label>

      <BotaoEnviar className={PRIMARY_BUTTON_CLASS}>{c ? "Salvar ficha" : "Cadastrar colaborador"}</BotaoEnviar>
    </form>
  );
}
