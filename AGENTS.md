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
- **Cálculos ficam em `src/lib/` com teste ao lado** (`*.test.ts`, Vitest): datas de recorrência, leitura de CSV, proporcionalidade, custas, urgência, motor de etapas. Antes de publicar: `npm run typecheck && npm run lint && npm test && npm run build` — o GitHub roda o mesmo (`.github/workflows/verificacao.yml`).
- **Migrations**: todo arquivo novo em `supabase/migrations/` enviado à `main` é aplicado automaticamente no banco de produção pelo workflow `supabase-migrations.yml`. Antes de criar uma, confira o maior número já usado na `main` **e** em `supabase_migrations.schema_migrations` — duas migrations com o mesmo número fazem a mais nova nunca rodar (aconteceu com a 0083).
- **Saldo das contas**: sempre via `movimentoPorConta()` de `src/lib/saldos.ts` (baixas + transferências). Não recalcular à mão em cada tela.
- **Desempenho**: funções rodam em `gru1` (mesma região do Supabase). Consultas independentes vão em `Promise.all`; chamadas ao Google Agenda vão em `after()` e com timeout.
- **Avaliação de Imóveis** (`/avaliacoes`): cálculos, validação, conteúdo/hash e PDF ficam em `src/lib/avaliacao/` (funções puras, com teste). Toda alteração de conteúdo passa por `aposEdicao()` em `avaliacoes/actions.ts` (registra evento e devolve a rascunho o que estava aprovado). Aprovação/emissão seguem `podeAprovar()` e o gatilho `avaliacoes_guardar_transicao` no banco; versões emitidas (`avaliacao_versoes`) são imutáveis. Venda e locação nunca entram na mesma amostra. Para conferir o layout do PDF sem banco: `npx tsx scripts/avaliacao-pdf-teste.ts <pasta>` (dados fictícios).
