create or replace function private.booking_gateway(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; branch uuid; date_value date; row_value jsonb; v_mobile text; ref text; found_id uuid; suggestions integer:=0;
begin
 if (auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'Server access required' using errcode='42501'; end if;
 if p_action is null or p_action not in ('availability','book','track') or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>8192 then return jsonb_build_object('ok',false,'status',400,'error','Invalid request'); end if;
 if not private.consume_limit('global:'||p_action,case p_action when 'book' then 60 when 'track' then 180 else 180 end,60) then return jsonb_build_object('ok',false,'status',429,'error','Too many requests. Please try again later.'); end if;
 if p_action='book' then
   v_mobile:=private.normalized_mobile(p_data->>'mobile');
   if v_mobile is not null and not private.consume_limit('mobile:'||encode(extensions.digest(v_mobile,'sha256'),'hex'),12,3600) then return jsonb_build_object('ok',false,'status',429,'error','Too many requests. Please contact the clinic.'); end if;
 elsif p_action='track' then
   ref:=upper(trim(coalesce(p_data->>'reference','')));
   if ref ~ '^VSJ-[0-9A-F]{32}$' and not private.consume_limit('reference:'||encode(extensions.digest(ref,'sha256'),'hex'),15,900) then return jsonb_build_object('ok',false,'status',429,'error','Too many attempts. Please try again later.'); end if;
 end if;
 begin
   case p_action
   when 'book' then result:=private.create_booking(p_data);
   when 'track' then
     v_mobile:=private.normalized_mobile(p_data->>'mobile');
     select a.id into found_id from public.appointments a join public.appointment_contacts c on c.appointment_id=a.id where a.reference=ref and private.normalized_mobile(c.mobile)=v_mobile;
     result:=private.appointment_result(found_id);
   when 'availability' then
     if not coalesce((select enabled from private.booking_settings where singleton),false) then raise exception 'Booking is temporarily closed'; end if;
     select id into branch from public.branches where slug=p_data->>'branchId' and active;
     date_value:=(p_data->>'date')::date;
     result:=private.available_slots(branch,(p_data->>'serviceId')::uuid,date_value);
     if not exists(select 1 from jsonb_array_elements(result) x where (x->>'available')::boolean) then
       for offset_day in 1..3 loop
         for row_value in select value from jsonb_array_elements(private.available_slots(branch,(p_data->>'serviceId')::uuid,date_value+offset_day)) loop
           if (row_value->>'available')::boolean then result:=result||jsonb_build_array(row_value||'{"suggested":true}'::jsonb); suggestions:=suggestions+1; end if;
           exit when suggestions>=3;
         end loop;
         exit when suggestions>=3;
       end loop;
     end if;
   end case;
   return jsonb_build_object('ok',true,'data',result);
 exception when raise_exception then return jsonb_build_object('ok',false,'status',409,'error',sqlerrm);
 when others then return jsonb_build_object('ok',false,'status',422,'error','Request could not be processed. Check your details.'); end;
end $$;

create or replace function private.normalized_mobile(p_value text) returns text language sql immutable set search_path='' as $$
 select case when p_value is null or p_value !~ '^[+0-9[:space:]()-]{10,20}$' then null
 when regexp_replace(p_value,'[^0-9]','','g') ~ '^09[0-9]{9}$' then '63'||substr(regexp_replace(p_value,'[^0-9]','','g'),2)
 when regexp_replace(p_value,'[^0-9]','','g') ~ '^639[0-9]{9}$' then regexp_replace(p_value,'[^0-9]','','g') else null end;
$$;
