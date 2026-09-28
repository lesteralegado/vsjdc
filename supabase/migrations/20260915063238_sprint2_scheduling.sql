-- Sprint 2 configuration. No patient booking/write endpoint is enabled.
create table private.branch_schedule_settings (
  branch_id uuid primary key references public.branches(id),
  opening_days integer[] not null check (cardinality(opening_days) between 1 and 7 and opening_days <@ array[0,1,2,3,4,5,6]),
  opens_at time not null, closes_at time not null check (closes_at > opens_at),
  chairs integer not null check (chairs between 1 and 100),
  lead_minutes integer not null check (lead_minutes between 0 and 10080),
  horizon_days integer not null check (horizon_days between 1 and 180),
  step_minutes integer not null check (step_minutes between 5 and 60)
);
create table private.branch_service_settings (
  branch_id uuid not null references public.branches(id),
  service_id uuid not null references public.services(id),
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  buffer_minutes integer not null check (buffer_minutes between 0 and 120),
  enabled boolean not null default false,
  primary key(branch_id,service_id)
);
create index branch_service_service_idx on private.branch_service_settings(service_id);
create table private.dentist_rules (
  dentist_id uuid primary key references public.dentists(id),
  travel_minutes integer not null check (travel_minutes between 0 and 240),
  active boolean not null default true
);
create table private.dentist_eligibility (
  dentist_id uuid not null references public.dentists(id),
  service_id uuid not null references public.services(id),
  primary key(dentist_id,service_id)
);
create index dentist_eligibility_service_idx on private.dentist_eligibility(service_id);
create table private.dentist_shifts (
  id uuid primary key default gen_random_uuid(),
  dentist_id uuid not null references public.dentists(id),
  branch_id uuid not null references public.branches(id),
  starts_at timestamptz not null, ends_at timestamptz not null check(ends_at > starts_at),
  check ((starts_at at time zone 'Asia/Manila')::date = (ends_at at time zone 'Asia/Manila')::date)
);
create index dentist_shifts_dentist_time_idx on private.dentist_shifts(dentist_id,starts_at);
create index dentist_shifts_branch_time_idx on private.dentist_shifts(branch_id,starts_at);
create table private.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  dentist_id uuid references public.dentists(id),
  starts_at timestamptz not null, ends_at timestamptz not null check(ends_at > starts_at),
  reason text not null check(length(trim(reason)) between 1 and 200)
);
create index schedule_blocks_branch_time_idx on private.schedule_blocks(branch_id,starts_at);
create index schedule_blocks_dentist_idx on private.schedule_blocks(dentist_id);
create table private.branch_resources (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  name text not null check(length(trim(name)) between 1 and 80),
  capacity integer not null check(capacity between 1 and 100),
  unique(branch_id,name)
);
create table private.service_resources (
  branch_id uuid not null,
  service_id uuid not null,
  resource_id uuid not null references private.branch_resources(id),
  units integer not null check(units between 1 and 100),
  primary key(branch_id,service_id,resource_id),
  foreign key(branch_id,service_id) references private.branch_service_settings(branch_id,service_id) on delete cascade
);
create index service_resources_resource_idx on private.service_resources(resource_id);

alter table private.branch_schedule_settings enable row level security;
alter table private.branch_service_settings enable row level security;
alter table private.dentist_rules enable row level security;
alter table private.dentist_eligibility enable row level security;
alter table private.dentist_shifts enable row level security;
alter table private.schedule_blocks enable row level security;
alter table private.branch_resources enable row level security;
alter table private.service_resources enable row level security;
revoke all on private.branch_schedule_settings,private.branch_service_settings,private.dentist_rules,
private.dentist_eligibility,private.dentist_shifts,private.schedule_blocks,private.branch_resources,private.service_resources from public,anon,authenticated;

