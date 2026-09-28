-- Synthetic development fixtures only. Everything rolls back.
begin;
insert into auth.users(id) values ('61000000-0000-4000-8000-000000000001'),('61000000-0000-4000-8000-000000000002');
insert into auth.sessions(id,user_id) values ('62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001'),('62000000-0000-4000-8000-000000000002','61000000-0000-4000-8000-000000000002');
insert into private.staff_accounts(user_id,display_name,role) values ('61000000-0000-4000-8000-000000000001','Synthetic configuration admin','admin'),('61000000-0000-4000-8000-000000000002','Synthetic configuration receptionist','receptionist');
insert into private.staff_branches select '61000000-0000-4000-8000-000000000002',id from public.branches where slug='cabuyao';
select set_config('request.jwt.claims','{"sub":"61000000-0000-4000-8000-000000000001","session_id":"62000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$
declare cab uuid; sta uuid; svc uuid; den uuid; resource uuid; day date:=(now() at time zone 'Asia/Manila')::date+2; config jsonb; result jsonb;
begin
  select id into cab from public.branches where slug='cabuyao'; select id into sta from public.branches where slug='santa-rosa';
  select id into svc from public.services where name='Teeth Whitening';
  config:='{"opening_days":[0,1,2,3,4,5,6],"opens_at":"09:00","closes_at":"20:00","chairs":1,"lead_minutes":0,"horizon_days":30,"step_minutes":30}';
  perform public.configure_schedule(cab,'branch',config); perform public.configure_schedule(sta,'branch',config);
  perform public.configure_schedule(cab,'dentist',jsonb_build_object('name','S2 synthetic dentist','about','','published',false,'active',true,'travel_minutes',30,'service_ids',jsonb_build_array(svc)));
  select (d->>'id')::uuid into den from jsonb_array_elements(public.schedule_context(cab)->'dentists') d where d->>'name'='S2 synthetic dentist';
  perform public.configure_schedule(cab,'resource','{"name":"S2 test equipment","capacity":1}');
  select (r->>'id')::uuid into resource from jsonb_array_elements(public.schedule_context(cab)->'resources') r where r->>'name'='S2 test equipment';
  perform public.configure_schedule(cab,'service',jsonb_build_object('service_id',svc,'duration_minutes',30,'buffer_minutes',15,'enabled',true,'requirements',jsonb_build_array(jsonb_build_object('resource_id',resource,'units',1))));
  begin
    perform public.configure_schedule(cab,'service',jsonb_build_object('service_id',svc,'duration_minutes',30,'buffer_minutes',15,'enabled',true,'requirements',jsonb_build_array(jsonb_build_object('resource_id',resource,'units',2))));
    raise exception 'FAIL: excessive equipment units accepted';
  exception when raise_exception then if sqlerrm<>'Invalid resource requirement' then raise; end if; end;
  perform public.configure_schedule(cab,'shift',jsonb_build_object('dentist_id',den,'starts_at',day||'T09:00:00+08:00','ends_at',day||'T12:00:00+08:00'));
  perform public.configure_schedule(cab,'shift',jsonb_build_object('dentist_id',den,'starts_at',day||'T13:00:00+08:00','ends_at',day||'T17:00:00+08:00'));
  begin
    perform public.configure_schedule(cab,'shift',jsonb_build_object('dentist_id',den,'starts_at',day||'T10:00:00+08:00','ends_at',day||'T11:00:00+08:00'));
    raise exception 'FAIL: overlapping shift accepted';
  exception when raise_exception then if sqlerrm<>'Dentist has an overlapping shift or insufficient travel time' then raise; end if; end;
  begin
    perform public.configure_schedule(sta,'shift',jsonb_build_object('dentist_id',den,'starts_at',day||'T17:00:00+08:00','ends_at',day||'T19:00:00+08:00'));
    raise exception 'FAIL: insufficient travel accepted';
  exception when raise_exception then if sqlerrm<>'Dentist has an overlapping shift or insufficient travel time' then raise; end if; end;
  perform public.configure_schedule(sta,'shift',jsonb_build_object('dentist_id',den,'starts_at',day||'T17:30:00+08:00','ends_at',day||'T19:00:00+08:00'));
  begin
    perform public.configure_schedule(cab,'branch',config||'{"closes_at":"16:00"}'::jsonb);
    raise exception 'FAIL: invalidating branch hours accepted';
  exception when raise_exception then if sqlerrm<>'Existing shifts fall outside these opening hours. Remove or adjust them first.' then raise; end if; end;
  result:=public.preview_availability(cab,svc,day);
  if not exists(select 1 from jsonb_array_elements(result->'slots') s where (s->>'starts_at')::timestamptz=(day||'T11:00:00+08:00')::timestamptz and (s->>'available')::boolean) then raise exception 'FAIL: valid start missing'; end if;
  if exists(select 1 from jsonb_array_elements(result->'slots') s where (s->>'starts_at')::timestamptz in ((day||'T11:30:00+08:00')::timestamptz,(day||'T12:00:00+08:00')::timestamptz) and (s->>'available')::boolean) then raise exception 'FAIL: break/buffer ignored'; end if;
  perform public.configure_schedule(cab,'block',jsonb_build_object('starts_at',day||'T10:00:00+08:00','ends_at',day||'T10:30:00+08:00','reason','Synthetic closure'));
  result:=public.preview_availability(cab,svc,day);
  if exists(select 1 from jsonb_array_elements(result->'slots') s where (s->>'starts_at')::timestamptz=(day||'T09:30:00+08:00')::timestamptz and (s->>'available')::boolean) then raise exception 'FAIL: closure ignored'; end if;
  perform set_config('test.santa_branch',sta::text,true);
  perform set_config('test.cabuyao_branch',cab::text,true);
  perform set_config('test.service',svc::text,true);
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"61000000-0000-4000-8000-000000000002","session_id":"62000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  perform public.schedule_context(current_setting('test.cabuyao_branch')::uuid);
  begin perform public.schedule_context(current_setting('test.santa_branch')::uuid); raise exception 'FAIL: cross-branch context'; exception when insufficient_privilege then null; end;
  begin perform public.configure_schedule(current_setting('test.santa_branch')::uuid,'remove_shift','{}'); raise exception 'FAIL: cross-branch mutation'; exception when insufficient_privilege then null; end;
  begin perform public.configure_schedule(current_setting('test.cabuyao_branch')::uuid,'branch','{}'); raise exception 'FAIL: receptionist admin configuration'; exception when insufficient_privilege then null; end;
  begin perform * from private.dentist_shifts; raise exception 'FAIL: direct private table access'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  if exists(select 1 from public.dentists where name='S2 synthetic dentist') then raise exception 'FAIL: unpublished dentist exposed'; end if;
  begin perform public.schedule_context(current_setting('test.cabuyao_branch')::uuid); raise exception 'FAIL: anonymous configuration'; exception when insufficient_privilege then null; end;
  begin perform public.preview_availability(current_setting('test.cabuyao_branch')::uuid,current_setting('test.service')::uuid,current_date+2); raise exception 'FAIL: patient preview enabled'; exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into public.appointments(branch_id,service_id,starts_at,ends_at) values(current_setting('test.cabuyao_branch')::uuid,current_setting('test.service')::uuid,now()+interval '2 days',now()+interval '2 days 1 hour');
select set_config('request.jwt.claims','{"sub":"61000000-0000-4000-8000-000000000001","session_id":"62000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.configure_schedule(current_setting('test.cabuyao_branch')::uuid,'resource','{"name":"Must not save","capacity":1}'); raise exception 'FAIL: held appointments invalidated';
  exception when raise_exception then if sqlerrm not like 'This change conflicts with an existing appointment.%' then raise; end if; end;
end $$;
reset role;
rollback;
select 'PASS: configuration, eligibility, resources, shifts, breaks, buffers, closures, travel, branch authorization, private preview, reservation guard' as result;
