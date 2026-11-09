"use client";

import { useMemo, useState } from "react";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import {
  GARANTIAS,
  MODALIDADES_CPS,
  dataTermino,
  dataPorExtenso,
  periodoPrimeiroAluguel,
  type Beneficiario,
  type Conjuge,
  type Garantia,
  type Imovel,
  type ModalidadeCps,
  type Pessoa,
} from "@/lib/contratos-locacao/montar";
import { formatarCentavos, textoParaCentavos } from "@/lib/termo-entrega/extenso";

export type FichaOpcao = {
  id: string;
  rotulo: string;
  locatario: Pessoa;
  fiadores: { pessoa: Pessoa; conjuge: Conjuge | null }[];
  garantia: string;
  imovelInteresse: string;
};
export type ContratoOpcao = {
  id: string;
  rotulo: string;
  locador: { nome: string; cpf: string; rg: string; email: string; endereco: string };
  imovel: Pick<Imovel, "endereco" | "matricula" | "inscricaoIptu" | "areaPrivativa">;
};

const PESSOA_VAZIA: Pessoa = { nome: "", nacionalidade: "brasileiro(a)", profissao: "", cpf: "", rg: "", email: "", estadoCivil: "", endereco: "" };
const CONJUGE_VAZIO: Conjuge = { nome: "", cpf: "", rg: "", nacionalidade: "brasileiro(a)", profissao: "", email: "" };
const IMOVEL_VAZIO: Imovel = { endereco: "", areaPrivativa: "", matricula: "", cartorio: "", inscricaoIptu: "", vagaGaragem: "", composicao: "" };
const BENEFICIARIO_VAZIO: Beneficiario = { nome: "", cpf: "", percentual: "100%", banco: "", agenciaConta: "", pix: "" };
type FiadorTela = { pessoa: Pessoa; conjuge: Conjuge; comConjuge: boolean };
const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

function Campo({ label, value, onChange, type = "text", largo, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; largo?: boolean; placeholder?: string }) {
  return (
    <label className={`block min-w-0 ${largo ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-medium text-ink-muted">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS} />
    </label>
  );
}

function Secao({ titulo, children, acao }: { titulo: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section className={`${CARD_CLASS} space-y-4 p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

function CamposPessoa({ p, set, completo = true }: { p: Pessoa; set: (p: Pessoa) => void; completo?: boolean }) {
  const c = (k: keyof Pessoa) => (v: string) => set({ ...p, [k]: v });
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Campo label="Nome completo" value={p.nome} onChange={c("nome")} largo />
      <Campo label="CPF/CNPJ" value={p.cpf} onChange={c("cpf")} />
      {completo && <Campo label="RG" value={p.rg} onChange={c("rg")} />}
      {completo && <Campo label="Nacionalidade" value={p.nacionalidade} onChange={c("nacionalidade")} />}
      {completo && <Campo label="Profissão" value={p.profissao} onChange={c("profissao")} />}
      {completo && <Campo label="Estado civil" value={p.estadoCivil} onChange={c("estadoCivil")} />}
      {completo && <Campo label="E-mail" value={p.email} onChange={c("email")} type="email" />}
      <Campo label="Endereço" value={p.endereco} onChange={c("endereco")} largo />
    </div>
  );
}

function CamposConjuge({ p, set }: { p: Conjuge; set: (p: Conjuge) => void }) {
  const c = (k: keyof Conjuge) => (v: string) => set({ ...p, [k]: v });
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Campo label="Nome do cônjuge" value={p.nome} onChange={c("nome")} largo />
      <Campo label="CPF" value={p.cpf} onChange={c("cpf")} />
      <Campo label="RG" value={p.rg} onChange={c("rg")} />
      <Campo label="Nacionalidade" value={p.nacionalidade} onChange={c("nacionalidade")} />
      <Campo label="Profissão" value={p.profissao} onChange={c("profissao")} />
      <Campo label="E-mail" value={p.email} onChange={c("email")} type="email" />
    </div>
  );
}

function CamposImovel({ i, set, cps }: { i: Imovel; set: (i: Imovel) => void; cps?: boolean }) {
  const c = (k: keyof Imovel) => (v: string) => set({ ...i, [k]: v });
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Campo label="Endereço" value={i.endereco} onChange={c("endereco")} largo />
      <Campo label="Área privativa" value={i.areaPrivativa} onChange={c("areaPrivativa")} placeholder="65,00 m²" />
      <Campo label={cps ? "Inscrição – GDF" : "Inscrição de IPTU"} value={i.inscricaoIptu} onChange={c("inscricaoIptu")} />
      <Campo label="Matrícula" value={i.matricula} onChange={c("matricula")} />
      {cps ? (
        <Campo label="Cartório" value={i.cartorio} onChange={c("cartorio")} largo />
      ) : (
        <>
          <Campo label="Vaga de garagem" value={i.vagaGaragem} onChange={c("vagaGaragem")} />
          <Campo label="Composição do imóvel" value={i.composicao} onChange={c("composicao")} largo />
        </>
      )}
    </div>
  );
}

