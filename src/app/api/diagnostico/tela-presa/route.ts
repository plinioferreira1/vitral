import { normalizarDiagnostico } from "@/lib/vigia-acoes";
import { getUsuarioAtual } from "@/lib/usuario-atual";

/**
 * Recebe o diagnóstico do vigia de telas presas (src/components/vigia-acoes.tsx)
 * e grava no log do servidor, onde aparece nos erros da Vercel por 7 dias.
 * Só metadados da requisição: nada de conteúdo de formulário.
 */
export async function POST(request: Request) {
  const { user } = await getUsuarioAtual();
  if (!user) return new Response(null, { status: 401 });
  const texto = await request.text();
  if (texto.length > 4000) return new Response(null, { status: 413 });
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return new Response(null, { status: 400 });
  }
  const diagnostico = normalizarDiagnostico(bruto);
  if (!diagnostico) return new Response(null, { status: 400 });
  console.error(`tela-presa: ${JSON.stringify({ ...diagnostico, usuario: user.id.slice(0, 8), navegador: (request.headers.get("user-agent") ?? "").slice(0, 160) })}`);
  return new Response(null, { status: 204 });
}
