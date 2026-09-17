alter table public.appointments add column reference text unique;
alter table public.appointments add column version integer not null default 0;
alter table public.appointments drop constraint appointments_status_check;
alter table public.appointments add constraint appointments_status_check check(status in ('pending','confirmed','checked_in','completed','cancelled','no_show','rejected'));
alter table public.appointment_contacts add column notes text not null default '' check(length(notes)<=1000);
create table private.booking_settings (singleton boolean primary key default true check(singleton), enabled boolean not null default false);
insert into private.booking_settings values(true,false);
create table private.booking_requests (request_id uuid primary key, fingerprint text not null, appointment_id uuid not null references public.appointments(id) on delete cascade);
create index booking_requests_appointment_idx on private.booking_requests(appointment_id);
create table private.reservation_resources (appointment_id uuid not null references public.appointments(id) on delete cascade, resource_id uuid not null references private.branch_resources(id), units integer not null check(units>0), primary key(appointment_id,resource_id));
create index reservation_resources_resource_idx on private.reservation_resources(resource_id);
create table private.appointment_events (id bigint generated always as identity primary key, appointment_id uuid not null references public.appointments(id) on delete cascade, actor_id uuid, action text not null, created_at timestamptz not null default now());
create index appointment_events_appointment_idx on private.appointment_events(appointment_id);
create table private.request_limits (bucket text not null, window_start bigint not null, hits integer not null, primary key(bucket,window_start));
alter table private.booking_settings enable row level security;
alter table private.booking_requests enable row level security;
alter table private.reservation_resources enable row level security;
alter table private.appointment_events enable row level security;
alter table private.request_limits enable row level security;
revoke all on private.booking_settings,private.booking_requests,private.reservation_resources,private.appointment_events,private.request_limits from public,anon,authenticated;

create function private.normalized_mobile(p_value text) returns text language sql immutable set search_path='' as $$
 select case when regexp_replace(coalesce(p_value,''),'[^0-9]','','g') ~ '^09[0-9]{9}$'
 then '63'||substr(regexp_replace(p_value,'[^0-9]','','g'),2)
 when regexp_replace(coalesce(p_value,''),'[^0-9]','','g') ~ '^639[0-9]{9}$' then regexp_replace(p_value,'[^0-9]','','g') else null end;
$$;
create function private.consume_limit(p_bucket text,p_limit integer,p_seconds integer) returns boolean language plpgsql set search_path='' as $$
declare window_id bigint:=floor(extract(epoch from now())/p_seconds)*p_seconds; total integer;
begin
 delete from private.request_limits where window_start<extract(epoch from now()-interval '1 day');
 insert into private.request_limits values(p_bucket,window_id,1) on conflict(bucket,window_start) do update set hits=private.request_limits.hits+1 returning hits into total;
 return total<=p_limit;
end $$;

-- Exact backtracking over eligible dentists. No assignment is persisted here.
-- A bounded search fails closed if feasibility cannot be proved.
create function private.fit_jobs(p_jobs jsonb,p_chosen jsonb,p_budget integer) returns jsonb language plpgsql set search_path='' as $$
declare job jsonb; candidate jsonb; previous jsonb; fits boolean; answer jsonb; budget integer:=p_budget;
begin
 if jsonb_array_length(p_jobs)=0 then return jsonb_build_object('ok',true,'budget',budget); end if;
 if budget<=0 then return jsonb_build_object('ok',false,'budget',0); end if;
 job:=p_jobs->0;
 for candidate in select value from jsonb_array_elements(job->'candidates') loop
   budget:=budget-1; if budget<0 then exit; end if; fits:=true;
   for previous in select value from jsonb_array_elements(p_chosen) loop
     if previous->>'dentist'=candidate->>'id' and
       (job->>'start')::timestamptz < (previous->>'end')::timestamptz + make_interval(mins=>case when previous->>'branch'<>job->>'branch' then (candidate->>'travel')::integer else 0 end) and
       (previous->>'start')::timestamptz < (job->>'end')::timestamptz + make_interval(mins=>case when previous->>'branch'<>job->>'branch' then (candidate->>'travel')::integer else 0 end) then fits:=false; exit; end if;
   end loop;
   if fits then
     answer:=private.fit_jobs(p_jobs-0,p_chosen||jsonb_build_array(job||jsonb_build_object('dentist',candidate->>'id')),budget);
     budget:=(answer->>'budget')::integer;
     if (answer->>'ok')::boolean then return answer; end if;
   end if;
 end loop;
 return jsonb_build_object('ok',false,'budget',greatest(budget,0));
