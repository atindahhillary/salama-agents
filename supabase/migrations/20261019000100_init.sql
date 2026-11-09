-- Salama Agents: production schema (council/02-security.md, adapted).
-- Run as postgres. Then apply supabase/generated/answers_schema.sql (built from src/content.js).
-- After applying: Security Advisor at zero findings, then test with the anon key
-- (SELECT must fail; inserting status or brief must fail; never use upsert from the client).

create extension if not exists pg_jsonschema with schema extensions;
create extension if not exists pg_cron;

-- 0. Lock defaults ------------------------------------------------------------
create schema if not exists private;                 -- never add to the Data API exposed schemas
revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges for role postgres in schema public  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private revoke execute on functions from public;
-- drop extension if exists pg_graphql;              -- if unused

-- Any script allowed; no markup, control, bidi or zero-width characters. The client collapses newlines.
create domain public.safe_text as text
  check (value !~ '[<>[:cntrl:]​-‏‪-‮⁠-⁩﻿]');

-- 1. Tables -------------------------------------------------------------------
create table public.assessments (
  id             uuid primary key,                    -- crypto.randomUUID() on the device
  created_at     timestamptz not null default now(),
  schema_version smallint not null check (schema_version between 1 and 50),
  lang           text not null check (lang in ('en', 'sw')),
  ref            text check (ref ~ '^[a-z0-9-]{1,32}$'),
  variant        text check (variant in ('A', 'B')),
  answers        jsonb not null check (octet_length(answers::text) <= 6000),  -- shape: answers_schema.sql
  task_text      public.safe_text check (char_length(task_text) <= 280),   -- redacted on the device, never sent to AI
  client_score   smallint check (client_score between 0 and 100),          -- display only; the server recomputes
  consent_report boolean not null default false,
  -- server-owned: anon has no column grant on anything below
  status         text not null default 'new' check (status in ('new','contacted','discovery','pilot','won','lost')),
  quality        text not null default 'unverified' check (quality in ('unverified','verified','spam')),
  brief          jsonb check (brief is null or octet_length(brief::text) <= 12000),
  brief_attempts smallint not null default 0 check (brief_attempts between 0 and 3),
  brief_at       timestamptz,
  brief_model    text,
  brief_prompt   text
);
create index on public.assessments (created_at);

create table public.contacts (
  id              uuid primary key default gen_random_uuid(),
  assessment_id   uuid not null unique references public.assessments(id) on delete cascade,
  created_at      timestamptz not null default now(),
  name            public.safe_text check (char_length(name) <= 80),
  role            public.safe_text check (char_length(role) <= 80),
  org             public.safe_text check (char_length(org) <= 120),
  email           public.safe_text check (email ~ '^[^@[:space:]]{1,64}@[^@[:space:]]{1,190}\.[^@[:space:].]{2,24}$'),
  whatsapp        text check (whatsapp ~ '^\+[1-9][0-9]{6,14}$'),          -- E.164
  consent_contact boolean not null check (consent_contact),               -- no consent, no row
  consent_version text not null check (consent_version ~ '^[a-z0-9.-]{1,40}$'),
  last_contact_at timestamptz,
  check (email is not null or whatsapp is not null)
);

create table public.feedback (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.assessments(id) on delete cascade,
  created_at    timestamptz not null default now(),
  rating        smallint not null check (rating between 1 and 5),
  comment       public.safe_text check (char_length(comment) <= 500)
);

create table public.events (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid not null,                            -- in memory per tab, never persisted
  name       text not null,                            -- allowed names: answers_schema.sql
  step       smallint check (step between 1 and 7),
  detail     text check (detail ~ '^[a-z0-9_-]{0,32}$'),
  ref        text check (ref ~ '^[a-z0-9-]{1,32}$'),
  lang       text check (lang in ('en', 'sw')),
  variant    text check (variant in ('A', 'B'))
);
create index on public.events (created_at);

