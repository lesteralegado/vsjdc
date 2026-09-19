-- All fixtures and configuration edits roll back.
begin;
select pg_advisory_xact_lock(739201,2);
insert into auth.users(id) values('f4100000-0000-4000-8000-000000000001'),('f4100000-0000-4000-8000-000000000002');
insert into auth.sessions(id,user_id) values('f4200000-0000-4000-8000-000000000001','f4100000-0000-4000-8000-000000000001'),('f4200000-0000-4000-8000-000000000002','f4100000-0000-4000-8000-000000000002');
insert into private.staff_accounts(user_id,display_name,role) values('f4100000-0000-4000-8000-000000000001','Synthetic move admin','admin'),('f4100000-0000-4000-8000-000000000002','Synthetic move receptionist','receptionist');
insert into private.staff_branches select 'f4100000-0000-4000-8000-000000000002',id from public.branches where slug='cabuyao';
insert into public.dentists(id,name) values('f4300000-0000-4000-8000-000000000001','Synthetic move dentist 1'),('f4300000-0000-4000-8000-000000000002','Synthetic move dentist 2');
insert into private.dentist_rules values('f4300000-0000-4000-8000-000000000001',60,true),('f4300000-0000-4000-8000-000000000002',60,true);
select set_config('request.jwt.claims','{"sub":"f4100000-0000-4000-8000-000000000001","session_id":"f4200000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$
declare b uuid; s uuid; resource uuid:=gen_random_uuid(); a uuid; other uuid;
 d1 uuid:='f4300000-0000-4000-8000-000000000001'; d2 uuid:='f4300000-0000-4000-8000-000000000002';
 day date:=(now() at time zone 'Asia/Manila')::date+40;
 t timestamptz; request jsonb; result jsonb; original jsonb; snapshots jsonb; ref text;
begin
 select id into b from public.branches where slug='santa-rosa';
 select id into s from public.services where name='Oral Prophylaxis';
 t:=(day+time '09:00') at time zone 'Asia/Manila';
 update private.branch_schedule_settings set opening_days=array[0,1,2,3,4,5,6],opens_at='09:00',closes_at='18:00',chairs=2,lead_minutes=0,horizon_days=60,step_minutes=30 where branch_id=b;
 update private.branch_service_settings set duration_minutes=30,buffer_minutes=15,enabled=true where branch_id=b and service_id=s;
 insert into private.dentist_eligibility values(d1,s),(d2,s);
 insert into private.dentist_shifts(dentist_id,branch_id,starts_at,ends_at) values(d1,b,t,t+interval '8 hours'),(d2,b,t,t+interval '8 hours'),(d1,b,t+interval '1 day',t+interval '1 day 8 hours');
 insert into private.branch_resources(id,branch_id,name,capacity) values(resource,b,'Synthetic exclusive resource',1);
 delete from private.service_resources where branch_id=b and service_id=s;
 insert into private.service_resources values(b,s,resource,1);
 request:=jsonb_build_object('requestId',gen_random_uuid(),'branchId','santa-rosa','serviceId',s,'slotId',t,'firstName','Synthetic','lastName','Move','mobile','09170000991','email','move@example.invalid','notes','','consent',true);
 result:=private.create_booking(request); ref:=result->>'reference';
 select id into a from public.appointments where reference=ref;
 result:=private.create_booking(request||jsonb_build_object('requestId',gen_random_uuid(),'slotId',t+interval '1 hour'));
 select id into other from public.appointments where reference=result->>'reference';
 perform public.appointment_action(other,0,'confirm',d1);
 select to_jsonb(ap) into original from public.appointments ap where id=a;
 select jsonb_agg(to_jsonb(rr)) into snapshots from private.reservation_resources rr where appointment_id=a;
 begin
  perform public.move_appointment(a,0,t+interval '1 hour',d2,'Patient requested change');
  raise exception 'FAIL resource conflict accepted';
 exception when raise_exception then
  if sqlerrm<>'That time or dentist conflicts with a held appointment or schedule. The original appointment was kept.' then raise; end if;
 end;
 if (select to_jsonb(ap) from public.appointments ap where id=a)<>original or
    (select jsonb_agg(to_jsonb(rr)) from private.reservation_resources rr where appointment_id=a)<>snapshots or
    exists(select 1 from private.appointment_events where appointment_id=a and action<>'requested') then raise exception 'FAIL conflict did not roll back'; end if;
 perform public.move_appointment(a,0,t+interval '2 hours',d1,'Patient requested change');
 if not exists(select 1 from public.appointments where id=a and reference=ref and status='pending' and version=1 and starts_at=t+interval '2 hours' and ends_at=t+interval '2 hours 45 minutes') then raise exception 'FAIL move did not preserve identity/status or duration'; end if;
 if not private.capacity_feasible(day,private.slot_candidate(b,s,t)) then raise exception 'FAIL old capacity not released'; end if;
 if private.capacity_feasible(day,private.slot_candidate(b,s,t+interval '2 hours')) then raise exception 'FAIL new capacity not held'; end if;
 -- Reassignment preserves duration/resource snapshot even after service defaults change.
 update private.branch_service_settings set duration_minutes=60 where branch_id=b and service_id=s;
 perform public.move_appointment(a,1,t+interval '2 hours',d2,'Dentist reassignment');
 if not exists(select 1 from public.appointments where id=a and dentist_id=d2 and version=2 and ends_at=t+interval '2 hours 45 minutes') then raise exception 'FAIL reassignment changed duration'; end if;
 begin perform public.move_appointment(a,1,t+interval '3 hours',d1,'Stale edit'); raise exception 'FAIL stale update accepted';
 exception when raise_exception then if sqlerrm<>'Appointment changed. Refresh before trying again.' then raise; end if; end;
 begin perform public.move_appointment(a,2,t+interval '7 hours 30 minutes',d1,'Outside shift'); raise exception 'FAIL uncovered duration accepted';
 exception when raise_exception then if sqlerrm<>'That time or dentist conflicts with a held appointment or schedule. The original appointment was kept.' then raise; end if; end;
 perform public.appointment_action(a,2,'confirm',d2);
 perform public.move_appointment(a,3,t+interval '1 day',d1,'Patient requested next day');
 if not exists(select 1 from public.appointments where id=a and status='confirmed' and version=4 and starts_at=t+interval '1 day') then raise exception 'FAIL confirmed move'; end if;
 if (select count(*) from private.appointment_events where appointment_id=a and action in ('reschedule','reassign') and length(details->>'reason')>=3)<>3 then raise exception 'FAIL audit details'; end if;
 begin perform public.move_appointment(a,4,now()-interval '1 hour',d1,'Past time'); raise exception 'FAIL past time accepted';
 exception when raise_exception then if sqlerrm<>'Choose a future appointment time' then raise; end if; end;
 perform public.appointment_action(a,4,'cancel');
 begin perform public.move_appointment(a,5,t+interval '3 hours',d1,'Cancelled edit'); raise exception 'FAIL cancelled move';
 exception when raise_exception then if sqlerrm<>'Only pending or confirmed appointments can be changed' then raise; end if; end;
 perform set_config('test.move_id',a::text,true);
 perform set_config('test.other_id',other::text,true);
 perform set_config('test.other_start',(t+interval '1 hour')::text,true);
end $$;
set local role authenticated;
select public.move_appointment(current_setting('test.other_id')::uuid,1,current_setting('test.other_start')::timestamptz,'f4300000-0000-4000-8000-000000000002','Authenticated staff reassignment');
reset role;
select set_config('request.jwt.claims','{"sub":"f4100000-0000-4000-8000-000000000002","session_id":"f4200000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 begin perform public.move_appointment(current_setting('test.move_id')::uuid,5,now()+interval '2 days','f4300000-0000-4000-8000-000000000001','Cross branch edit'); raise exception 'FAIL cross branch access'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.move_appointment(current_setting('test.move_id')::uuid,5,now()+interval '2 days','f4300000-0000-4000-8000-000000000001','Anonymous edit'); raise exception 'FAIL anonymous access'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: conflict rollback, old/new capacity, reassignment snapshots, current move duration, pending/confirmed status, stale version, audit and branch/anonymous denial' as result;
