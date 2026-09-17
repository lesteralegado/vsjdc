-- Sprint 1: catalogue, staff access and read-only appointment foundation.
-- No patient booking endpoint or guessed scheduling rules are enabled here.
create schema private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('cabuyao', 'santa-rosa')),
  name text not null,
  active boolean not null default true
);
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 120),
  published boolean not null default false,
  sort_order integer not null default 0
);
create table public.dentists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  about text not null default '' check (length(about) <= 3000),
  photo_url text check (photo_url is null or photo_url ~ '^https://'),
  published boolean not null default false
);
create table private.staff_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  role text not null check (role in ('admin', 'receptionist')),
  active boolean not null default true
);
create table private.staff_branches (
  user_id uuid not null references private.staff_accounts(user_id) on delete cascade,
  branch_id uuid not null references public.branches(id),
  primary key (user_id, branch_id)
);
create index staff_branches_branch_idx on private.staff_branches(branch_id);
create table private.access_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  subject_id uuid,
  action text not null,
  created_at timestamptz not null default now()
);
alter table private.staff_accounts enable row level security;
alter table private.staff_branches enable row level security;
alter table private.access_events enable row level security;
revoke all on all tables in schema private from public, anon, authenticated;

-- These narrowly scoped helpers read private authorization records. All check
-- the authenticated identity, active membership and actual non-revoked session.
create function private.current_staff_role() returns text
language sql stable security definer set search_path = '' as $$
  select sa.role from private.staff_accounts sa
  join auth.users u on u.id = sa.user_id
  where auth.uid() is not null and sa.user_id = auth.uid() and sa.active
    and u.deleted_at is null and (u.banned_until is null or u.banned_until <= now())
    and exists (select 1 from auth.sessions s where s.user_id = sa.user_id
      and s.id = nullif(auth.jwt()->>'session_id', '')::uuid
      and (s.not_after is null or s.not_after > now()));
$$;
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and coalesce(private.current_staff_role() = 'admin', false);
$$;
create function private.can_access_branch(p_branch_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    private.is_admin() or (private.current_staff_role() = 'receptionist' and exists (
      select 1 from private.staff_branches sb where sb.user_id = auth.uid() and sb.branch_id = p_branch_id)));
$$;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  service_id uuid not null references public.services(id),
  dentist_id uuid references public.dentists(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  status text not null default 'pending' check (status in ('pending','confirmed','checked_in','completed','cancelled','no_show')),
  created_at timestamptz not null default now()
);
create index appointments_branch_time_idx on public.appointments(branch_id, starts_at);
create index appointments_service_idx on public.appointments(service_id);
create index appointments_dentist_idx on public.appointments(dentist_id);
create table public.appointment_contacts (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  patient_name text not null,
  mobile text not null,
  email text
);
alter table public.branches enable row level security;
alter table public.services enable row level security;
alter table public.dentists enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_contacts enable row level security;
revoke all on public.branches, public.services, public.dentists, public.appointments, public.appointment_contacts from public, anon, authenticated;
grant select on public.branches, public.services, public.dentists to anon, authenticated;
grant select on public.appointments, public.appointment_contacts to authenticated;
create policy public_active_branches on public.branches for select to anon, authenticated using (active);
create policy public_published_services on public.services for select to anon, authenticated using (published);
create policy public_published_dentists on public.dentists for select to anon, authenticated using (published);
create policy staff_branch_appointments on public.appointments for select to authenticated using (private.can_access_branch(branch_id));
create policy staff_branch_contacts on public.appointment_contacts for select to authenticated using (
  exists (select 1 from public.appointments a where a.id = appointment_id and private.can_access_branch(a.branch_id))
);
-- Appointment mutation is intentionally not granted in Sprint 1.

create function private.staff_context() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or private.current_staff_role() is null then
    raise exception 'Active staff access required' using errcode = '42501';
  end if;
  select jsonb_build_object('user_id', sa.user_id, 'display_name', sa.display_name, 'role', sa.role,
    'branches', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'slug', b.slug, 'name', b.name) order by b.slug)
      from public.branches b where b.active and private.can_access_branch(b.id)), '[]'::jsonb))
  into result from private.staff_accounts sa where sa.user_id = auth.uid();
  if jsonb_array_length(result->'branches') = 0 then
    raise exception 'No branch access assigned' using errcode = '42501';
  end if;
  return result;
end;
$$;
create function public.staff_context() returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.staff_context();
$$;

create function private.list_staff() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', sa.user_id, 'display_name', sa.display_name,
    'role', sa.role, 'active', sa.active, 'branch_ids', coalesce((select jsonb_agg(sb.branch_id)
      from private.staff_branches sb where sb.user_id = sa.user_id), '[]'::jsonb)) order by sa.display_name)
    from private.staff_accounts sa), '[]'::jsonb);
end;
$$;
create function public.list_staff() returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.list_staff();
$$;

create function private.set_staff_access(p_user_id uuid, p_role text, p_active boolean, p_branch_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then raise exception 'Cannot change your own access'; end if;
  if p_role is null or p_role not in ('admin','receptionist') or p_active is null then raise exception 'Invalid access settings'; end if;
  if p_role = 'receptionist' and p_active and coalesce(cardinality(p_branch_ids), 0) = 0 then raise exception 'Select at least one branch'; end if;
  if exists (select 1 from unnest(p_branch_ids) id where not exists (select 1 from public.branches b where b.id = id and b.active)) then raise exception 'Unknown branch'; end if;
  update private.staff_accounts set role = p_role, active = p_active where user_id = p_user_id;
  if not found then raise exception 'Staff account not found'; end if;
  delete from private.staff_branches where user_id = p_user_id;
  if p_role = 'receptionist' then
    insert into private.staff_branches(user_id, branch_id) select p_user_id, id from (select distinct unnest(p_branch_ids) id) selected;
  end if;
  insert into private.access_events(actor_id, subject_id, action) values (auth.uid(), p_user_id, 'staff_access_changed');
end;
$$;
create function public.set_staff_access(p_user_id uuid, p_role text, p_active boolean, p_branch_ids uuid[]) returns void
language sql security invoker set search_path = '' as $$
  select private.set_staff_access(p_user_id, p_role, p_active, p_branch_ids);
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.current_staff_role(), private.is_admin(), private.can_access_branch(uuid),
  private.staff_context(), private.list_staff(), private.set_staff_access(uuid,text,boolean,uuid[]) to authenticated;
revoke all on function public.staff_context(), public.list_staff(), public.set_staff_access(uuid,text,boolean,uuid[]) from public, anon, authenticated;
grant execute on function public.staff_context(), public.list_staff(), public.set_staff_access(uuid,text,boolean,uuid[]) to authenticated;

insert into public.branches(slug,name) values ('cabuyao','Cabuyao Clinic'),('santa-rosa','Santa Rosa Clinic');
insert into public.services(name,published,sort_order)
select name,true,ordinality::integer from unnest(array['Gingivectomy','Diastema Closure','Bite Plane','Crown Repair','Teeth Whitening','Laminate Veneers','ODONTECTOMY','ORTHODONTICS','CROWNS','Composite Veneers','Removable Denture','Pulpotomy','Oral Prophylaxis','Tooth Restoration','Retainers']) with ordinality as supplied(name,ordinality);
-- No invented dentists, patients, capacities, durations or staff credentials.
