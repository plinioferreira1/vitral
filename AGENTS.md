<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Convenções do Vitral

- **Tipos do banco**: `src/lib/database.types.ts` é gerado a partir do Supabase (não editar à mão). Depois de toda migration, regenerar (Supabase MCP `generate_typescript_types` ou `supabase gen types typescript`) e rodar `npx tsc --noEmit`.
- **Valores de lista vindos de formulário** (tipo, categoria, papel, perfil…): usar `valorDaLista()` de `src/lib/validacao.ts`, nunca `String(...) as Tipo`.
- **Gravações em Server Actions**: envolver com `checar(op, "verbo")` de `src/lib/aviso.ts` — em caso de erro a pessoa vê uma notificação. Para avisos explícitos (sucesso/erro), usar `avisar()`.
- **Botões de envio**: usar `<BotaoEnviar>` (`src/components/botao-enviar.tsx`), que mostra "Salvando…" e bloqueia clique duplo.
- **Usuário logado**: `getUsuarioAtual()` (`src/lib/usuario-atual.ts`, memorizado por requisição) em vez de repetir `auth.getUser()` + select em `usuarios`.
- **Desempenho**: funções rodam em `gru1` (mesma região do Supabase). Consultas independentes vão em `Promise.all`; chamadas ao Google Agenda vão em `after()` e com timeout.
