# 🏫 Escola Conecta

Sistema web completo de **comunicação e gestão escolar** que centraliza avisos e comunicados em um único ambiente digital — substituindo o envio repetitivo de áudios e mensagens em grupos de WhatsApp.

## ✨ Funcionalidades (todas operacionais)

| Área | Descrição |
|---|---|
| **Login por perfil** | 4 tipos de acesso: **Aluno** (e-mail + senha + **matrícula única**), **Professor**, **Coordenador** e **Diretor** (e-mail institucional + senha). Verificação de papel e matrícula feita **no servidor** |
| **Aluno** | Somente leitura: avisos gerais + avisos da sua turma (1A–3B). Não cria, edita nem publica nada (bloqueado por RLS no banco) |
| **Professor** | Vê comunicados gerais e da equipe docente. Só pode publicar se o **diretor autorizar individualmente** (permissão verificada no servidor) |
| **Coordenador** | Cadastra/edita/desativa alunos e professores, vincula alunos às turmas, publica/edita/exclui comunicados |
| **Diretor** | Controle total: tudo do coordenador + gerencia coordenadores, concede/retira permissão de publicação dos professores, exclui usuários, acompanha todas as atividades |
| **Comunicados em cartões** | Título, descrição, data, horário e responsável. Categorias: **gerais, por turma, professores e administrativos** — cada perfil vê apenas o que lhe corresponde |
| **Notificações em tempo real** | Sino com badge de não lidas, atualizado via Supabase Realtime ao publicar um aviso |
| **Confirmação de leitura** | Coordenadores/diretores veem quantos receberam, leram e não leram cada aviso; professores acompanham a leitura das próprias publicações |
| **Destaque de avisos importantes** | Seção separada no topo do feed |
| **Painel administrativo** | Abas de Usuários, Turmas, Comunicados, Permissões (diretor) e Registro de Atividades (audit log) |
| **Segurança** | Row Level Security (RLS) em todas as tabelas + verificação dupla (banco e servidor) em cada ação. Service-role key usada **somente** em rotas de servidor |

## 🛠 Stack

- **Next.js 14** (App Router, TypeScript) + **Tailwind CSS** — identidade verde-escuro/branco, botões com cantos arredondados
- **Supabase** — PostgreSQL, Auth (e-mail/senha), Row Level Security e Realtime
- **Vercel** — hospedagem com deploy contínuo a partir do GitHub

## 🚀 1. Criar o banco no Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e um novo projeto.
2. No painel, abra **SQL Editor** → cole todo o conteúdo de [`supabase/migrations/001_schema.sql`](supabase/migrations/001_schema.sql) → **Run**.
   Isso cria tabelas, funções, triggers, políticas RLS e habilita o Realtime.
3. Copie em **Project Settings → API**: a `Project URL`, a `anon key` e a `service_role key`.

## ⚙️ 2. Configurar e rodar localmente

```bash
git clone https://github.com/SEU-USUARIO/escola-conecta
cd escola-conecta
npm install

cp .env.example .env.local
# Edite .env.local com as credenciais do seu Supabase

npm run seed     # cria usuários e comunicados de demonstração
npm run dev      # abre em http://localhost:3000
```

## 🔑 Credenciais de demonstração (criadas pelo seed)

| Perfil | E-mail | Senha | Extras |
|---|---|---|---|
| Diretor | diretor@escola.com | Diretor123 | acesso total |
| Coordenador | coordenador@escola.com | Coordenador123 | cadastra usuários |
| Professora autorizada | professora@escola.com | Professor123 | **pode publicar** |
| Professor sem permissão | professor2@escola.com | Professor123 | **não pode publicar** |
| Aluna (Turma 2A) | aluna@escola.com | Aluno123 | matrícula **2024001** |
| Aluno (Turma 1A) | aluno2@escola.com | Aluno123 | matrícula **2024002** |
| Aluna (Turma 3B) | aluno3@escola.com | Aluno123 | matrícula **2024003** |

> No login de aluno, informe e-mail **+ matrícula** + senha.

## 🐙 3. Publicar no GitHub

```bash
git init
git add .
git commit -m "Escola Conecta: sistema de comunicação escolar"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/escola-conecta.git
git push -u origin main
```

(crie o repositório vazio em github.com/new antes do `git remote add`)

## ☁️ 4. Publicar online na Vercel (deploy contínuo)

1. Acesse [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório.
2. A Vercel detecta Next.js automaticamente (`vercel.json` já está configurado).
3. Em **Environment Variables**, adicione para *Production, Preview e Development*:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (marque como sensível — nunca é enviada ao navegador)
4. Clique em **Deploy**. Em ~2 minutos o site estará no ar em `https://seu-projeto.vercel.app`.
5. **Deploy contínuo:** todo `git push` na branch `main` publica automaticamente uma nova versão.

No Supabase, em **Authentication → URL Configuration**, adicione a URL da Vercel em *Site URL* e em *Redirect URLs*.

## 🧱 Arquitetura

```
app/
  page.tsx                     → tela de login (4 perfis)
  api/login                    → autenticação + checagem de papel/matrícula no servidor
  api/users, api/users/[id]    → CRUD de usuários (service-role, com checagem de permissões)
  api/announcements(+/[id])    → publicar/editar/excluir comunicados
  api/reads                    → confirmação de leitura
  dashboard/                   → feed em cartões, novo/editar comunicado, minhas publicações
  admin/                       → painel do coordenador/diretor (usuários, turmas, permissões, atividade)
components/Shell.tsx           → topbar + menu hambúrguer + perfil + notificações em tempo real
supabase/migrations/           → schema + políticas RLS por perfil
```

A permissão é garantida em **três camadas**: políticas RLS no banco (impossíveis de burlar pelo cliente), verificação nas rotas de servidor e ocultação de botões na interface.

## 📱 Responsividade

Interface única adaptada a desktop e celular: menu lateral em gaveta, cartões fluidos e tipografia legível.
