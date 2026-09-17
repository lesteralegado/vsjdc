-- Run against development only. All fixtures roll back; no patient data is used.
begin;
insert into auth.users(id, raw_user_meta_data) values
('10000000-0000-4000-8000-000000000001','{}'),
('10000000-0000-4000-8000-000000000002','{}'),
('10000000-0000-4000-8000-000000000003','{"role":"admin"}');
insert into auth.sessions(id,user_id) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003');
insert into private.staff_accounts(user_id,display_name,role) values
('10000000-0000-4000-8000-000000000001','Test admin','admin'),
('10000000-0000-4000-8000-000000000002','Test receptionist','receptionist');
insert into private.staff_branches(user_id,branch_id) select '10000000-0000-4000-8000-000000000002',id from public.branches where slug='cabuyao';
insert into public.services(id,name,published) values ('30000000-0000-4000-8000-000000000001','Unpublished test',false);
insert into public.appointments(id,branch_id,service_id,starts_at,ends_at)
select case slug when 'cabuyao' then '40000000-0000-4000-8000-000000000001'::uuid else '40000000-0000-4000-8000-000000000002'::uuid end,
id,'30000000-0000-4000-8000-000000000001',now(),now()+interval '1 hour' from public.branches;
insert into public.appointment_contacts(appointment_id,patient_name,mobile)
select id,'Synthetic test','00000000000' from public.appointments where service_id='30000000-0000-4000-8000-000000000001';

set local role anon;
do $$ begin
  if exists(select 1 from public.services where id='30000000-0000-4000-8000-000000000001') then raise exception 'FAIL: unpublished catalogue exposed'; end if;
  if (select count(*) from public.branches) <> 2 then raise exception 'FAIL: public branches'; end if;
  begin perform * from public.appointments; raise exception 'FAIL: anonymous appointment access'; exception when insufficient_privilege then null; end;
  begin perform public.staff_context(); raise exception 'FAIL: anonymous staff access'; exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"20000000-0000-4000-8000-000000000002"}',true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.appointments where service_id='30000000-0000-4000-8000-000000000001') <> 1 then raise exception 'FAIL: receptionist branch isolation'; end if;
  if exists(select 1 from public.appointments where id='40000000-0000-4000-8000-000000000002') then raise exception 'FAIL: cross branch appointment'; end if;
  if exists(select 1 from public.appointment_contacts where appointment_id='40000000-0000-4000-8000-000000000002') then raise exception 'FAIL: cross branch contacts'; end if;
  if jsonb_array_length(public.staff_context()->'branches') <> 1 then raise exception 'FAIL: receptionist context'; end if;
  begin perform public.list_staff(); raise exception 'FAIL: receptionist staff management'; exception when insufficient_privilege then null; end;
  begin update public.appointments set status='confirmed'; raise exception 'FAIL: appointment write allowed'; exception when insufficient_privilege then null; end;
  begin update private.staff_accounts set role='admin'; raise exception 'FAIL: self escalation'; exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"20000000-0000-4000-8000-000000000001"}',true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.appointments where service_id='30000000-0000-4000-8000-000000000001') <> 2 then raise exception 'FAIL: admin both branches'; end if;
  if jsonb_array_length(public.staff_context()->'branches') <> 2 then raise exception 'FAIL: admin context'; end if;
  perform public.list_staff();
  perform public.set_staff_access('10000000-0000-4000-8000-000000000002','receptionist',true,
    array[(select id from public.branches where slug='cabuyao')]);
  begin
    perform public.set_staff_access('10000000-0000-4000-8000-000000000002','receptionist',true,array['99999999-0000-4000-8000-000000000001'::uuid]);
    raise exception 'FAIL: unknown branch accepted';
  exception when raise_exception then
    if sqlerrm <> 'Unknown branch' then raise; end if;
  end;
  perform public.set_staff_access('10000000-0000-4000-8000-000000000002','receptionist',false,'{}');
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"20000000-0000-4000-8000-000000000002"}',true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.appointments) then raise exception 'FAIL: inactive staff access'; end if;
  begin perform public.staff_context(); raise exception 'FAIL: inactive context'; exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","session_id":"20000000-0000-4000-8000-000000000003","user_metadata":{"role":"admin"}}',true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.appointments) then raise exception 'FAIL: metadata spoofing'; end if;
  begin perform public.staff_context(); raise exception 'FAIL: nonstaff context'; exception when insufficient_privilege then null; end;
end $$;
reset role;
delete from auth.sessions where id='20000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"20000000-0000-4000-8000-000000000001"}',true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.appointments) then raise exception 'FAIL: revoked session access'; end if;
  begin perform public.staff_context(); raise exception 'FAIL: revoked session context'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: public catalogue, private records, branch isolation, admin, deactivation, metadata spoofing, revoked session, forbidden writes' as result;
