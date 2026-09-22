-- Synthetic data; no persistent users or appointments.
begin;
insert into auth.users(id) values('f5100000-0000-4000-8000-000000000001');
insert into auth.sessions(id,user_id) values('f5200000-0000-4000-8000-000000000001','f5100000-0000-4000-8000-000000000001');
insert into private.staff_accounts(user_id,display_name,role) values('f5100000-0000-4000-8000-000000000001','Synthetic pagination receptionist','receptionist');
insert into private.staff_branches select 'f5100000-0000-4000-8000-000000000001',id from public.branches where slug='cabuyao';
insert into public.appointments(branch_id,service_id,reference,starts_at,ends_at,status)
select b.id,s.id,'PAGINATION-TEST-'||n, '2001-01-01T01:00:00Z'::timestamptz, '2001-01-01T01:30:00Z'::timestamptz,'pending'
from public.branches b cross join public.services s cross join generate_series(1,226) n where b.slug='cabuyao' and s.name='Oral Prophylaxis';
insert into public.appointments(branch_id,service_id,reference,starts_at,ends_at,status)
select b.id,s.id,'PAGINATION-OTHER-BRANCH', '2001-01-01T01:00:00Z','2001-01-01T01:30:00Z','pending'
from public.branches b cross join public.services s where b.slug='santa-rosa' and s.name='Oral Prophylaxis';
select set_config('request.jwt.claims','{"sub":"f5100000-0000-4000-8000-000000000001","session_id":"f5200000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ declare page_count integer; distinct_count integer; begin
 if (select count(*) from public.appointments where reference like 'PAGINATION-TEST-%' and status='pending')<>226 then raise exception 'FAIL pending total'; end if;
 select count(*) into page_count from (select id from public.appointments where reference like 'PAGINATION-TEST-%' order by starts_at,id offset 200 limit 25) p;
 if page_count<>25 then raise exception 'FAIL page beyond 200'; end if;
 select count(*) into page_count from (select id from public.appointments where reference like 'PAGINATION-TEST-%' order by starts_at,id offset 225 limit 25) p;
 if page_count<>1 then raise exception 'FAIL last page'; end if;
 select count(distinct id) into distinct_count from (
  select p.id from generate_series(0,9) n cross join lateral
  (select id from public.appointments where reference like 'PAGINATION-TEST-%' order by starts_at,id offset n*25 limit 25) p
 ) combined;
 if distinct_count<>226 then raise exception 'FAIL pagination omitted/duplicated rows'; end if;
 if (select count(*) from public.appointments where reference='PAGINATION-TEST-226')<>1 then raise exception 'FAIL full reference search'; end if;
 if exists(select 1 from public.appointments where reference='PAGINATION-OTHER-BRANCH') then raise exception 'FAIL other branch reference search bypassed RLS'; end if;
 if exists(select 1 from public.appointments where reference like 'PAGINATION-TEST-%' and status='confirmed') then raise exception 'FAIL status filter'; end if;
end $$;
reset role;
delete from auth.sessions where id='f5200000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin
 if exists(select 1 from public.appointments where reference like 'PAGINATION-%') then raise exception 'FAIL revoked session can page records'; end if;
end $$;
reset role;
rollback;
select 'PASS: 226 pending records reachable, stable ordering, exact search, status filter, cross-branch search and revoked-session denial' as result;