end $$;

create function private.capacity_feasible(p_day date,p_extra jsonb default null) returns boolean language plpgsql set search_path='' as $$
declare jobs jsonb; enriched jsonb:='[]'; job jsonb; candidates jsonb; point timestamptz; branch uuid; capacity integer; resource record; answer jsonb;
begin
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'branch',a.branch_id,'service',a.service_id,'start',a.starts_at,'end',a.ends_at,'dentist',a.dentist_id,
   'resources',coalesce((select jsonb_agg(jsonb_build_object('id',rr.resource_id,'units',rr.units)) from private.reservation_resources rr where rr.appointment_id=a.id),'[]'::jsonb))),'[]'::jsonb)
 into jobs from public.appointments a where a.status in ('pending','confirmed','checked_in') and a.starts_at<((p_day+1)::timestamp at time zone 'Asia/Manila') and a.ends_at>(p_day::timestamp at time zone 'Asia/Manila');
 if p_extra is not null then jobs:=jobs||jsonb_build_array(p_extra); end if;
 if jsonb_array_length(jobs)>60 then return false; end if;
 -- Check every start boundary. Occupancy is constant between boundaries.
 for job in select value from jsonb_array_elements(jobs) loop
   point:=(job->>'start')::timestamptz; branch:=(job->>'branch')::uuid;
   select chairs into capacity from private.branch_schedule_settings where branch_id=branch;
   if capacity is null or (select count(*) from jsonb_array_elements(jobs) j where j->>'branch'=branch::text and (j->>'start')::timestamptz<=point and (j->>'end')::timestamptz>point)>capacity then return false; end if;
   for resource in select br.id,br.capacity from private.branch_resources br where br.branch_id=branch loop
     if (select coalesce(sum((r->>'units')::integer),0) from jsonb_array_elements(jobs) j cross join lateral jsonb_array_elements(j->'resources') r
       where j->>'branch'=branch::text and (j->>'start')::timestamptz<=point and (j->>'end')::timestamptz>point and r->>'id'=resource.id::text)>resource.capacity then return false; end if;
   end loop;
   select coalesce(jsonb_agg(jsonb_build_object('id',dr.dentist_id,'travel',dr.travel_minutes)),'[]'::jsonb) into candidates
   from private.dentist_rules dr where dr.active and (job->>'dentist' is null or dr.dentist_id=(job->>'dentist')::uuid)
   and exists(select 1 from private.dentist_eligibility de where de.dentist_id=dr.dentist_id and de.service_id=(job->>'service')::uuid)
   and exists(select 1 from private.dentist_shifts ds where ds.dentist_id=dr.dentist_id and ds.branch_id=branch and ds.starts_at<=(job->>'start')::timestamptz and ds.ends_at>=(job->>'end')::timestamptz)
   and not exists(select 1 from private.schedule_blocks bl where bl.branch_id=branch and (bl.dentist_id is null or bl.dentist_id=dr.dentist_id) and bl.starts_at<(job->>'end')::timestamptz and bl.ends_at>(job->>'start')::timestamptz);
   if jsonb_array_length(candidates)=0 then return false; end if;
   enriched:=enriched||jsonb_build_array(job||jsonb_build_object('candidates',candidates));
 end loop;
 select coalesce(jsonb_agg(j order by jsonb_array_length(j->'candidates'),j->>'start'),'[]'::jsonb) into enriched from jsonb_array_elements(enriched) j;
 answer:=private.fit_jobs(enriched,'[]',5000);
 return (answer->>'ok')::boolean;
end $$;

