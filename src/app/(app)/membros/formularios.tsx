"use client";

import { useId, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import {
  rotuloNivel,
  type NivelAcesso,
  areasDoUsuario,
  CATEGORIAS,
  descricaoAcesso,
  NIVEIS,
  PERFIS,
} from "@/lib/acessos";
import { CATEGORIA_LABEL, type CategoriaProcesso } from "@/lib/types";
import { valorDaLista } from "@/lib/validacao";
import { atualizarCategoriasMembro, criarConvite } from "./actions";

/** Os checks são apenas as categorias que o backend já aplica. */
export function FormularioAcesso({
  usuarioId,
  nivelInicial = "supervisor",
  categoriasIniciais = [],
  aoSalvar,
}: {
  usuarioId?: string;
  nivelInicial?: NivelAcesso;
  categoriasIniciais?: CategoriaProcesso[];
  aoSalvar?: () => void;
}) {
  const id = useId();
  const [nivel, setNivel] = useState(nivelInicial);
  const [categorias, setCategorias] = useState(categoriasIniciais);
  const privilegiado = nivel === "diretor" || nivel === "gerente";
  const areas = areasDoUsuario(nivel, categorias);
  const concessao =
    privilegiado &&
    (!usuarioId || !["diretor", "gerente"].includes(nivelInicial));
  const [confirmado, setConfirmado] = useState(false);
  const [falhou, setFalhou] = useState(false);
  return (
    <form
      action={async (dados) => {
        setFalhou(false);
        const ok = await (usuarioId
          ? atualizarCategoriasMembro(dados)
          : criarConvite(dados));
        if (ok) aoSalvar?.();
        else setFalhou(true);
      }}
      className="space-y-5"
    >
      {falhou && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          A alteração não foi salva. Confira os dados e as permissões antes de
          tentar novamente.
        </p>
      )}
      {usuarioId ? (
        <input type="hidden" name="usuario_id" value={usuarioId} />
      ) : (
        <>
          <label className="block text-sm font-medium text-ink">
            E-mail de login
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="nome@sacraimoveis.com.br"
              className={`${INPUT_CLASS} mt-2`}
            />
          </label>
          <p className="text-xs text-ink-muted">
            O convite gera um link para compartilhar. Depois do cadastro, você
            poderá vincular a ficha do colaborador.
          </p>
        </>
      )}
      <label
        htmlFor={`${id}-nivel`}
        className="block text-sm font-medium text-ink"
      >
        Perfil de acesso
      </label>
      <select
        id={`${id}-nivel`}
        name="nivel_acesso"
        value={nivel}
        onChange={(e) => {
          const n = valorDaLista("nivel_acesso_usuario", e.target.value);
          if (n) {
            setNivel(n);
            setConfirmado(false);
          }
        }}
        className={INPUT_CLASS}
      >
        {(nivelInicial === "gerente_locacao"
          ? [...NIVEIS, "gerente_locacao" as const]
          : NIVEIS
        ).map((n) => (
          <option key={n} value={n}>
            {rotuloNivel(n)}
          </option>
        ))}
      </select>
      <p className="-mt-3 text-xs leading-5 text-ink-muted">
        {descricaoAcesso(nivel)}
      </p>
      {nivel === "supervisor" || nivel === "gerente_locacao" ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">
            Áreas operacionais
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIAS.map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-3 text-sm"
              >
                <input
                  type="checkbox"
                  name="categorias"
                  value={c}
                  checked={categorias.includes(c)}
                  onChange={(e) =>
                    setCategorias(
                      e.target.checked
                        ? [...categorias, c]
                        : categorias.filter((v) => v !== c),
                    )
                  }
                  className="h-4 w-4 accent-brand"
                />
                {CATEGORIA_LABEL[c]}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Marketing mantém a categoria existente; não libera um módulo
            adicional.
          </p>
        </fieldset>
      ) : (
        categorias.map((c) => (
          <input key={c} type="hidden" name="categorias" value={c} />
        ))
      )}
      {!usuarioId && (
        <details className="rounded-lg border border-border px-3 py-3">
          <summary className="cursor-pointer text-xs font-medium text-ink-muted">
            Função operacional
          </summary>
          <label className="mt-3 block text-xs text-ink-muted">
            Identifica a atuação da pessoa; não altera os acessos acima.
            <select
              name="perfil"
              defaultValue="corretor"
              className={`${INPUT_CLASS} mt-2`}
            >
              {PERFIS.map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </details>
      )}
      <section
        className="rounded-xl bg-background p-4"
        aria-label="Resumo de acesso"
      >
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
          <ShieldCheck size={16} className="text-brand" />
          Acesso às áreas
        </p>
        <p className="text-sm leading-6 text-ink-muted">{areas.join(" · ")}</p>
        {!privilegiado && (
          <p className="mt-2 text-xs text-ink-muted">
            Sem Financeiro e Configurações administrativas.
          </p>
        )}
      </section>
      {concessao && (
        <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <input
            name="confirmar_administrativo"
            type="checkbox"
            value="sim"
            required
            checked={confirmado}
            onChange={(e) => setConfirmado(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-brand"
          />
          Confirmo a concessão de acesso ao Financeiro, Configurações e
          administração do Departamento Pessoal.
        </label>
      )}
      <div className="flex justify-end border-t border-border pt-4">
        <BotaoEnviar
          disabled={concessao && !confirmado}
          textoEnviando="Salvando…"
          className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
        >
          {usuarioId ? "Salvar acesso" : "Gerar convite"}
        </BotaoEnviar>
      </div>
    </form>
  );
}