create function private.schedule_context(p_branch uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not coalesce(private.can_access_branch(p_branch),false) then raise exception 'Branch access required' using errcode='42501'; end if;
  return jsonb_build_object(
    'settings',(select to_jsonb(s) from private.branch_schedule_settings s where branch_id=p_branch),
    'services',coalesce((select jsonb_agg(to_jsonb(s) order by s.sort_order) from public.services s),'[]'::jsonb),
    'service_settings',coalesce((select jsonb_agg(to_jsonb(s)) from private.branch_service_settings s where branch_id=p_branch),'[]'::jsonb),
    'dentists',coalesce((select jsonb_agg(to_jsonb(d)||jsonb_build_object('travel_minutes',r.travel_minutes,'active',r.active,
      'service_ids',coalesce((select jsonb_agg(e.service_id) from private.dentist_eligibility e where e.dentist_id=d.id),'[]'::jsonb)) order by d.name)
      from public.dentists d left join private.dentist_rules r on r.dentist_id=d.id),'[]'::jsonb),
    'shifts',coalesce((select jsonb_agg(to_jsonb(s) order by s.starts_at) from private.dentist_shifts s where branch_id=p_branch and ends_at>now()-interval '1 day'),'[]'::jsonb),
    'blocks',coalesce((select jsonb_agg(to_jsonb(s) order by s.starts_at) from private.schedule_blocks s where branch_id=p_branch and ends_at>now()-interval '1 day'),'[]'::jsonb),
    'resources',coalesce((select jsonb_agg(to_jsonb(s) order by s.name) from private.branch_resources s where branch_id=p_branch),'[]'::jsonb),
    'requirements',coalesce((select jsonb_agg(to_jsonb(s)) from private.service_resources s where branch_id=p_branch),'[]'::jsonb)
  );
end $$;
create function public.schedule_context(p_branch uuid) returns jsonb language sql stable security invoker set search_path='' as $$ select private.schedule_context(p_branch); $$;

-- Shared lock serializes mutations spanning branches (dentist travel/eligibility).
-- Existing future reservations conservatively freeze configuration in this phase.
-- Reservation-aware editing will be added with the transaction-safe booking engine.
create function private.configure_schedule(p_branch uuid,p_action text,p_data jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_dentist uuid; v_start timestamptz; v_end timestamptz; v_travel integer; v_settings private.branch_schedule_settings; v_item jsonb;
begin
  if auth.uid() is null or not coalesce(private.can_access_branch(p_branch),false) then raise exception 'Branch access required' using errcode='42501'; end if;
  if p_action is null or p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'Invalid configuration'; end if;
  if p_action not in ('shift','remove_shift','block','remove_block') and not private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(739201,2);
  if exists(select 1 from public.appointments where ends_at>now() and status in ('pending','confirmed','checked_in')) then
    raise exception 'Configuration is locked while future appointments hold capacity. Contact the administrator for reservation-aware changes.';
  end if;
  if not exists(select 1 from public.branches where id=p_branch and active) then raise exception 'Active branch required'; end if;
  case p_action
  when 'branch' then
    insert into private.branch_schedule_settings values(p_branch,array(select jsonb_array_elements_text(p_data->'opening_days')::integer),
      (p_data->>'opens_at')::time,(p_data->>'closes_at')::time,(p_data->>'chairs')::integer,(p_data->>'lead_minutes')::integer,
      (p_data->>'horizon_days')::integer,(p_data->>'step_minutes')::integer)
    on conflict(branch_id) do update set opening_days=excluded.opening_days,opens_at=excluded.opens_at,closes_at=excluded.closes_at,
      chairs=excluded.chairs,lead_minutes=excluded.lead_minutes,horizon_days=excluded.horizon_days,step_minutes=excluded.step_minutes;
    if exists(select 1 from private.dentist_shifts s join private.branch_schedule_settings b on b.branch_id=s.branch_id
      where s.branch_id=p_branch and s.ends_at>now() and (
        not(extract(dow from s.starts_at at time zone 'Asia/Manila')::integer=any(b.opening_days)) or
        (s.starts_at at time zone 'Asia/Manila')::time<b.opens_at or (s.ends_at at time zone 'Asia/Manila')::time>b.closes_at)) then
      raise exception 'Existing shifts fall outside these opening hours. Remove or adjust them first.';
    end if;
  when 'service' then
    v_id:=(p_data->>'service_id')::uuid;
    insert into private.branch_service_settings values(p_branch,v_id,(p_data->>'duration_minutes')::integer,(p_data->>'buffer_minutes')::integer,(p_data->>'enabled')::boolean)
    on conflict(branch_id,service_id) do update set duration_minutes=excluded.duration_minutes,buffer_minutes=excluded.buffer_minutes,enabled=excluded.enabled;
    delete from private.service_resources where branch_id=p_branch and service_id=v_id;
    for v_item in select value from jsonb_array_elements(coalesce(p_data->'requirements','[]'::jsonb)) loop
      if not exists(select 1 from private.branch_resources where id=(v_item->>'resource_id')::uuid and branch_id=p_branch and capacity>=(v_item->>'units')::integer) then raise exception 'Invalid resource requirement'; end if;
      insert into private.service_resources values(p_branch,v_id,(v_item->>'resource_id')::uuid,(v_item->>'units')::integer);
    end loop;
  when 'dentist' then
    v_id:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());
    insert into public.dentists(id,name,about,photo_url,published) values(v_id,trim(p_data->>'name'),coalesce(p_data->>'about',''),nullif(p_data->>'photo_url',''),(p_data->>'published')::boolean)
    on conflict(id) do update set name=excluded.name,about=excluded.about,photo_url=excluded.photo_url,published=excluded.published;
    insert into private.dentist_rules values(v_id,(p_data->>'travel_minutes')::integer,(p_data->>'active')::boolean)
    on conflict(dentist_id) do update set travel_minutes=excluded.travel_minutes,active=excluded.active;
    delete from private.dentist_eligibility where dentist_id=v_id;
    insert into private.dentist_eligibility select v_id,value::uuid from (select distinct jsonb_array_elements_text(p_data->'service_ids') value) selected;
    if exists(select 1 from private.dentist_shifts a join private.dentist_shifts b on a.dentist_id=b.dentist_id and a.id<>b.id and a.branch_id<>b.branch_id
      where a.dentist_id=v_id and a.ends_at>now() and a.starts_at<b.ends_at+make_interval(mins=>(p_data->>'travel_minutes')::integer)
      and b.starts_at<a.ends_at+make_interval(mins=>(p_data->>'travel_minutes')::integer)) then raise exception 'Travel time conflicts with existing shifts'; end if;
  when 'resource' then
    v_id:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());
    if exists(select 1 from private.branch_resources where id=v_id and branch_id<>p_branch) then raise exception 'Branch access required' using errcode='42501'; end if;
    if exists(select 1 from private.service_resources where resource_id=v_id and units>(p_data->>'capacity')::integer) then raise exception 'Capacity is below an existing service requirement'; end if;
    insert into private.branch_resources values(v_id,p_branch,trim(p_data->>'name'),(p_data->>'capacity')::integer)
    on conflict(id) do update set name=excluded.name,capacity=excluded.capacity;
  when 'shift' then
    v_dentist:=(p_data->>'dentist_id')::uuid; v_start:=(p_data->>'starts_at')::timestamptz; v_end:=(p_data->>'ends_at')::timestamptz;
    select * into v_settings from private.branch_schedule_settings where branch_id=p_branch;
    if not found then raise exception 'Configure branch hours and capacity first'; end if;
    select travel_minutes into v_travel from private.dentist_rules where dentist_id=v_dentist and active;
    if not found then raise exception 'Configure an active dentist first'; end if;
    if v_start is null or v_end is null or v_end<=v_start or v_start<now() or v_end>now()+interval '181 days' then raise exception 'Use a future shift within 180 days'; end if;
    if (v_start at time zone 'Asia/Manila')::date<>(v_end at time zone 'Asia/Manila')::date
      or not(extract(dow from v_start at time zone 'Asia/Manila')::integer=any(v_settings.opening_days))
      or (v_start at time zone 'Asia/Manila')::time<v_settings.opens_at or (v_end at time zone 'Asia/Manila')::time>v_settings.closes_at then raise exception 'Shift must fit branch opening hours on one date'; end if;
    if exists(select 1 from private.dentist_shifts s where dentist_id=v_dentist and
      s.starts_at < v_end + make_interval(mins=>case when s.branch_id<>p_branch then v_travel else 0 end)
      and v_start < s.ends_at + make_interval(mins=>case when s.branch_id<>p_branch then v_travel else 0 end)) then raise exception 'Dentist has an overlapping shift or insufficient travel time'; end if;
    insert into private.dentist_shifts(dentist_id,branch_id,starts_at,ends_at) values(v_dentist,p_branch,v_start,v_end);
  when 'remove_shift' then
    delete from private.dentist_shifts where id=(p_data->>'id')::uuid and branch_id=p_branch;
    if not found then raise exception 'Shift not found in this branch'; end if;
  when 'block' then
    v_dentist:=nullif(p_data->>'dentist_id','')::uuid;
    if v_dentist is not null and not exists(select 1 from private.dentist_shifts where dentist_id=v_dentist and branch_id=p_branch) then raise exception 'Dentist has no shifts in this branch'; end if;
    v_start:=(p_data->>'starts_at')::timestamptz; v_end:=(p_data->>'ends_at')::timestamptz;
    if v_start is null or v_end is null or v_end<=v_start or v_end<now() or v_end>now()+interval '181 days' then raise exception 'Use a valid blocked period within 180 days'; end if;
    insert into private.schedule_blocks(branch_id,dentist_id,starts_at,ends_at,reason) values(p_branch,v_dentist,v_start,v_end,trim(p_data->>'reason'));
  when 'remove_block' then
    delete from private.schedule_blocks where id=(p_data->>'id')::uuid and branch_id=p_branch;
    if not found then raise exception 'Blocked period not found in this branch'; end if;
  else raise exception 'Unknown configuration action';
  end case;
  insert into private.access_events(actor_id,action) values(auth.uid(),'schedule_'||p_action||':'||p_branch::text);