create function private.slot_candidate(p_branch uuid,p_service uuid,p_start timestamptz) returns jsonb language plpgsql set search_path='' as $$
declare b private.branch_schedule_settings; s private.branch_service_settings; local_start timestamp:=p_start at time zone 'Asia/Manila'; finish timestamptz; resources jsonb;
begin
 select * into b from private.branch_schedule_settings where branch_id=p_branch;
 if not found or not exists(select 1 from public.branches where id=p_branch and active) then return null; end if;
 select * into s from private.branch_service_settings where branch_id=p_branch and service_id=p_service and enabled;
 if not found or not exists(select 1 from public.services where id=p_service and published) then return null; end if;
 if p_start is null or not isfinite(p_start) or p_start<now()+make_interval(mins=>b.lead_minutes) or local_start::date>(now() at time zone 'Asia/Manila')::date+b.horizon_days
 or not(extract(dow from local_start)::integer=any(b.opening_days)) or local_start::time<b.opens_at
 or mod(extract(epoch from (local_start-(local_start::date+b.opens_at)))::numeric,b.step_minutes*60)<>0 then return null; end if;
 finish:=p_start+make_interval(mins=>s.duration_minutes+s.buffer_minutes);
 if (finish at time zone 'Asia/Manila')::date<>local_start::date or (finish at time zone 'Asia/Manila')::time>b.closes_at then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',resource_id,'units',units)),'[]'::jsonb) into resources from private.service_resources where branch_id=p_branch and service_id=p_service;
 return jsonb_build_object('branch',p_branch,'service',p_service,'start',p_start,'end',finish,'dentist',null,'resources',resources);
end $$;

create function private.available_slots(p_branch uuid,p_service uuid,p_date date) returns jsonb language plpgsql set search_path='' as $$
declare b private.branch_schedule_settings; start_at timestamptz; candidate jsonb; result jsonb:='[]';
begin
 select * into b from private.branch_schedule_settings where branch_id=p_branch;
 if not found or p_date is null or p_date<(now() at time zone 'Asia/Manila')::date or p_date>(now() at time zone 'Asia/Manila')::date+b.horizon_days then return result; end if;
 start_at:=(p_date+b.opens_at) at time zone 'Asia/Manila';
 while start_at<((p_date+b.closes_at) at time zone 'Asia/Manila') loop
   candidate:=private.slot_candidate(p_branch,p_service,start_at);
   result:=result||jsonb_build_array(jsonb_build_object('id',start_at,'startsAt',start_at,'available',candidate is not null and private.capacity_feasible(p_date,candidate)));
   start_at:=start_at+make_interval(mins=>b.step_minutes);
 end loop;
 return result;
end $$;

create function private.appointment_result(p_id uuid) returns jsonb language sql set search_path='' as $$
 select jsonb_build_object('reference',a.reference,'status',a.status,'branch',b.name,'dentist',d.name,'service',s.name,'scheduledAt',a.starts_at)
 from public.appointments a join public.branches b on b.id=a.branch_id join public.services s on s.id=a.service_id left join public.dentists d on d.id=a.dentist_id where a.id=p_id;
$$;

create function private.create_booking(p_data jsonb) returns jsonb language plpgsql set search_path='' as $$
declare branch uuid; service uuid:=(p_data->>'serviceId')::uuid; start_at timestamptz:=(p_data->>'slotId')::timestamptz; request uuid:=(p_data->>'requestId')::uuid;
 mobile text:=private.normalized_mobile(p_data->>'mobile'); fingerprint text; prior private.booking_requests; candidate jsonb; appt uuid:=gen_random_uuid(); ref text;
