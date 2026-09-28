-- Atomic same-branch moves; patient identity, service and reference remain unchanged.
alter table private.appointment_events add column details jsonb not null default '{}'::jsonb;
create function private.move_appointment(p_id uuid,p_expected integer,p_start timestamptz,p_dentist uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare appt public.appointments; candidate jsonb; finish timestamptz; moved boolean;
begin
 if auth.uid() is null or private.current_staff_role() is null then raise exception 'Staff access required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(739201,2);
 select * into appt from public.appointments where id=p_id for update;
 if not found or not coalesce(private.can_access_branch(appt.branch_id),false) then raise exception 'Appointment access denied' using errcode='42501'; end if;
 if p_expected is null or appt.version<>p_expected then raise exception 'Appointment changed. Refresh before trying again.'; end if;
 if appt.status not in ('pending','confirmed') then raise exception 'Only pending or confirmed appointments can be changed'; end if;
 if p_start is null or not isfinite(p_start) or p_start<=now() then raise exception 'Choose a future appointment time'; end if;
 if p_dentist is null then raise exception 'Choose an eligible dentist'; end if;
 if p_reason is null or length(btrim(p_reason)) not between 3 and 500 then raise exception 'Enter a reason between 3 and 500 characters'; end if;
 moved:=p_start<>appt.starts_at;
 if not moved and p_dentist is not distinct from appt.dentist_id then raise exception 'Choose a different time or dentist'; end if;
 finish:=appt.ends_at;
 if moved then
   candidate:=private.slot_candidate(appt.branch_id,appt.service_id,p_start);
   if candidate is null then raise exception 'This time does not meet the branch booking rules'; end if;
   finish:=(candidate->>'end')::timestamptz;
 end if;
 update public.appointments set starts_at=p_start,ends_at=finish,dentist_id=p_dentist,version=version+1 where id=p_id;
 if moved then
   delete from private.reservation_resources where appointment_id=p_id;
   insert into private.reservation_resources(appointment_id,resource_id,units)
   select p_id,(r->>'id')::uuid,(r->>'units')::integer from jsonb_array_elements(candidate->'resources') r;
 end if;
 if not private.capacity_feasible((p_start at time zone 'Asia/Manila')::date) then
   raise exception 'That time or dentist conflicts with a held appointment or schedule. The original appointment was kept.';
 end if;
 insert into private.appointment_events(appointment_id,actor_id,action,details)
 values(p_id,auth.uid(),case when moved then 'reschedule' else 'reassign' end,jsonb_build_object(
 'reason',btrim(p_reason),'old_start',appt.starts_at,'old_end',appt.ends_at,'old_dentist',appt.dentist_id,
 'new_start',p_start,'new_end',finish,'new_dentist',p_dentist));
 return private.appointment_result(p_id);
end $$;
create function public.move_appointment(p_id uuid,p_expected integer,p_start timestamptz,p_dentist uuid,p_reason text)
returns jsonb language sql security invoker set search_path='' as $$
 select private.move_appointment(p_id,p_expected,p_start,p_dentist,p_reason);
$$;
revoke all on function private.move_appointment(uuid,integer,timestamptz,uuid,text),public.move_appointment(uuid,integer,timestamptz,uuid,text) from public,anon,authenticated;
grant execute on function private.move_appointment(uuid,integer,timestamptz,uuid,text),public.move_appointment(uuid,integer,timestamptz,uuid,text) to authenticated;
