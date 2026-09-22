-- Development benchmark only. Every row and setting is rolled back.
begin;
set local statement_timeout='25s';
select pg_advisory_xact_lock(739201,2);
create temporary table capacity_measurements(scenario text, elapsed_ms numeric, detail text) on commit drop;
do $$
declare b uuid; s uuid; d uuid:=gen_random_uuid(); a uuid;
 day date:=(now() at time zone 'Asia/Manila')::date+90;
 start_time timestamptz; measured timestamptz; result jsonb; slots jsonb;
begin
 select id into b from public.branches where slug='santa-rosa';
 select id into s from public.services where name='Oral Prophylaxis';
 start_time:=(day+time '09:00') at time zone 'Asia/Manila';
 update private.branch_schedule_settings set opening_days=array[0,1,2,3,4,5,6],opens_at='09:00',closes_at='18:00',chairs=1,lead_minutes=0,horizon_days=100,step_minutes=5 where branch_id=b;
 update private.branch_service_settings set enabled=true,duration_minutes=5,buffer_minutes=0 where branch_id=b and service_id=s;
 delete from private.service_resources where branch_id=b and service_id=s;
 insert into public.dentists(id,name) values(d,'Synthetic capacity benchmark');
 insert into private.dentist_rules values(d,0,true);
 insert into private.dentist_eligibility values(d,s);
 insert into private.dentist_shifts(dentist_id,branch_id,starts_at,ends_at) values(d,b,start_time,start_time+interval '9 hours');
 for n in 1..61 loop
   insert into public.appointments(branch_id,service_id,starts_at,ends_at,status,dentist_id)
   values(b,s,start_time+make_interval(mins=>(n-1)*5),start_time+make_interval(mins=>n*5),'pending',null) returning id into a;
   if n in (20,40,60) then
     measured:=clock_timestamp();
     if not private.capacity_feasible(day) then raise exception 'FAIL valid % appointment schedule rejected',n; end if;
     insert into capacity_measurements values(n||' held appointments',extract(epoch from clock_timestamp()-measured)*1000,'Feasible sequential five-minute synthetic visits');
     measured:=clock_timestamp();
     slots:=private.available_slots(b,s,day);
     if n<60 and not exists(select 1 from jsonb_array_elements(slots) x where (x->>'available')::boolean) then raise exception 'FAIL remaining capacity hidden'; end if;
     if n=60 and exists(select 1 from jsonb_array_elements(slots) x where (x->>'available')::boolean) then raise exception 'FAIL new request bypasses 60-job safety bound'; end if;
     insert into capacity_measurements values(n||' holds: full availability calculation',extract(epoch from clock_timestamp()-measured)*1000,jsonb_array_length(slots)||' candidate times evaluated');
   end if;
 end loop;
 measured:=clock_timestamp();
 if private.capacity_feasible(day) then raise exception 'FAIL 61-job bound bypassed'; end if;
 insert into capacity_measurements values('61 held appointments',extract(epoch from clock_timestamp()-measured)*1000,'Rejected by safety bound, not represented as available');
 delete from public.appointments where id=a;
 -- Exercise the generic exhausted-search guard directly.
 measured:=clock_timestamp();
 result:=private.fit_jobs('[{"id":"job","branch":"branch","start":"2030-01-01T00:00:00Z","end":"2030-01-01T01:00:00Z","candidates":[{"id":"dentist","travel":0}]}]'::jsonb,'[]',0);
 if (result->>'ok')::boolean then raise exception 'FAIL exhausted search budget allowed booking'; end if;
 insert into capacity_measurements values('Exhausted search budget',extract(epoch from clock_timestamp()-measured)*1000,'Rejected, never guessed available');
 -- Test real gateway rate policy with invalid requests: no bookings are inserted.
 delete from private.request_limits where bucket='global:book' or bucket='mobile:'||encode(extensions.digest('639170000993','sha256'),'hex');
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 measured:=clock_timestamp();
 for n in 1..13 loop
   result:=public.booking_gateway('book',jsonb_build_object('mobile','09170000993'));
   if n<=12 and result->>'status'='429' then raise exception 'FAIL early mobile rate limit'; end if;
 end loop;
 if result->>'status'<>'429' then raise exception 'FAIL mobile rate limit'; end if;
 for n in 14..61 loop result:=public.booking_gateway('book','{}'); end loop;
 if result->>'status'<>'429' then raise exception 'FAIL global booking rate limit'; end if;
 insert into capacity_measurements values('Booking gateway rate controls',extract(epoch from clock_timestamp()-measured)*1000,'13th same-mobile request and 61st global request rejected');
end $$;
select scenario,round(elapsed_ms,2) as elapsed_ms,detail from capacity_measurements;
rollback;