begin
 if not coalesce((select enabled from private.booking_settings where singleton),false) then raise exception 'Booking is temporarily closed'; end if;
 if request is null or mobile is null or p_data ? 'dentistId' or coalesce((p_data->>'consent')::boolean,false)=false
 or length(trim(coalesce(p_data->>'firstName',''))) not between 1 and 120 or length(trim(coalesce(p_data->>'lastName',''))) not between 1 and 120
 or length(coalesce(p_data->>'notes',''))>1000 or length(coalesce(p_data->>'email',''))>120
 or (coalesce(p_data->>'email','')<>'' and p_data->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'Check the patient details and consent'; end if;
 select id into branch from public.branches where slug=p_data->>'branchId' and active;
 fingerprint:=encode(extensions.digest((p_data||jsonb_build_object('mobile',mobile,'slotId',start_at))::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(739201,2);
 select * into prior from private.booking_requests where request_id=request;
 if found then
   if prior.fingerprint<>fingerprint then raise exception 'This request key was already used with different details'; end if;
   return private.appointment_result(prior.appointment_id);
 end if;
 candidate:=private.slot_candidate(branch,service,start_at);
 if candidate is null or not private.capacity_feasible((start_at at time zone 'Asia/Manila')::date,candidate) then raise exception 'This time is no longer available. Choose another time.'; end if;
 ref:='VSJ-'||upper(encode(extensions.gen_random_bytes(16),'hex'));
 insert into public.appointments(id,branch_id,service_id,starts_at,ends_at,status,reference) values(appt,branch,service,start_at,(candidate->>'end')::timestamptz,'pending',ref);
 insert into public.appointment_contacts(appointment_id,patient_name,mobile,email,notes) values(appt,trim(p_data->>'firstName')||' '||trim(p_data->>'lastName'),mobile,nullif(trim(p_data->>'email'),''),coalesce(p_data->>'notes',''));
 insert into private.reservation_resources select appt,(r->>'id')::uuid,(r->>'units')::integer from jsonb_array_elements(candidate->'resources') r;
 insert into private.booking_requests values(request,fingerprint,appt);
 insert into private.appointment_events(appointment_id,action) values(appt,'requested');
 return private.appointment_result(appt);
end $$;

-- Only the Edge Function's server credential may call this gateway. Rate counts
-- are outside the business-operation exception block so failed attempts count.
create function private.booking_gateway(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; branch uuid; date_value date; row_value jsonb; mobile text; ref text; found_id uuid; suggestions integer:=0;
begin
 if (auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'Server access required' using errcode='42501'; end if;
 if p_action is null or p_action not in ('availability','book','track') or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>8192 then return jsonb_build_object('ok',false,'status',400,'error','Invalid request'); end if;
 if not private.consume_limit('global:'||p_action,case p_action when 'book' then 60 when 'track' then 180 else 180 end,60) then return jsonb_build_object('ok',false,'status',429,'error','Too many requests. Please try again later.'); end if;
 if p_action='book' then
   mobile:=private.normalized_mobile(p_data->>'mobile');
   if mobile is not null and not private.consume_limit('mobile:'||encode(extensions.digest(mobile,'sha256'),'hex'),12,3600) then return jsonb_build_object('ok',false,'status',429,'error','Too many requests. Please contact the clinic.'); end if;
 elsif p_action='track' then
   ref:=upper(trim(coalesce(p_data->>'reference','')));
   if ref ~ '^VSJ-[0-9A-F]{32}$' and not private.consume_limit('reference:'||encode(extensions.digest(ref,'sha256'),'hex'),15,900) then return jsonb_build_object('ok',false,'status',429,'error','Too many attempts. Please try again later.'); end if;
 end if;
 begin
   case p_action
   when 'book' then result:=private.create_booking(p_data);
   when 'track' then
     mobile:=private.normalized_mobile(p_data->>'mobile');
     select a.id into found_id from public.appointments a join public.appointment_contacts c on c.appointment_id=a.id where a.reference=ref and private.normalized_mobile(c.mobile)=mobile;
     result:=private.appointment_result(found_id);
   when 'availability' then
     if not coalesce((select enabled from private.booking_settings where singleton),false) then raise exception 'Booking is temporarily closed'; end if;
     select id into branch from public.branches where slug=p_data->>'branchId' and active;
     date_value:=(p_data->>'date')::date;
     result:=private.available_slots(branch,(p_data->>'serviceId')::uuid,date_value);
     if not exists(select 1 from jsonb_array_elements(result) x where (x->>'available')::boolean) then
       for offset_day in 1..3 loop
         for row_value in select value from jsonb_array_elements(private.available_slots(branch,(p_data->>'serviceId')::uuid,date_value+offset_day)) loop
           if (row_value->>'available')::boolean then result:=result||jsonb_build_array(row_value||'{"suggested":true}'::jsonb); suggestions:=suggestions+1; end if;
           exit when suggestions>=3;
         end loop;
         exit when suggestions>=3;
       end loop;
     end if;
   end case;
   return jsonb_build_object('ok',true,'data',result);
 exception when raise_exception then return jsonb_build_object('ok',false,'status',409,'error',sqlerrm);
 when others then return jsonb_build_object('ok',false,'status',422,'error','Request could not be processed. Check your details.'); end;
end $$;
create function public.booking_gateway(p_action text,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.booking_gateway(p_action,p_data); $$;

create function private.appointment_action(p_id uuid,p_expected integer,p_action text,p_dentist uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare appt public.appointments; next_status text;
begin
 if auth.uid() is null or private.current_staff_role() is null then raise exception 'Staff access required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(739201,2);
 select * into appt from public.appointments where id=p_id for update;
 if not found or not coalesce(private.can_access_branch(appt.branch_id),false) then raise exception 'Appointment access denied' using errcode='42501'; end if;
 if p_expected is null or appt.version<>p_expected then raise exception 'Appointment changed. Refresh before trying again.'; end if;
 next_status:=case
 when p_action='confirm' and appt.status='pending' and p_dentist is not null and appt.starts_at>now() then 'confirmed'
 when p_action='reject' and appt.status='pending' then 'rejected'
 when p_action='cancel' and appt.status in ('pending','confirmed') then 'cancelled'
 when p_action='check_in' and appt.status='confirmed' then 'checked_in'
 when p_action='complete' and appt.status='checked_in' then 'completed'
 when p_action='no_show' and appt.status='confirmed' and appt.starts_at<=now() then 'no_show' else null end;
 if next_status is null then raise exception 'This action is not allowed for the current appointment'; end if;
 update public.appointments set status=next_status,dentist_id=case when p_action='confirm' then p_dentist else dentist_id end,version=version+1 where id=p_id;
 if p_action='confirm' and not private.capacity_feasible((appt.starts_at at time zone 'Asia/Manila')::date) then raise exception 'That dentist cannot be assigned without conflicting with another held appointment'; end if;
 insert into private.appointment_events(appointment_id,actor_id,action) values(p_id,auth.uid(),p_action);
 return private.appointment_result(p_id);
end $$;
create function public.appointment_action(p_id uuid,p_expected integer,p_action text,p_dentist uuid default null) returns jsonb language sql security invoker set search_path='' as $$ select private.appointment_action(p_id,p_expected,p_action,p_dentist); $$;

create or replace function private.preview_availability(p_branch uuid,p_service uuid,p_date date) returns jsonb language plpgsql security definer set search_path='' as $$
declare slots jsonb;
begin
 if auth.uid() is null or not coalesce(private.can_access_branch(p_branch),false) then raise exception 'Branch access required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('starts_at',s->>'startsAt','available',(s->>'available')::boolean)),'[]') into slots from jsonb_array_elements(private.available_slots(p_branch,p_service,p_date)) s;
 return jsonb_build_object('reason','Calculated against current schedules and capacity holds. Availability is rechecked when a request is submitted.','slots',slots);
end $$;

revoke all on function private.normalized_mobile(text),private.consume_limit(text,integer,integer),private.fit_jobs(jsonb,jsonb,integer),private.capacity_feasible(date,jsonb),private.slot_candidate(uuid,uuid,timestamptz),private.available_slots(uuid,uuid,date),private.appointment_result(uuid),private.create_booking(jsonb),private.booking_gateway(text,jsonb),private.appointment_action(uuid,integer,text,uuid) from public,anon,authenticated;
revoke all on function public.booking_gateway(text,jsonb),public.appointment_action(uuid,integer,text,uuid) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.booking_gateway(text,jsonb),public.booking_gateway(text,jsonb) to service_role;
grant execute on function private.appointment_action(uuid,integer,text,uuid),public.appointment_action(uuid,integer,text,uuid) to authenticated;
