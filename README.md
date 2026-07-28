# Vitral — Gestão de Processos e Prazos

Aplicação para centralizar processos da imobiliária (venda, locação, correspondente
bancário, registro) com etapas geradas automaticamente a partir de modelos, calendário
e alertas de prazo. Feita para ser usada por várias pessoas (você, outra gerente,
diretora), cada uma com login próprio.

Stack: **Next.js + Supabase (Postgres + Auth) + Vercel**.

---

## 1. Criar o projeto no Supabase

1. Acesse https://supabase.com e crie uma conta (ou entre com GitHub).
2. **New Project** → escolha um nome (ex: `prazo-imobiliaria`), uma senha forte para o
   banco (guarde-a) e a região mais próxima (South America / São Paulo, se disponível).
3. Aguarde alguns minutos até o projeto ficar pronto.
4. No menu lateral, vá em **SQL Editor** → **New query**.
5. Abra, nesta ordem, os arquivos da pasta `supabase/migrations/` deste projeto e
   cole o conteúdo de cada um no editor, executando um de cada vez (botão *Run*):
   - `0001_init.sql`
   - `0002_seed_function.sql`
   - `0003_onboarding.sql`
6. Vá em **Project Settings → API**. Copie:
   - **Project URL** → vai virar `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → vai virar `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Por padrão o Supabase pede confirmação de e-mail no cadastro. Para uso interno de
poucas pessoas, você pode desativar isso em **Authentication → Providers → Email →
Confirm email** (desligue), assim login funciona na hora, sem clicar em link de
e-mail.

## 2. Rodar localmente (opcional, para conferir antes de publicar)

```bash
cd vitral
npm install
cp .env.local.example .env.local
# edite .env.local com a URL e a anon key copiadas acima
npm run dev
```

Abra http://localhost:3000 — vai te mandar para `/login`.

## 3. Publicar no Vercel

1. Suba esta pasta para um repositório no GitHub (crie um repo novo e faça `git init`,
   `git add .`, `git commit -m "primeira versão"`, `git push`).
2. Acesse https://vercel.com, entre com GitHub, **Add New → Project**, selecione o
   repositório.
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**. Em ~1 minuto você recebe uma URL pública tipo
   `https://vitral-sacra.vercel.app`.

## 4. Primeiro acesso (você)

1. Abra o link do Vercel → **Criar conta** → seu nome, e-mail, senha.
2. Você cai automaticamente na tela **"Bem-vindo(a) ao Vitral"** → digite o nome da
   imobiliária → **Criar organização**. Isso já cria os 4 modelos de processo padrão
   (Venda Financiada, Locação, Correspondente Bancário, Registro de Imóvel).
3. Vá em **Membros** e cadastre o e-mail da diretora e da outra gerente — mas antes
   elas precisam ter criado a própria conta em `/login` (peça para elas fazerem
   "Criar conta" primeiro, com o e-mail que você vai cadastrar). Depois disso, defina
   o perfil de cada uma (diretora / gerente) e clique **Adicionar**.
4. A partir daí, todas acessam o mesmo link e veem os mesmos dados, cada uma logada
   com seu próprio usuário.

## 5. Cadastrar clientes, imóveis, bancos e corretores

Este MVP ainda não tem tela própria para esses cadastros (isso entra na próxima
leva de telas). Por enquanto, cadastre-os direto pelo **Supabase → Table Editor**,
nas tabelas `clientes`, `imoveis`, `bancos`, `corretores` — leva menos de um minuto
por registro e não exige SQL. Depois de cadastrados, eles aparecem automaticamente
nos formulários de "Novo processo".

## O que já funciona

- Login com várias contas, cada uma com perfil (admin, diretora, gerente, corretor,
  correspondente, financeiro)
- Modelos de processo com etapas e prazos automáticos (fixo, +N dias da criação,
  +N dias da etapa anterior)
- Criar processo a partir de um modelo, com prévia das etapas antes de confirmar
- Marcar etapa como concluída → recalcula automaticamente as etapas seguintes que
  dependem dela
- Checklist por etapa (ex: Registro: ITBI, protocolo, devolução, matrícula)
- Comentários e histórico por processo
- Calendário mensal com filtro por responsável
- Painel de alertas (atrasadas, vencendo hoje, vencendo em 7 dias)

## O que fica para a próxima etapa (V2, ver especificação enviada antes)

- Telas de cadastro de clientes/imóveis/bancos/corretores (hoje é via Supabase)
- Editor visual de modelos de processo (hoje os modelos são fixos via SQL seed)
- Módulo de comissões
- Notificações por e-mail/push
- Permissões finas por perfil (hoje todo mundo do mesmo tenant vê tudo)

---

Qualquer dúvida no passo a passo, me chame por aqui.