async function baixar(corpo: unknown, aoErro: (m: string) => void) {
  const r = await fetch("/locacao/contratos/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  if (!r.ok) {
    const j = await r.json().catch(() => ({ erro: "Não foi possível gerar o PDF." }));
    aoErro(j.erro ?? "Não foi possível gerar o PDF.");
    return;
  }
  const nome = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") ?? "")?.[1] ?? "contrato.pdf";
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function GeradorContratos({ fichas, contratos }: { fichas: FichaOpcao[]; contratos: ContratoOpcao[] }) {
  const [aba, setAba] = useState<"locacao" | "cps">("locacao");
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState("");

  // ---- locação ----
  const [locador, setLocador] = useState({ nome: "", cpf: "", endereco: "" });
  const [locatario, setLocatario] = useState<Pessoa>(PESSOA_VAZIA);
  const [fiadores, setFiadores] = useState<FiadorTela[]>([]);
  const [imovel, setImovel] = useState<Imovel>(IMOVEL_VAZIO);
  const [garantia, setGarantia] = useState<Garantia>("seguro_fianca");
  const [tituloValor, setTituloValor] = useState("");
  const [tituloProposta, setTituloProposta] = useState("");
  const [prazo, setPrazo] = useState("30");
  const [inicio, setInicio] = useState("");
  const [aluguel, setAluguel] = useState("");
  const [diaVenc, setDiaVenc] = useState("10");
  const [primeiroVenc, setPrimeiroVenc] = useState("");
  const [periodo, setPeriodo] = useState({ inicio: "", fim: "" });
  const [desconto, setDesconto] = useState("");
  const [diaDesconto, setDiaDesconto] = useState("10");
  const [dataLoc, setDataLoc] = useState(hoje());

  // ---- prestação de serviços ----
  const [contratante, setContratante] = useState<Pessoa>(PESSOA_VAZIA);
  const [imovelCps, setImovelCps] = useState<Imovel>(IMOVEL_VAZIO);
  const [aluguelCps, setAluguelCps] = useState("");
  const [modalidade, setModalidade] = useState<ModalidadeCps>("tradicional");
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([BENEFICIARIO_VAZIO]);
  const [dataCps, setDataCps] = useState(hoje());

  const termino = useMemo(() => dataTermino(inicio, Number(prazo)), [inicio, prazo]);

  function usarFicha(id: string) {
    const f = fichas.find((x) => x.id === id);
    if (!f) return;
    setLocatario(f.locatario);
    setFiadores(f.fiadores.map((x) => ({ pessoa: x.pessoa, conjuge: x.conjuge ?? CONJUGE_VAZIO, comConjuge: false })));
    if (f.garantia in GARANTIAS) setGarantia(f.garantia as Garantia);
    if (!imovel.endereco && f.imovelInteresse) setImovel((i) => ({ ...i, endereco: f.imovelInteresse }));
  }

  function usarContrato(id: string) {
    const c = contratos.find((x) => x.id === id);
    if (!c) return;
    setLocador({ nome: c.locador.nome, cpf: c.locador.cpf, endereco: c.locador.endereco });
    setImovel((i) => ({ ...i, ...c.imovel }));
    setContratante((p) => ({ ...p, nome: c.locador.nome, cpf: c.locador.cpf, rg: c.locador.rg, email: c.locador.email, endereco: c.locador.endereco }));
    setImovelCps((i) => ({ ...i, ...c.imovel }));
    setBeneficiarios((b) => (b.length === 1 && !b[0].nome ? [{ ...b[0], nome: c.locador.nome, cpf: c.locador.cpf }] : b));
  }

  function aoMudarPrimeiroVenc(v: string) {
    setPrimeiroVenc(v);
    const p = periodoPrimeiroAluguel(inicio, v);
    if (p) setPeriodo(p);
  }

  const dadosLocacao = () => ({
    locador,
    locatario,
    fiadores: garantia === "fiador" ? fiadores.map((f) => ({ ...f.pessoa, conjuge: f.comConjuge ? f.conjuge : null })) : [],
    imovel,
    garantia,
    tituloValorCentavos: textoParaCentavos(tituloValor),
    tituloProposta,
    prazoMeses: Number(prazo),
    inicio,
    aluguelCentavos: textoParaCentavos(aluguel),
    diaVencimento: Number(diaVenc),
    primeiroVencimento: primeiroVenc,
    primeiroPeriodoInicio: periodo.inicio,
    primeiroPeriodoFim: periodo.fim,
    descontoCentavos: textoParaCentavos(desconto),
    diaLimiteDesconto: Number(diaDesconto),
    dataAssinatura: dataLoc,
  });
  const dadosCps = () => ({ contratante, imovel: imovelCps, aluguelCentavos: textoParaCentavos(aluguelCps), modalidade, beneficiarios, dataAssinatura: dataCps });

  async function gerar(tipo: "locacao" | "cps", minuta: boolean) {
    setErro("");
    setGerando(`${tipo}-${minuta}`);
    await baixar({ tipo, minuta, dados: tipo === "cps" ? dadosCps() : dadosLocacao() }, setErro).finally(() => setGerando(""));
  }

  const botoes = (tipo: "locacao" | "cps") => (
    <div className={`${CARD_CLASS} flex flex-wrap items-center justify-end gap-3 p-4`}>
      {erro && <p className="mr-auto text-sm text-red-700">{erro}</p>}
      <button type="button" disabled={!!gerando} onClick={() => gerar(tipo, true)} className={SECONDARY_BUTTON_CLASS}>
        {gerando === `${tipo}-true` ? "Gerando…" : "Pré-visualizar (minuta)"}
      </button>
      <button type="button" disabled={!!gerando} onClick={() => gerar(tipo, false)} className={PRIMARY_BUTTON_CLASS}>
        {gerando === `${tipo}-false` ? "Gerando…" : "Gerar PDF final"}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className={`${CARD_CLASS} grid gap-3 p-5 sm:grid-cols-2`}>
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-ink-muted">Ficha cadastral do locatário (concluída)</span>
          <select defaultValue="" onChange={(e) => usarFicha(e.target.value)} className={INPUT_CLASS}>
            <option value="">Escolha para preencher locatário e fiadores</option>
            {fichas.map((f) => (
              <option key={f.id} value={f.id}>{f.rotulo}</option>
            ))}
          </select>
        </label>
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-ink-muted">Contrato cadastrado no Vitral</span>
          <select defaultValue="" onChange={(e) => usarContrato(e.target.value)} className={INPUT_CLASS}>
            <option value="">Escolha para preencher locador e imóvel</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>{c.rotulo}</option>
            ))}
          </select>
        </label>
      </div>

      <div role="tablist" className="flex gap-2 overflow-x-auto">
        {([["locacao", "Contrato de locação"], ["cps", "Prestação de serviços (proprietário)"]] as const).map(([v, r]) => (
          <button key={v} type="button" role="tab" aria-selected={aba === v} onClick={() => { setAba(v); setErro(""); }}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${aba === v ? "border-brand bg-brand text-white" : "border-border/80 text-ink-muted"}`}>
            {r}
          </button>
        ))}
      </div>

      {aba === "locacao" ? (
        <>
          <Secao titulo="Locador">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo label="Nome" value={locador.nome} onChange={(v) => setLocador({ ...locador, nome: v })} largo />
              <Campo label="CPF/CNPJ" value={locador.cpf} onChange={(v) => setLocador({ ...locador, cpf: v })} />
              <Campo label="Endereço (vazio = Brasília/DF)" value={locador.endereco} onChange={(v) => setLocador({ ...locador, endereco: v })} />
            </div>
          </Secao>
          <Secao titulo="Locatário">
            <CamposPessoa p={locatario} set={setLocatario} />
          </Secao>
          <Secao titulo="Garantia">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block min-w-0 sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-ink-muted">Modalidade</span>
                <select value={garantia} onChange={(e) => setGarantia(e.target.value as Garantia)} className={INPUT_CLASS}>
                  {Object.entries(GARANTIAS).map(([v, r]) => (
                    <option key={v} value={v}>{r}</option>
                  ))}
                </select>
              </label>
              {garantia === "titulo_capitalizacao" && (
                <>
                  <Campo label="Valor nominal do título (R$)" value={tituloValor} onChange={setTituloValor} />
                  <Campo label="Nº da proposta de subscrição" value={tituloProposta} onChange={setTituloProposta} />
                </>
              )}
            </div>
          </Secao>
          {garantia === "fiador" &&
            fiadores.map((f, i) => (
              <Secao key={i} titulo={fiadores.length > 1 ? `Fiador ${i + 1}` : "Fiador"}
                acao={<button type="button" onClick={() => setFiadores(fiadores.filter((_, k) => k !== i))} className="text-xs font-medium text-red-700 hover:underline">Remover</button>}>
                <CamposPessoa p={f.pessoa} set={(p) => setFiadores(fiadores.map((x, k) => (k === i ? { ...x, pessoa: p } : x)))} />
                <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={f.comConjuge} onChange={(e) => setFiadores(fiadores.map((x, k) => (k === i ? { ...x, comConjuge: e.target.checked } : x)))} className="size-5" />
                  Incluir o cônjuge no contrato (qualificação e assinatura)
                </label>
                {f.comConjuge && <CamposConjuge p={f.conjuge} set={(c) => setFiadores(fiadores.map((x, k) => (k === i ? { ...x, conjuge: c } : x)))} />}
              </Secao>
            ))}
          {garantia === "fiador" && fiadores.length < 2 && (
            <button type="button" onClick={() => setFiadores([...fiadores, { pessoa: PESSOA_VAZIA, conjuge: CONJUGE_VAZIO, comConjuge: false }])} className={SECONDARY_BUTTON_CLASS}>
              Adicionar fiador
            </button>
          )}
          <Secao titulo="Imóvel">
            <CamposImovel i={imovel} set={setImovel} />
          </Secao>
          <Secao titulo="Condições da locação">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo label="Prazo (meses)" value={prazo} onChange={setPrazo} type="number" />
              <Campo label="Início" value={inicio} onChange={setInicio} type="date" />
              <div className="text-sm text-ink-muted sm:col-span-2 sm:pt-6">Término: <strong className="text-ink">{termino ? dataPorExtenso(termino) : "—"}</strong></div>
              <Campo label="Aluguel mensal (R$)" value={aluguel} onChange={setAluguel} placeholder="2.500,00" />
              <Campo label="Dia do vencimento" value={diaVenc} onChange={setDiaVenc} type="number" />
              <Campo label="Vencimento do 1º aluguel" value={primeiroVenc} onChange={aoMudarPrimeiroVenc} type="date" />
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Período proporcional: de" value={periodo.inicio} onChange={(v) => setPeriodo({ ...periodo, inicio: v })} type="date" />
                <Campo label="até" value={periodo.fim} onChange={(v) => setPeriodo({ ...periodo, fim: v })} type="date" />
              </div>
              <Campo label="Desconto de pontualidade (R$, opcional)" value={desconto} onChange={setDesconto} placeholder="200,00" />
              <Campo label="Pagando até o dia" value={diaDesconto} onChange={setDiaDesconto} type="number" />
              <Campo label="Data do contrato" value={dataLoc} onChange={setDataLoc} type="date" />
              {textoParaCentavos(aluguel) > 0 && (
                <p className="text-sm text-ink-muted sm:col-span-2 lg:col-span-4">
                  Aluguel: <strong className="text-ink">{formatarCentavos(textoParaCentavos(aluguel))}</strong>
                  {textoParaCentavos(desconto) > 0 && <> · com desconto: <strong className="text-ink">{formatarCentavos(textoParaCentavos(aluguel) - textoParaCentavos(desconto))}</strong></>}
                </p>
              )}
            </div>
          </Secao>
          {botoes("locacao")}
        </>
      ) : (
        <>
          <Secao titulo="Contratante (proprietário)">
            <CamposPessoa p={contratante} set={setContratante} />
          </Secao>
          <Secao titulo="Imóvel">
            <CamposImovel i={imovelCps} set={setImovelCps} cps />
          </Secao>
          <Secao titulo="Condições comerciais">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo label="Aluguel inicial (R$)" value={aluguelCps} onChange={setAluguelCps} placeholder="2.500,00" />
              <Campo label="Data do contrato" value={dataCps} onChange={setDataCps} type="date" />
            </div>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-xs font-medium text-ink-muted">Modalidade</legend>
              {(Object.keys(MODALIDADES_CPS) as ModalidadeCps[]).map((m) => (
                <label key={m} className="flex min-h-11 items-start gap-2 text-sm text-ink">
                  <input type="radio" name="modalidade" checked={modalidade === m} onChange={() => setModalidade(m)} className="mt-1 size-5" />
                  {MODALIDADES_CPS[m]}
                </label>
              ))}
            </fieldset>
          </Secao>
          {beneficiarios.map((b, i) => (
            <Secao key={i} titulo={beneficiarios.length > 1 ? `Beneficiário ${i + 1}` : "Beneficiário"}
              acao={beneficiarios.length > 1 ? <button type="button" onClick={() => setBeneficiarios(beneficiarios.filter((_, k) => k !== i))} className="text-xs font-medium text-red-700 hover:underline">Remover</button> : undefined}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [["nome", "Nome"], ["cpf", "CPF/CNPJ"], ["percentual", "Percentual"], ["banco", "Banco"], ["agenciaConta", "Agência / Conta"], ["pix", "Chave PIX"]] as [keyof Beneficiario, string][]
                ).map(([k, r]) => (
                  <Campo key={k} label={r} value={b[k]} onChange={(v) => setBeneficiarios(beneficiarios.map((x, j) => (j === i ? { ...x, [k]: v } : x)))} largo={k === "nome"} />
                ))}
              </div>
            </Secao>
          ))}
          {beneficiarios.length < 2 && (
            <button type="button" onClick={() => setBeneficiarios([{ ...beneficiarios[0], percentual: "50%" }, { ...BENEFICIARIO_VAZIO, percentual: "50%" }])} className={SECONDARY_BUTTON_CLASS}>
              Adicionar segundo beneficiário
            </button>
          )}
          <p className="text-xs text-ink-muted">Os dados bancários vão apenas para o PDF gerado; o Vitral não os guarda.</p>
          {botoes("cps")}
        </>
      )}
    </div>
  );
}
