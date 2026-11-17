-- =============================================================
-- ESCOLA CONECTA — Schema + RLS (PostgreSQL / Supabase)
-- Executar no SQL Editor do Supabase (ou supabase db push)
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- TABELAS ----------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('1A','1B','2A','2B','3A','3B'))
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('aluno','professor','coordenador','diretor')),
  matricula text unique,
  turma text references public.classes(name) on update cascade,
  active boolean not null default true,
  can_publish boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null check (category in ('geral','turma','professores','administrativo')),
  turma text references public.classes(name),
  important boolean not null default false,
  author_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  actor_name text,
  action text not null,
  details text,
  created_at timestamptz not null default now()
);

-- ---------- FUNÇÕES HELPER (evitam recursão de RLS) ----------
create or replace function public.my_profile()
returns public.profiles language sql stable security definer set search_path = public as $$
  select * from public.profiles where id = auth.uid();
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.can_publish()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select can_publish from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('coordenador','diretor') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_director()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'diretor' from public.profiles where id = auth.uid()), false);
$$;

-- Notificações + log automáticos ao publicar comunicado
create or replace function public.on_announcement_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid;
begin
  if new.category = 'geral' then
    insert into public.notifications (user_id, announcement_id)
    select p.id, new.id from public.profiles p where p.active and p.role in ('aluno','professor','coordenador','diretor');
  elsif new.category = 'turma' then
    insert into public.notifications (user_id, announcement_id)
    select p.id, new.id from public.profiles p where p.active and p.role = 'aluno' and p.turma = new.turma;
  elsif new.category = 'professores' then
    insert into public.notifications (user_id, announcement_id)
    select p.id, new.id from public.profiles p where p.active and p.role = 'professor';
  else -- administrativo
    insert into public.notifications (user_id, announcement_id)
    select p.id, new.id from public.profiles p where p.active and p.role in ('coordenador','diretor');
  end if;
  return new;
end $$;

drop trigger if exists trg_announcement_created on public.announcements;
create trigger trg_announcement_created after insert on public.announcements
for each row execute function public.on_announcement_created();

-- ---------- RLS: ativar em tudo ----------
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- CLASSES: qualquer autenticado lê; staff gerencia
create policy classes_read on public.classes for select to authenticated using (true);
create policy classes_write on public.classes for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- PROFILES
create policy profiles_read on public.profiles for select to authenticated using (true);
-- coordenador: cadastra/edita/desativa apenas alunos e professores (não pode conceder can_publish nem criar staff)
create policy profiles_coordenador on public.profiles for insert to authenticated
  with check (public.is_staff() and role in ('aluno','professor') and can_publish = false);
create policy profiles_coordenador_upd on public.profiles for update to authenticated
  using (public.is_staff() and role in ('aluno','professor'))
  with check (public.is_staff() and role in ('aluno','professor') and (can_publish = false or public.my_role() = 'diretor'));
-- diretor: controle total
create policy profiles_director on public.profiles for insert to authenticated
  with check (public.is_director());
create policy profiles_director_upd on public.profiles for update to authenticated
  using (public.is_director()) with check (public.is_director());
-- usuário atualiza o próprio avatar
create policy profiles_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_delete on public.profiles for delete to authenticated
  using (public.is_director());

-- ANNOUNCEMENTS
create policy ann_read on public.announcements for select to authenticated using (
  case public.my_role()
    when 'diretor' then true
    when 'coordenador' then true
    when 'professor' then category in ('geral','professores')
    else category = 'geral' or (category = 'turma' and turma = (select turma from public.profiles where id = auth.uid()))
  end
);
create policy ann_insert_prof on public.announcements for insert to authenticated
  with check (
    public.my_role() in ('diretor','coordenador')
    or (public.my_role() = 'professor' and public.can_publish() and category in ('geral','professores'))
  );
create policy ann_update on public.announcements for update to authenticated
  using (
    public.is_director() or public.is_staff()
    or (author_id = auth.uid() and public.can_publish())
  ) with check (
    public.is_director() or public.is_staff()
    or (author_id = auth.uid() and public.can_publish())
  );
create policy ann_delete on public.announcements for delete to authenticated
  using (public.is_staff() or (author_id = auth.uid() and public.can_publish()));

-- READS (confirmação de leitura)
create policy reads_insert_own on public.announcement_reads for insert to authenticated
  with check (user_id = auth.uid());
create policy reads_read on public.announcement_reads for select to authenticated using (
  user_id = auth.uid() or public.is_staff()
  or exists (select 1 from public.announcements a where a.id = announcement_id and a.author_id = auth.uid())
);

-- NOTIFICATIONS
create policy notif_own on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_update_own on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete_own on public.notifications for delete to authenticated using (user_id = auth.uid());

-- AUDIT LOG
create policy audit_insert on public.audit_log for insert to authenticated with check (public.is_staff());
create policy audit_select on public.audit_log for select to authenticated using (public.is_director() or public.is_staff());

-- Realtime (Supabase): habilita notificações em tempo real
alter publication supabase_realtime add table public.notifications;


-- Proteção contra auto-escalada: usuário comum não pode alterar campos
-- privilegiados do próprio perfil (role, can_publish, active, turma, matrícula, e-mail)
create or replace function public.protect_profiles() returns trigger language plpgsql security definer set search_path = public as $$
declare actor_role text;
begin
  select role into actor_role from public.profiles where id = auth.uid();
  if actor_role in ('coordenador','diretor') then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.can_publish is distinct from old.can_publish
     or new.active is distinct from old.active
     or new.turma is distinct from old.turma
     or new.matricula is distinct from old.matricula
     or new.email is distinct from old.email then
    raise exception 'Sem permissão para alterar campos privilegiados do perfil.';
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_profiles on public.profiles;
create trigger trg_protect_profiles before update on public.profiles
for each row execute function public.protect_profiles();

-- updated_at automático
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch on public.announcements;
create trigger trg_touch before update on public.announcements for each row execute function public.touch_updated_at();
