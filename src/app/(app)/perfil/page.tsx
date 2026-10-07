import { rotuloNivel } from "@/lib/acessos";
import { INPUT_CLASS } from "@/components/ui/styles";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { atualizarPerfil } from "./actions";
import { SeletorFoto } from "./photo-picker";
import { SucessoBanner } from "@/components/banners";
import { VoltarLink } from "@/components/voltar-link";
import { BotaoEnviar } from "@/components/botao-enviar";

const CARGOS_SUGERIDOS = [
  "Gerente Administrativo",
  "Diretora",
  "Corretor",
  "Corretora",
  "Correspondente Bancário",
  "Financeiro",
  "Gerente de Vendas",
];

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; salvo?: string }>;
}) {
  const supabase = await createClient();
  const { user } = await getUsuarioAtual();
  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, email, nivel_acesso, cargo, foto_url")
    .eq("id", user.id)
    .single();

  if (!usuario) redirect("/login");

  const { erro, salvo } = await searchParams;
  const iniciais = usuario.nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <VoltarLink href="/" label="Início" />
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Meu perfil</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Sua foto e cargo aparecem para o resto da equipe. O nível de acesso ao sistema
          (perfil) é definido por um administrador.
        </p>
      </div>

      <SucessoBanner mostrar={salvo === "1"} texto="Perfil salvo com sucesso." />

      {erro && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {erro}
        </p>
      )}

      <form action={atualizarPerfil} className="space-y-5 rounded-xl border border-border/60 bg-surface shadow-sm p-6">
        <SeletorFoto fotoAtual={usuario.foto_url} iniciais={iniciais} />

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Nome</label>
          <input
            name="nome"
            defaultValue={usuario.nome}
            required
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">E-mail</label>
          <input
            value={usuario.email}
            disabled
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-ink-muted"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Cargo <span className="text-ink-muted/70">(o que aparece pra equipe)</span>
          </label>
          <input
            name="cargo"
            defaultValue={usuario.cargo ?? ""}
            list="cargos-sugeridos"
            placeholder="Ex: Gerente Administrativo"
            className={INPUT_CLASS}
          />
          <datalist id="cargos-sugeridos">
            {CARGOS_SUGERIDOS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Nível de acesso <span className="text-ink-muted/70">(definido pela gestão)</span>
          </label>
          <input
            value={rotuloNivel(usuario.nivel_acesso)}
            disabled
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-ink-muted"
          />
        </div>

        <BotaoEnviar
          className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Salvar
        </BotaoEnviar>
      </form>
    </div>
  );
}
