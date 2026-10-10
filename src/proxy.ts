import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// "/api/cron": chamado pelo agendamento da Vercel, sem usuário logado — a
// própria rota exige o CRON_SECRET. "/cadastro" recebe as fichas públicas.
const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/redefinir-senha",
  "/acesso-desativado",
  "/assinar",
  "/visita",
  "/api/cron",
  "/cadastro",
];
const ROTAS_CORRETOR = [
  "/minhas-vendas",
  "/",
  "/corretor",
  "/cartorio",
  "/calculadora",
  "/calculadora-data",
  "/avaliacao-imovel",
  "/avaliacoes",
  "/perfil",
  "/onboarding",
  "/propostas",
  "/termos-visita",
  "/autorizacoes",
];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Redirecionamentos também precisam devolver os cookies renovados pelo Auth.
  // Sem isso, o navegador repete a requisição com a sessão anterior.
  const redirecionar = (url: URL) => {
    const resposta = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(cookie => resposta.cookies.set(cookie));
    return resposta;
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims confere a assinatura do login sem ir ao servidor de autenticação
  // quando o projeto usa chaves assimétricas (e renova a sessão se estiver
  // para vencer). Com chave simétrica ele mesmo consulta o servidor, como o
  // getUser fazia. Acesso desativado continua barrado logo abaixo (`ativo`).
  const { data: sessao } = await supabase.auth.getClaims();
  const user = sessao?.claims?.sub ? { id: sessao.claims.sub } : null;

  const isPublic = PUBLIC_PATHS.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirecionar(url);
  }

  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nivel_acesso, ativo")
      .eq("id", user.id)
      .single();

    if (usuario?.ativo === false) {
      if (request.nextUrl.pathname !== "/acesso-desativado") {
        const url = request.nextUrl.clone();
        url.pathname = "/acesso-desativado";
        url.search = "";
        return redirecionar(url);
      }
      return supabaseResponse;
    }

    if (
      request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/acesso-desativado"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return redirecionar(url);
    }

    const rotaPermitida = ROTAS_CORRETOR.some(
      (r) =>
        request.nextUrl.pathname === r ||
        request.nextUrl.pathname.startsWith(`${r}/`),
    );
    if (!isPublic && usuario?.nivel_acesso === "corretor" && !rotaPermitida) {
      const url = request.nextUrl.clone();
      url.pathname = "/cartorio";
      return redirecionar(url);
    }
  }

  if (!user && request.nextUrl.pathname === "/acesso-desativado") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirecionar(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf)$).*)",
  ],
};