create table private.admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  label    text not null,                              -- human reference only; auth uses user_id
  active   boolean not null default true,
  added_at timestamptz not null default now()
);
create table private.rate_counters (
  bucket text not null, bucket_day date not null, hits int not null,
  primary key (bucket, bucket_day)
);
create table private.settings (key text primary key, value text not null);
insert into private.settings values ('briefs_enabled', 'true'), ('ip_cap', '20'), ('global_cap', '150');
-- Kill switch: update private.settings set value = 'false' where key = 'briefs_enabled';
create table private.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid, action text not null, target uuid, detail jsonb
);
alter table private.admins        enable row level security;   -- no policies: deny all but owner
alter table private.rate_counters enable row level security;
alter table private.settings      enable row level security;
alter table private.audit_log     enable row level security;
-- After creating your own auth user by hand (sign-ups off):
-- insert into private.admins (user_id, label) values ('<your auth.users id>', 'founder');

-- 2. is_admin(): definer, pinned search_path, uid allowlist, authenticator app required ----
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
     and exists (select 1 from private.admins a where a.user_id = (select auth.uid()) and a.active);
$$;
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

-- 3. RLS and grants -------------------------------------------------------------
alter table public.assessments enable row level security;
alter table public.contacts    enable row level security;
alter table public.feedback    enable row level security;
alter table public.events      enable row level security;

grant usage on schema public to anon, authenticated;
grant insert (id, schema_version, lang, ref, variant, answers, task_text, client_score, consent_report)
  on public.assessments to anon, authenticated;
grant insert (assessment_id, name, role, org, email, whatsapp, consent_contact, consent_version)
  on public.contacts to anon, authenticated;
grant insert (assessment_id, rating, comment) on public.feedback to anon, authenticated;
grant insert (session_id, name, step, detail, ref, lang, variant) on public.events to anon, authenticated;

create policy assessments_insert on public.assessments for insert to anon, authenticated
  with check (status = 'new' and quality = 'unverified' and brief is null and brief_attempts = 0);
create policy contacts_insert on public.contacts for insert to anon, authenticated with check (consent_contact);
create policy feedback_insert on public.feedback for insert to anon, authenticated with check (true);
create policy events_insert   on public.events   for insert to anon, authenticated with check (true);

grant select on public.assessments, public.contacts, public.feedback, public.events to authenticated;
grant update (status, quality, task_text) on public.assessments to authenticated;   -- task_text: purge only
grant update (last_contact_at) on public.contacts to authenticated;
grant delete on public.contacts to authenticated;                                  -- erasure requests

create policy assessments_admin_select on public.assessments for select to authenticated using ((select public.is_admin()));
create policy assessments_admin_update on public.assessments for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy contacts_admin_select on public.contacts for select to authenticated using ((select public.is_admin()));
create policy contacts_admin_update on public.contacts for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy contacts_admin_delete on public.contacts for delete to authenticated using ((select public.is_admin()));
create policy feedback_admin_select on public.feedback for select to authenticated using ((select public.is_admin()));
create policy events_admin_select   on public.events   for select to authenticated using ((select public.is_admin()));

-- Admins may only purge the note (set it to null), never rewrite it.
create or replace function private.note_purge_only() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.task_text is distinct from old.task_text and new.task_text is not null then
    raise exception 'task_text can only be purged' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger note_purge_only before update of task_text on public.assessments
  for each row execute function private.note_purge_only();

-- 4. Audit and insert throttle ---------------------------------------------------
create or replace function private.audit_assessment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.audit_log (actor, action, target, detail)
  values ((select auth.uid()), 'update:assessments', new.id,
          jsonb_build_object('status', old.status || '>' || new.status, 'quality', old.quality || '>' || new.quality,
                             'note_purged', old.task_text is not null and new.task_text is null));
  return null;
end $$;
create or replace function private.audit_contact_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.audit_log (actor, action, target) values ((select auth.uid()), 'delete:contacts', old.assessment_id);
  return null;
end $$;
create trigger audit_admin_edit after update of status, quality, task_text on public.assessments
  for each row execute function private.audit_assessment();
create trigger audit_contact_delete after delete on public.contacts
  for each row execute function private.audit_contact_delete();

