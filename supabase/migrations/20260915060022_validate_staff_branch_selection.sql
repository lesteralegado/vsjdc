create or replace function private.set_staff_access(p_user_id uuid, p_role text, p_active boolean, p_branch_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then raise exception 'Cannot change your own access'; end if;
  if p_role is null or p_role not in ('admin','receptionist') or p_active is null then raise exception 'Invalid access settings'; end if;
  if p_role = 'receptionist' and p_active and coalesce(cardinality(p_branch_ids), 0) = 0 then raise exception 'Select at least one branch'; end if;
  if exists (select 1 from unnest(p_branch_ids) as requested(branch_id) where not exists (select 1 from public.branches b where b.id = requested.branch_id and b.active)) then raise exception 'Unknown branch'; end if;
  update private.staff_accounts set role = p_role, active = p_active where user_id = p_user_id;
  if not found then raise exception 'Staff account not found'; end if;
  delete from private.staff_branches where user_id = p_user_id;
  if p_role = 'receptionist' then
    insert into private.staff_branches(user_id, branch_id) select p_user_id, id from (select distinct unnest(p_branch_ids) id) selected;
  end if;
  insert into private.access_events(actor_id, subject_id, action) values (auth.uid(), p_user_id, 'staff_access_changed');
end;
$$;
