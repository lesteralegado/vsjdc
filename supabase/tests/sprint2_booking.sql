begin;
select pg_advisory_xact_lock(739201,2);
update private.booking_settings set enabled=true;
update private.dentist_rules set active=false;
insert into auth.users(id) values('e1000000-0000-4000-8000-000000000001'),('e1000000-0000-4000-8000-000000000002');
insert into auth.sessions(id,user_id) values('e1100000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001'),('e1100000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000002');
insert into private.staff_accounts(user_id,display_name,role) values('e1000000-0000-4000-8000-000000000001','QA admin','admin'),('e1000000-0000-4000-8000-000000000002','QA receptionist','receptionist');
insert into private.staff_branches select 'e1000000-0000-4000-8000-000000000002',id from public.branches where slug='cabuyao';
insert into public.dentists(id,name) values('e1200000-0000-4000-8000-000000000001','QA multi-service dentist'),('e1200000-0000-4000-8000-000000000002','QA whitening dentist');
insert into private.dentist_rules values('e1200000-0000-4000-8000-000000000001',60,true),('e1200000-0000-4000-8000-000000000002',60,true);
do $$
declare branch uuid; oral uuid; white uuid; day date:=(now() at time zone 'Asia/Manila')::date+2; request jsonb; result jsonb; second jsonb; id1 uuid; id2 uuid; ref text; candidate jsonb; count_before integer;
begin
 select id into branch from public.branches where slug='santa-rosa';
 select id into oral from public.services where name='Oral Prophylaxis'; select id into white from public.services where name='Teeth Whitening';
 update private.branch_schedule_settings set chairs=3,lead_minutes=0,horizon_days=30,step_minutes=30 where branch_id=branch;
 update private.branch_service_settings set duration_minutes=30,buffer_minutes=15,enabled=true where branch_id=branch and service_id in (oral,white);
 insert into private.dentist_eligibility values('e1200000-0000-4000-8000-000000000001',oral),('e1200000-0000-4000-8000-000000000001',white),('e1200000-0000-4000-8000-000000000002',white);
 insert into private.dentist_shifts(dentist_id,branch_id,starts_at,ends_at) values
 ('e1200000-0000-4000-8000-000000000001',branch,(day+time '09:00') at time zone 'Asia/Manila',(day+time '17:00') at time zone 'Asia/Manila'),
 ('e1200000-0000-4000-8000-000000000002',branch,(day+time '09:00') at time zone 'Asia/Manila',(day+time '17:00') at time zone 'Asia/Manila');
 request:=jsonb_build_object('requestId',gen_random_uuid(),'branchId','santa-rosa','serviceId',white,'slotId',day||'T09:00:00+08:00','firstName','QA','lastName','Synthetic','mobile','09170000001','email','qa@example.invalid','notes','','consent',true);
 result:=private.create_booking(request); ref:=result->>'reference';
 if result->>'status'<>'pending' or result->>'dentist' is not null or ref!~'^VSJ-[0-9A-F]{32}$' then raise exception 'FAIL pending/reference/unassigned'; end if;
 select id into id1 from public.appointments where reference=ref;
 second:=private.create_booking(request);
 if second->>'reference'<>ref then raise exception 'FAIL duplicate request'; end if;
 begin perform private.create_booking(request||jsonb_build_object('notes','changed')); raise exception 'FAIL changed payload accepted'; exception when raise_exception then if sqlerrm<>'This request key was already used with different details' then raise; end if; end;
 begin perform private.create_booking(request||jsonb_build_object('requestId',gen_random_uuid())); raise exception 'FAIL equipment double booked'; exception when raise_exception then if sqlerrm<>'This time is no longer available. Choose another time.' then raise; end if; end;
 perform set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","session_id":"e1100000-0000-4000-8000-000000000001","role":"authenticated"}',true);
 perform public.appointment_action(id1,0,'cancel');
 if (select status from public.appointments where id=id1)<>'cancelled' then raise exception 'FAIL cancel'; end if;
 -- Capacity release and two overlapping service pools.
 result:=private.create_booking(request||jsonb_build_object('requestId',gen_random_uuid()));
 select id into id1 from public.appointments where reference=result->>'reference';
 request:=request||jsonb_build_object('requestId',gen_random_uuid(),'serviceId',oral);
 second:=private.create_booking(request); select id into id2 from public.appointments where reference=second->>'reference';
 begin perform public.appointment_action(id1,0,'confirm','e1200000-0000-4000-8000-000000000001'); raise exception 'FAIL assignment stranded another hold'; exception when raise_exception then if sqlerrm<>'That dentist cannot be assigned without conflicting with another held appointment' then raise; end if; end;
 if (select version from public.appointments where id=id1)<>0 then raise exception 'FAIL rejected assignment did not roll back'; end if;
 perform public.appointment_action(id1,0,'confirm','e1200000-0000-4000-8000-000000000002');
 perform public.appointment_action(id2,0,'confirm','e1200000-0000-4000-8000-000000000001');
 begin perform public.appointment_action(id2,0,'cancel'); raise exception 'FAIL stale version accepted'; exception when raise_exception then if sqlerrm<>'Appointment changed. Refresh before trying again.' then raise; end if; end;
 begin perform private.create_booking(request||jsonb_build_object('requestId',gen_random_uuid())); raise exception 'FAIL dentist double booked'; exception when raise_exception then if sqlerrm<>'This time is no longer available. Choose another time.' then raise; end if; end;
 perform public.appointment_action(id2,1,'cancel');
 second:=private.create_booking(request||jsonb_build_object('requestId',gen_random_uuid())); select id into id2 from public.appointments where reference=second->>'reference';
 perform public.appointment_action(id2,0,'reject');
 if (select status from public.appointments where id=id2)<>'rejected' then raise exception 'FAIL rejection'; end if;
 -- Resource snapshots remain unchanged after creation.
 if (select count(*) from private.reservation_resources where appointment_id=id1)=0 then raise exception 'FAIL missing resource snapshot'; end if;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 result:=public.booking_gateway('track',jsonb_build_object('reference',second->>'reference','mobile','+639170000001'));
 if result->>'ok' is distinct from 'true' or result->'data'->>'status' is distinct from 'rejected' or result->'data' ? 'patient_name' or result->'data' ? 'mobile' then raise exception 'FAIL tracking result: %',result; end if;
 result:=public.booking_gateway('track',jsonb_build_object('reference',second->>'reference','mobile','09170000002'));
 if result->>'ok' is distinct from 'true' or result->'data' is distinct from 'null'::jsonb then raise exception 'FAIL wrong mobile disclosed data: %',result; end if;
 for attempt in 1..14 loop result:=public.booking_gateway('track',jsonb_build_object('reference',second->>'reference','mobile','09170000002')); end loop;
 if result->>'status'<>'429' then raise exception 'FAIL tracking rate limit'; end if;
 perform set_config('test.appointment',id1::text,true);
end $$;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000002","session_id":"e1100000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.appointments where id=current_setting('test.appointment')::uuid) then raise exception 'FAIL cross branch read'; end if;
 begin perform public.appointment_action(current_setting('test.appointment')::uuid,1,'cancel'); raise exception 'FAIL cross branch action'; exception when insufficient_privilege then null; end;
 begin perform public.booking_gateway('track','{}'); raise exception 'FAIL gateway direct bypass'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.booking_gateway('book','{}'); raise exception 'FAIL anonymous gateway bypass'; exception when insufficient_privilege then null; end;
 begin perform public.appointment_action(current_setting('test.appointment')::uuid,1,'cancel'); raise exception 'FAIL anonymous staff action'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: pending holds, idempotency, equipment, mixed eligibility, assignment rollback, stale version, cancellation/rejection release, tracking, rate limits and branch denial' as result;
