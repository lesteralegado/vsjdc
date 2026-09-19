-- Preserve permissions, locking and optimistic concurrency; guard premature status changes.
create or replace function private.appointment_action(p_id uuid,p_expected integer,p_action text,p_dentist uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare appt public.appointments; next_status text;
begin
 if auth.uid() is null or private.current_staff_role() is null then raise exception 'Staff access required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(739201,2);
 select * into appt from public.appointments where id=p_id for update;
 if not found or not coalesce(private.can_access_branch(appt.branch_id),false) then raise exception 'Appointment access denied' using errcode='42501'; end if;
 if p_expected is null or appt.version<>p_expected then raise exception 'Appointment changed. Refresh before trying again.'; end if;
 if p_action='check_in' and (appt.starts_at at time zone 'Asia/Manila')::date<>(now() at time zone 'Asia/Manila')::date then
   raise exception 'Check-in is allowed only on the appointment date';
 end if;
 if p_action='complete' and appt.starts_at>now() then
   raise exception 'An appointment cannot be completed before its scheduled start';
 end if;
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