-- Bounded database: a short submission outage is better than unbounded growth under attack.
create or replace function private.throttle() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_recent int;
begin
  if tg_table_name = 'assessments' then
    select count(*) into v_recent from public.assessments where created_at > now() - interval '10 minutes';
  else
    select count(*) into v_recent from public.events where created_at > now() - interval '10 minutes';
  end if;
  if v_recent >= tg_argv[0]::int then raise exception 'busy' using errcode = 'P0001'; end if;
  return new;
end $$;
create trigger throttle before insert on public.assessments for each row execute function private.throttle('120');
create trigger throttle before insert on public.events      for each row execute function private.throttle('3000');

-- 5. Atomic brief gate: per assessment, per IP-HMAC per UTC day, global per UTC day ----
create or replace function public.claim_brief(p_assessment uuid, p_ip_hmac text)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_day   date := (now() at time zone 'utc')::date;
  v_ipcap int  := (select value::int from private.settings where key = 'ip_cap');
  v_gcap  int  := (select value::int from private.settings where key = 'global_cap');
  v_hits  int;
  v_prof  jsonb;
begin
  if coalesce((select value from private.settings where key = 'briefs_enabled'), 'false') <> 'true' then
    raise exception 'disabled' using errcode = 'P0001';
  end if;
  if p_ip_hmac !~ '^[0-9a-f]{64}$' then raise exception 'invalid' using errcode = 'P0001'; end if;

  update public.assessments a
     set brief_attempts = a.brief_attempts + 1
   where a.id = p_assessment and a.brief_attempts < 3
     and a.created_at > now() - interval '24 hours' and a.quality <> 'spam'
  returning jsonb_build_object('lang', a.lang, 'answers', a.answers) into v_prof;   -- never the note, never contacts
  if v_prof is null then raise exception 'limit_assessment' using errcode = 'P0001'; end if;

  insert into private.rate_counters as c (bucket, bucket_day, hits) values ('ip:' || p_ip_hmac, v_day, 1)
  on conflict (bucket, bucket_day) do update set hits = c.hits + 1 where c.hits < v_ipcap
  returning c.hits into v_hits;
  if v_hits is null then raise exception 'limit_ip' using errcode = 'P0001'; end if;

  v_hits := null;
  insert into private.rate_counters as c (bucket, bucket_day, hits) values ('global', v_day, 1)
  on conflict (bucket, bucket_day) do update set hits = c.hits + 1 where c.hits < v_gcap
  returning c.hits into v_hits;
  if v_hits is null then raise exception 'limit_global' using errcode = 'P0001'; end if;

  return v_prof;   -- any exception rolls back all three increments
end $$;

create or replace function public.store_brief(p_assessment uuid, p_brief jsonb, p_model text, p_prompt text)
returns void language sql volatile security definer set search_path = ''
as $$
  update public.assessments set brief = p_brief, brief_at = now(), brief_model = left(p_model, 64), brief_prompt = left(p_prompt, 32)
   where id = p_assessment and brief_attempts > 0;
$$;

revoke execute on function public.claim_brief(uuid, text)               from public, anon, authenticated;
revoke execute on function public.store_brief(uuid, jsonb, text, text)  from public, anon, authenticated;
grant  execute on function public.claim_brief(uuid, text)               to service_role;
grant  execute on function public.store_brief(uuid, jsonb, text, text)  to service_role;

-- 6. Retention (council/SYNTHESIS.md) ---------------------------------------------
select cron.schedule('salama-retention', '15 3 * * *', $job$
  delete from private.rate_counters where bucket_day < current_date - 2;
  update public.assessments set task_text = null where task_text is not null and created_at < now() - interval '90 days';
  update public.assessments set brief = null where brief is not null and brief_at < now() - interval '180 days';
  delete from public.events where created_at < now() - interval '12 months';
  delete from public.contacts c using public.assessments a
   where a.id = c.assessment_id and a.status in ('new','lost') and c.created_at < now() - interval '12 months';
  delete from public.contacts where coalesce(last_contact_at, created_at) < now() - interval '24 months';
  delete from public.assessments where created_at < now() - interval '36 months';
  delete from private.audit_log where at < now() - interval '24 months';
$job$);
