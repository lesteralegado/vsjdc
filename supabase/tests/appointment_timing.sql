-- Synthetic fixtures only; leaves no records behind.
begin;
insert into auth.users(id) values ('f3100000-0000-4000-8000-000000000001');
insert into auth.sessions(id,user_id) values ('f3200000-0000-4000-8000-000000000001','f3100000-0000-4000-8000-000000000001');
insert into private.staff_accounts(user_id,display_name,role) values ('f3100000-0000-4000-8000-000000000001','Timing test administrator','admin');
select set_config('request.jwt.claims','{"sub":"f3100000-0000-4000-8000-000000000001","session_id":"f3200000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$
declare appt uuid:='f3300000-0000-4000-8000-000000000001'; b uuid; s uuid;
begin
 select id into b from public.branches where slug='santa-rosa';
 select id into s from public.services where name='Oral Prophylaxis';
 insert into public.appointments(id,branch_id,service_id,starts_at,ends_at,status)
 values(appt,b,s,now()+interval '2 days',now()+interval '2 days 1 hour','confirmed');
 begin
   perform public.appointment_action(appt,0,'check_in');
   raise exception 'FAIL future check-in accepted';
 exception when raise_exception then
   if sqlerrm<>'Check-in is allowed only on the appointment date' then raise; end if;
 end;
 if (select version from public.appointments where id=appt)<>0 then raise exception 'FAIL rejected check-in changed version'; end if;
 -- A legacy checked-in record must also be protected.
 update public.appointments set status='checked_in' where id=appt;
 begin
   perform public.appointment_action(appt,0,'complete');
   raise exception 'FAIL future completion accepted';
 exception when raise_exception then
   if sqlerrm<>'An appointment cannot be completed before its scheduled start' then raise; end if;
 end;
 update public.appointments set status='confirmed',starts_at=now()-interval '2 days',ends_at=now()-interval '2 days'+interval '1 hour' where id=appt;
 begin
   perform public.appointment_action(appt,0,'check_in');
   raise exception 'FAIL past-day check-in accepted';
 exception when raise_exception then
   if sqlerrm<>'Check-in is allowed only on the appointment date' then raise; end if;
 end;
 update public.appointments set starts_at=now(),ends_at=now()+interval '1 hour' where id=appt;
 perform public.appointment_action(appt,0,'check_in');
 perform public.appointment_action(appt,1,'complete');
 if not exists(select 1 from public.appointments where id=appt and status='completed' and version=2) then raise exception 'FAIL valid lifecycle'; end if;
 if (select count(*) from private.appointment_events where appointment_id=appt)<>2 then raise exception 'FAIL invalid actions left audit events'; end if;
end $$;
rollback;
select 'PASS: future/past-day check-in and premature completion rejected; valid lifecycle and audit preserved' as result;
