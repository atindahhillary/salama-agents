-- SAFE-A starter kit: action tiers, approvals, action log and kill switch (SC-3, EV-1, EV-3).
-- Postgres 14+ (works on Supabase). Agents never write to the world directly: they PROPOSE actions here,
-- people APPROVE them, and only then does your worker EXECUTE them. Apache-2.0.

create schema if not exists safea;

create table safea.agents (
  id          text primary key,                       -- matches the job card
  owner       text not null,
  deputy      text not null,
  enabled     boolean not null default true,          -- the kill switch
  disabled_at timestamptz, disabled_by text, disabled_reason text
);

-- Tier 0 read, 1 draft, 2 send/publish/change (one approver), 3 money, sensitive export, delete (two approvers)
create table safea.actions (
  id           uuid primary key default gen_random_uuid(),
  agent_id     text not null references safea.agents(id),
  tier         smallint not null check (tier between 0 and 3),
  kind         text not null check (kind ~ '^[a-z_]{2,40}$'),   -- e.g. send_whatsapp, update_record
  summary      text not null check (char_length(summary) <= 500),   -- human-readable, no raw personal data
  payload_ref  text,                                   -- pointer to the payload in your own system, not the payload
  triggered_by text not null,                          -- person, schedule or upstream event
  read_refs    text[] not null default '{}',           -- what the agent read, by reference (EV-1)
  status       text not null default 'proposed' check (status in ('proposed','approved','rejected','executed','failed','cancelled')),
  created_at   timestamptz not null default now(),
  executed_at  timestamptz
);

create table safea.approvals (
  action_id   uuid not null references safea.actions(id) on delete cascade,
  approver    text not null,
  decision    text not null check (decision in ('approve','reject')),
  note        text check (char_length(note) <= 500),
  decided_at  timestamptz not null default now(),
  primary key (action_id, approver)                    -- one vote per person
);

-- Append-only log of everything that happens (EV-1).
create table safea.action_log (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  action_id uuid, agent_id text, event text not null, actor text, detail jsonb
);
revoke update, delete on safea.action_log from public;

create or replace function safea.log() returns trigger language plpgsql as $$
begin
  insert into safea.action_log (action_id, agent_id, event, actor, detail)
  values (new.id, new.agent_id, tg_op || ':' || new.status, new.triggered_by,
          jsonb_build_object('tier', new.tier, 'kind', new.kind));
  return new;
end $$;
create trigger actions_log after insert or update of status on safea.actions for each row execute function safea.log();

-- Agents call this to propose. Tier 0 is auto-approved; everything else waits for people.
create or replace function safea.propose(p_agent text, p_tier int, p_kind text, p_summary text, p_payload_ref text, p_by text, p_reads text[])
returns uuid language plpgsql as $$
declare v_id uuid; v_enabled boolean;
begin
  select enabled into v_enabled from safea.agents where id = p_agent;
  if v_enabled is distinct from true then raise exception 'agent % is stopped or unknown', p_agent; end if;
  insert into safea.actions (agent_id, tier, kind, summary, payload_ref, triggered_by, read_refs, status)
  values (p_agent, p_tier, p_kind, p_summary, p_payload_ref, p_by, coalesce(p_reads, '{}'),
          case when p_tier = 0 then 'approved' else 'proposed' end)
  returning id into v_id;
  return v_id;
end $$;

-- People call this to decide. Tier 2 needs one approval; tier 3 needs two different approvers. Any rejection wins.
create or replace function safea.decide(p_action uuid, p_approver text, p_decision text, p_note text default null)
returns text language plpgsql as $$
declare v_tier int; v_status text; v_by text; v_yes int; v_no int;
begin
  select tier, status, triggered_by into v_tier, v_status, v_by from safea.actions where id = p_action for update;
  if v_status <> 'proposed' then raise exception 'action is %', v_status; end if;
  if p_approver = v_by then raise exception 'the person who triggered an action cannot approve it'; end if;
  insert into safea.approvals (action_id, approver, decision, note) values (p_action, p_approver, p_decision, p_note);
  select count(*) filter (where decision = 'approve'), count(*) filter (where decision = 'reject')
    into v_yes, v_no from safea.approvals where action_id = p_action;
  if v_no > 0 then update safea.actions set status = 'rejected' where id = p_action; return 'rejected'; end if;
  if (v_tier <= 2 and v_yes >= 1) or (v_tier = 3 and v_yes >= 2) then
    update safea.actions set status = 'approved' where id = p_action; return 'approved';
  end if;
  return 'waiting';
end $$;

-- Your worker executes only approved actions from enabled agents, then marks them.
create or replace view safea.ready_to_execute as
  select a.* from safea.actions a join safea.agents g on g.id = a.agent_id
   where a.status = 'approved' and g.enabled;

-- The kill switch (EV-3): stops new proposals and execution at once, and cancels what is waiting.
create or replace function safea.stop_agent(p_agent text, p_by text, p_reason text) returns void language plpgsql as $$
begin
  update safea.agents set enabled = false, disabled_at = now(), disabled_by = p_by, disabled_reason = p_reason where id = p_agent;
  update safea.actions set status = 'cancelled' where agent_id = p_agent and status in ('proposed', 'approved');
  insert into safea.action_log (agent_id, event, actor, detail) values (p_agent, 'KILL_SWITCH', p_by, jsonb_build_object('reason', p_reason));
end $$;

-- Test the kill switch monthly and record it:
-- select safea.stop_agent('meal', 'owner@example.org', 'monthly stop test');
-- update safea.agents set enabled = true, disabled_at = null where id = 'meal';
