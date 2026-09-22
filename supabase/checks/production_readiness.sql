-- Read-only configuration report. Run in the trusted SQL editor, never expose as a public RPC.
-- A green report is necessary but does not replace clinic approval, SMTP, backups or browser acceptance.
with checks as (
 select 'active_branches' as check_name, count(*)=2 as passed, count(*)::text||' active branches (expected 2)' as detail from public.branches where active
 union all
 select 'administrator',exists(select 1 from private.staff_accounts where active and role='admin'),'At least one active administrator is required'
 union all
 select 'demo_profiles_removed',not exists(select 1 from public.dentists where name ilike '%demo%' or id::text like 'd2000000-%'),'Review/remove fictional profiles before production'
 union all
 select 'demo_appointments_removed',not exists(select 1 from public.appointment_contacts where email ilike '%@example.invalid' or patient_name ilike 'demo%'),'No development patient fixtures in production'
 union all
 select 'branch_settings:'||b.slug,exists(select 1 from private.branch_schedule_settings s where s.branch_id=b.id),'Opening hours, chairs and booking rules configured' from public.branches b where b.active
 union all
 select 'enabled_services:'||b.slug,exists(select 1 from private.branch_service_settings s join public.services c on c.id=s.service_id where s.branch_id=b.id and s.enabled and c.published),'At least one published service enabled with duration/buffer' from public.branches b where b.active
 union all
 select 'future_eligible_shift:'||b.slug,exists(
 select 1 from private.dentist_shifts ds join private.dentist_rules dr on dr.dentist_id=ds.dentist_id
 join private.dentist_eligibility de on de.dentist_id=ds.dentist_id
 join private.branch_service_settings ss on ss.branch_id=ds.branch_id and ss.service_id=de.service_id
 where ds.branch_id=b.id and ds.ends_at>now() and dr.active and ss.enabled
 ),'At least one future active eligible dentist shift; review full calendar separately' from public.branches b where b.active
 union all
 select 'anonymous_staff_rpc_denied',not has_function_privilege('anon','public.move_appointment(uuid,integer,timestamp with time zone,uuid,text)','execute')
 and not has_function_privilege('anon','public.appointment_action(uuid,integer,text,uuid)','execute'),'Staff mutation endpoints are not callable anonymously'
 union all
 select 'direct_booking_gateway_denied',not has_function_privilege('anon','public.booking_gateway(text,jsonb)','execute')
 and not has_function_privilege('authenticated','public.booking_gateway(text,jsonb)','execute'),'Booking gateway is server-only'
)
select check_name,case when passed then 'PASS' else 'NEEDS ATTENTION' end as status,detail from checks order by check_name;
