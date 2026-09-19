-- Same transaction lock as booking and staff actions. Conflicts roll back edits.
create or replace function private.configure_schedule(p_branch uuid,p_action text,p_data jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_dentist uuid; v_start timestamptz; v_end timestamptz; v_travel integer; v_settings private.branch_schedule_settings; v_item jsonb; v_day date;
begin
  if auth.uid() is null or not coalesce(private.can_access_branch(p_branch),false) then raise exception 'Branch access required' using errcode='42501'; end if;
  if p_action is null or p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'Invalid configuration'; end if;
  if p_action not in ('shift','remove_shift','block','remove_block') and not private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(739201,2);
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
  -- Appointments retain their booked duration and equipment snapshots. New service
  -- settings apply to new requests. Shared dentist edits may affect either branch.
  -- Validate the entire day's assignment problem, including cross-branch travel.
  for v_day in
    select distinct (a.starts_at at time zone 'Asia/Manila')::date
    from public.appointments a
    where a.ends_at>now() and a.status in ('pending','confirmed','checked_in')
      and (a.branch_id=p_branch or p_action='dentist')
  loop
    if not private.capacity_feasible(v_day) then
      raise exception 'This change conflicts with an existing appointment. Keep the current schedule or resolve the affected appointments first.';
    end if;
  end loop;
  insert into private.access_events(actor_id,action) values(auth.uid(),'schedule_'||p_action||':'||p_branch::text);
end $$;