end $$;
create function public.configure_schedule(p_branch uuid,p_action text,p_data jsonb) returns void language sql security invoker set search_path='' as $$ select private.configure_schedule(p_branch,p_action,p_data); $$;

-- Staff-only preview. Until reservation feasibility is implemented, any existing
-- held interval closes the whole date; never count overlapping service pools twice.
create function private.preview_availability(p_branch uuid,p_service uuid,p_date date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b private.branch_schedule_settings; s private.branch_service_settings; v_start timestamptz; v_end timestamptz; v_close timestamptz; result jsonb:='[]'; ok boolean;
begin
  if auth.uid() is null or not coalesce(private.can_access_branch(p_branch),false) then raise exception 'Branch access required' using errcode='42501'; end if;
  select * into b from private.branch_schedule_settings where branch_id=p_branch;
  if not found then return jsonb_build_object('reason','Configure branch hours and capacity first.','slots',result); end if;
  select * into s from private.branch_service_settings where branch_id=p_branch and service_id=p_service and enabled;
  if not found then return jsonb_build_object('reason','Configure and enable this service for this branch.','slots',result); end if;
  if p_date is null or p_date<(now() at time zone 'Asia/Manila')::date or p_date>(now() at time zone 'Asia/Manila')::date+b.horizon_days then return jsonb_build_object('reason','Date is outside the booking window.','slots',result); end if;
  if not(extract(dow from p_date)::integer=any(b.opening_days)) then return jsonb_build_object('reason','Branch is closed on this day.','slots',result); end if;
  if exists(select 1 from public.appointments where status in ('pending','confirmed','checked_in') and
    starts_at<((p_date+1)::timestamp at time zone 'Asia/Manila') and ends_at>(p_date::timestamp at time zone 'Asia/Manila')) then
    return jsonb_build_object('reason','This date has capacity holds. Reservation-aware availability is not enabled yet.','slots',result);
  end if;
  v_start:=(p_date+b.opens_at) at time zone 'Asia/Manila'; v_close:=(p_date+b.closes_at) at time zone 'Asia/Manila';
  while v_start+make_interval(mins=>s.duration_minutes+s.buffer_minutes)<=v_close loop
    v_end:=v_start+make_interval(mins=>s.duration_minutes+s.buffer_minutes);
    ok:=v_start>=now()+make_interval(mins=>b.lead_minutes) and exists(
      select 1 from private.dentist_shifts ds join private.dentist_rules dr on dr.dentist_id=ds.dentist_id and dr.active
      join private.dentist_eligibility de on de.dentist_id=ds.dentist_id and de.service_id=p_service
      where ds.branch_id=p_branch and ds.starts_at<=v_start and ds.ends_at>=v_end
      and not exists(select 1 from private.schedule_blocks bl where bl.branch_id=p_branch and (bl.dentist_id is null or bl.dentist_id=ds.dentist_id)
        and bl.starts_at<v_end and bl.ends_at>v_start));
    result:=result||jsonb_build_array(jsonb_build_object('starts_at',v_start,'ends_at',v_end,'available',ok));
    v_start:=v_start+make_interval(mins=>b.step_minutes);
  end loop;
  return jsonb_build_object('reason','Staff preview only. Times are not reserved or available to patients.','slots',result);
end $$;
create function public.preview_availability(p_branch uuid,p_service uuid,p_date date) returns jsonb language sql stable security invoker set search_path='' as $$ select private.preview_availability(p_branch,p_service,p_date); $$;

revoke all on function private.schedule_context(uuid),private.configure_schedule(uuid,text,jsonb),private.preview_availability(uuid,uuid,date) from public,anon,authenticated;
revoke all on function public.schedule_context(uuid),public.configure_schedule(uuid,text,jsonb),public.preview_availability(uuid,uuid,date) from public,anon,authenticated;
grant execute on function private.schedule_context(uuid),private.configure_schedule(uuid,text,jsonb),private.preview_availability(uuid,uuid,date) to authenticated;
grant execute on function public.schedule_context(uuid),public.configure_schedule(uuid,text,jsonb),public.preview_availability(uuid,uuid,date) to authenticated;
