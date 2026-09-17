-- OPTIONAL DEVELOPMENT DATA. Never part of migrations or production seed.sql.
-- Run only on vsjdc-development (sqqwjiuskzgwxvxukmxi).
-- Preserves all existing settings/profiles. Fixed UUIDs identify demo-owned rows.
begin;
select pg_advisory_xact_lock(739201,2);
do $$
declare b record; s record; cfg private.branch_schedule_settings; d date; day0 date:=(now() at time zone 'Asia/Manila')::date;
  den uuid; extra uuid:='d2000000-0000-4000-8000-000000000003'; resource uuid; appt uuid; idx integer:=0; start_at timestamptz;
begin
  if exists(select 1 from public.dentists where id in ('d2000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000003')) then
    raise exception 'Demo dataset already exists. Do not overwrite edited demo records.';
  end if;
  if exists(select 1 from public.appointments where ends_at>now() and status in ('pending','confirmed','checked_in')) then raise exception 'Do not seed while future appointments hold capacity'; end if;
  insert into public.dentists(id,name,about,published) values
    ('d2000000-0000-4000-8000-000000000001','DEMO · Dr. Alex Santos','Fictional profile for testing only. Demonstrates a Cabuyao dentist with several eligible services. Not a real clinic team member.',true),
    ('d2000000-0000-4000-8000-000000000002','DEMO · Dr. Jamie Reyes','Fictional profile for testing only. Demonstrates a Santa Rosa dentist and a midday break. Not a real clinic team member.',true),
    (extra,'DEMO · Dr. Morgan Cruz','Fictional profile for testing only. Demonstrates limited service eligibility and afternoon availability. Not a real clinic team member.',true);
  insert into private.dentist_rules(dentist_id,travel_minutes,active)
    select id,60,true from public.dentists where id in ('d2000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000002',extra);
  insert into private.dentist_eligibility(dentist_id,service_id)
    select profile.id,catalog.id from public.dentists profile cross join public.services catalog
    where profile.id in ('d2000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000002')
      or (profile.id=extra and catalog.name in ('Teeth Whitening','ORTHODONTICS','Retainers'));
  for b in select * from public.branches where active order by slug loop
    den:=case b.slug when 'cabuyao' then 'd2000000-0000-4000-8000-000000000001'::uuid else 'd2000000-0000-4000-8000-000000000002'::uuid end;
    resource:=case b.slug when 'cabuyao' then 'd2100000-0000-4000-8000-000000000001'::uuid else 'd2100000-0000-4000-8000-000000000002'::uuid end;
    insert into private.branch_schedule_settings values(b.id,array[0,1,2,3,4,5,6],'09:00',case b.slug when 'cabuyao' then '18:00'::time else '20:00'::time end,2,60,30,30)
      on conflict(branch_id) do nothing;
    select * into cfg from private.branch_schedule_settings where branch_id=b.id;
    insert into private.branch_resources(id,branch_id,name,capacity) values(resource,b.id,'DEMO · shared whitening equipment',1);
    for s in select * from public.services loop
      -- Hypothetical durations for software demonstrations, not clinical guidance.
      insert into private.branch_service_settings values(b.id,s.id,
        case when s.name in ('ODONTECTOMY','Laminate Veneers','CROWNS') then 90 when s.name in ('Teeth Whitening','ORTHODONTICS','Composite Veneers') then 60 else 30 end,15,true)
        on conflict(branch_id,service_id) do nothing;
      if s.name='Teeth Whitening' then insert into private.service_resources values(b.id,s.id,resource,1); end if;
    end loop;
    for day_offset in 1..7 loop
      d:=day0+day_offset;
      if extract(dow from d)::integer=any(cfg.opening_days) then
        if greatest(cfg.opens_at,'09:00'::time)<least(cfg.closes_at,'12:00'::time) then
          insert into private.dentist_shifts(dentist_id,branch_id,starts_at,ends_at) values(den,b.id,(d+greatest(cfg.opens_at,'09:00'::time)) at time zone 'Asia/Manila',(d+least(cfg.closes_at,'12:00'::time)) at time zone 'Asia/Manila');
        end if;
        if greatest(cfg.opens_at,'13:00'::time)<least(cfg.closes_at,'17:00'::time) then
          insert into private.dentist_shifts(dentist_id,branch_id,starts_at,ends_at) values(den,b.id,(d+greatest(cfg.opens_at,'13:00'::time)) at time zone 'Asia/Manila',(d+least(cfg.closes_at,'17:00'::time)) at time zone 'Asia/Manila');
        end if;
        if b.slug='santa-rosa' and greatest(cfg.opens_at,'14:00'::time)<least(cfg.closes_at,'18:00'::time) then
          insert into private.dentist_shifts(dentist_id,branch_id,starts_at,ends_at) values(extra,b.id,(d+greatest(cfg.opens_at,'14:00'::time)) at time zone 'Asia/Manila',(d+least(cfg.closes_at,'18:00'::time)) at time zone 'Asia/Manila');
        end if;
      end if;
    end loop;
    insert into private.schedule_blocks(branch_id,starts_at,ends_at,reason) values(b.id,((day0+1)+time '10:00') at time zone 'Asia/Manila',((day0+1)+time '10:30') at time zone 'Asia/Manila','DEMO · branch meeting');
    -- Past illustrative statuses avoid freezing configuration or future previews.
    for sample in 1..3 loop
      idx:=idx+1;
      appt:=('d2200000-0000-4000-8000-'||lpad(idx::text,12,'0'))::uuid;
      start_at:=((day0-1)+make_time(8+sample,0,0)) at time zone 'Asia/Manila';
      insert into public.appointments(id,branch_id,service_id,dentist_id,starts_at,ends_at,status)
      select appt,b.id,id,case when sample=1 then null else den end,start_at,start_at+interval '45 minutes',
        case sample when 1 then 'pending' when 2 then 'confirmed' else 'completed' end from public.services where name='Oral Prophylaxis';
      insert into public.appointment_contacts values(appt,'DEMO Patient '||idx,'00000000000','demo-patient-'||idx||'@example.invalid');
    end loop;
  end loop;
end $$;
commit;
