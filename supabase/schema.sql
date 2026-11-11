-- =====================================================================
-- ECHO CARE – Maintenance Management System
-- Supabase database schema (run once in Supabase → SQL Editor)
-- Tables, row-level security, business functions, storage, realtime.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  phone       text not null default '',
  email       text not null default '',
  role        text not null default 'pending' check (role in ('manager','technician','pending')),
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,
  full_name   text not null,
  email       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.request_counters (
  year  int primary key,
  last  int not null default 0
);

create table public.requests (
  id                    uuid primary key default gen_random_uuid(),
  request_no            text not null unique,
  tracking_token_hash   text not null unique,
  customer_id           uuid not null references public.customers(id),
  customer_name         text not null,
  customer_phone        text not null,
  customer_email        text not null default '',
  governorate           text not null,
  area                  text not null,
  address               text not null,
  map_url               text not null default '',
  system_type           text not null check (system_type in ('central','underfloor','radiator','boiler','heatpump','hotwater','pool','other')),
  service_type          text not null check (service_type in ('periodic','repair','inspection','emergency')),
  description           text not null,
  preferred_date        date,
  preferred_slot        text check (preferred_slot in ('morning','noon','evening')),
  customer_notes        text not null default '',
  status                text not null default 'new' check (status in ('new','pending','confirmed','assigned','accepted','on_the_way','arrived','in_progress','completed','needs_follow','closed','cancelled')),
  priority              text not null default 'normal' check (priority in ('normal','high','urgent')),
  price                 numeric(10,2) check (price >= 0),
  appointment           timestamptz,
  assigned_engineer_id  uuid references public.profiles(id),
  assigned_at           timestamptz,
  manager_notes         text not null default '',
  change_request        jsonb,
  confirmed_by          text not null default '',
  cancel_reason         text not null default '',
  follow_up_of          uuid references public.requests(id),
  follow_up_id          uuid references public.requests(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  confirmed_at          timestamptz,
  completed_at          timestamptz,
  closed_at             timestamptz,
  cancelled_at          timestamptz
);
create index requests_status_idx on public.requests(status);
create index requests_engineer_idx on public.requests(assigned_engineer_id);
create index requests_customer_idx on public.requests(customer_id);
create index requests_created_idx on public.requests(created_at desc);

create table public.request_attachments (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.requests(id) on delete cascade,
  kind          text not null check (kind in ('customer','before','after')),
  storage_path  text not null unique,
  mime          text not null default '',
  created_at    timestamptz not null default now()
);
create index attachments_request_idx on public.request_attachments(request_id);

create table public.status_history (
  id           bigint generated always as identity primary key,
  request_id   uuid not null references public.requests(id) on delete cascade,
  from_status  text,
  to_status    text not null,
  note         text not null default '',
  actor_id     uuid,
  actor_name   text not null default '',
  created_at   timestamptz not null default now()
);
create index history_request_idx on public.status_history(request_id);

create table public.assignment_history (
  id           bigint generated always as identity primary key,
  request_id   uuid not null references public.requests(id) on delete cascade,
  engineer_id  uuid not null references public.profiles(id),
  assigned_by  uuid,
  created_at   timestamptz not null default now()
);

create table public.service_reports (
  request_id           uuid primary key references public.requests(id) on delete cascade,
  engineer_id          uuid not null references public.profiles(id),
  problem_type         text not null check (problem_type in ('technical','periodic','installation','operating','part','other')),
  problem_description  text not null default '',
  work_done            text not null,
  engineer_notes       text not null default '',
  parts_replaced       boolean not null default false,
  parts                jsonb not null default '[]'::jsonb,
  outcome              text not null check (outcome in ('resolved','partial','not','followup','parts')),
  submitted_at         timestamptz not null default now(),
  review_status        text not null default 'submitted' check (review_status in ('submitted','reviewed')),
  reviewed_by          uuid,
  reviewed_at          timestamptz,
  deleted_at           timestamptz,
  deleted_by           uuid,
  updated_at           timestamptz not null default now()
);

create table public.report_audit_log (
  id          bigint generated always as identity primary key,
  request_id  uuid not null references public.requests(id) on delete cascade,
  action      text not null,
  actor_id    uuid,
  actor_name  text not null default '',
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

create table public.feedback (
  request_id       uuid primary key references public.requests(id) on delete cascade,
  engineer_id      uuid references public.profiles(id),
  token_hash       text not null unique,
  sent_at          timestamptz not null default now(),
  service_quality  int check (service_quality between 1 and 5),
  punctuality      int check (punctuality between 1 and 5),
  professionalism  int check (professionalism between 1 and 5),
  overall          int check (overall between 1 and 5),
  comment          text not null default '',
  submitted_at     timestamptz
);

create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  audience      text not null check (audience in ('manager','engineer','customer')),
  recipient_id  uuid references public.profiles(id) on delete cascade,
  request_id    uuid references public.requests(id) on delete cascade,
  body          text not null,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index notifications_lookup_idx on public.notifications(audience, recipient_id, created_at desc);

-- ---------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'manager' and is_active);
$$;

create or replace function public.is_technician() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'technician' and is_active);
$$;

create or replace function public.actor_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select case when role = 'manager' then 'مدير الصيانة' else full_name end from profiles where id = auth.uid()), 'العميل');
$$;

create or replace function public.hash_token(t text) returns text
language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(coalesce(t, ''), 'sha256'), 'hex');
$$;

create or replace function public.new_token() returns text
language sql volatile set search_path = public, extensions as $$
  select encode(extensions.gen_random_bytes(18), 'hex');
$$;

create or replace function public.normalize_phone(p text) returns text
language plpgsql immutable as $$
declare d text;
begin
  d := translate(coalesce(p, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');
  d := regexp_replace(d, '[^0-9]', '', 'g');
  if d like '0020%' then d := substr(d, 5); end if;
  if d like '20%' and length(d) = 12 then d := substr(d, 3); end if;
  if length(d) = 10 and left(d, 1) = '1' then d := '0' || d; end if;
  return d;
end $$;

create or replace function public.require_manager() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_manager() then raise exception 'not_allowed' using errcode = '42501'; end if;
end $$;

create or replace function public.add_history(p_request uuid, p_from text, p_to text, p_note text)
returns void language sql security definer set search_path = public as $$
  insert into status_history(request_id, from_status, to_status, note, actor_id, actor_name)
  values (p_request, p_from, p_to, coalesce(p_note, ''), auth.uid(), actor_name());
$$;

create or replace function public.notify(p_audience text, p_recipient uuid, p_request uuid, p_body text)
returns void language sql security definer set search_path = public as $$
  insert into notifications(audience, recipient_id, request_id, body) values (p_audience, p_recipient, p_request, p_body);
$$;

create or replace function public.fmt_appt(t timestamptz) returns text
language sql stable as $$
  select to_char(t at time zone 'Africa/Cairo', 'YYYY-MM-DD HH24:MI');
$$;

create or replace function public.label_service(s text) returns text language sql immutable as $$
  select case s when 'periodic' then 'صيانة دورية' when 'repair' then 'إصلاح عطل' when 'inspection' then 'معاينة فنية' when 'emergency' then 'صيانة طارئة' else s end;
$$;
create or replace function public.label_outcome(s text) returns text language sql immutable as $$
  select case s when 'resolved' then 'تم حل المشكلة بالكامل' when 'partial' then 'تم حل جزء من المشكلة' when 'not' then 'لم يتم حل المشكلة' when 'followup' then 'يحتاج زيارة أخرى' when 'parts' then 'يحتاج قطع غيار' else s end;
$$;
create or replace function public.label_slot(s text) returns text language sql immutable as $$
  select case s when 'morning' then 'صباحًا' when 'noon' then 'ظهرًا' when 'evening' then 'مساءً' else '' end;
$$;

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger requests_touch before update on public.requests for each row execute function public.touch_updated_at();
create trigger reports_touch before update on public.service_reports for each row execute function public.touch_updated_at();

-- every new auth user gets a profile that waits for manager approval
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, full_name, phone, email, role, is_active)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          normalize_phone(new.raw_user_meta_data->>'phone'),
          coalesce(new.email, ''),
          'pending', false)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- report audit trail: every change or soft delete is recorded
create or replace function public.audit_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(old) - 'updated_at' - 'review_status' - 'reviewed_by' - 'reviewed_at') is distinct from (to_jsonb(new) - 'updated_at' - 'review_status' - 'reviewed_by' - 'reviewed_at') then
      insert into report_audit_log(request_id, action, actor_id, actor_name, old_data, new_data)
      values (new.request_id, case when new.deleted_at is not null and old.deleted_at is null then 'delete' else 'update' end,
              auth.uid(), actor_name(), to_jsonb(old), to_jsonb(new));
    end if;
  elsif tg_op = 'DELETE' then
    insert into report_audit_log(request_id, action, actor_id, actor_name, old_data)
    values (old.request_id, 'hard_delete', auth.uid(), actor_name(), to_jsonb(old));
  end if;
  return coalesce(new, old);
end $$;
create trigger service_reports_audit after update or delete on public.service_reports for each row execute function public.audit_report();

-- ---------------------------------------------------------------------
-- 3. Row-level security (real permissions at the data level)
-- ---------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.customers           enable row level security;
alter table public.request_counters    enable row level security;
alter table public.requests            enable row level security;
alter table public.request_attachments enable row level security;
alter table public.status_history      enable row level security;
alter table public.assignment_history  enable row level security;
alter table public.service_reports     enable row level security;
alter table public.report_audit_log    enable row level security;
alter table public.feedback            enable row level security;
alter table public.notifications       enable row level security;

-- Reads only. Every write goes through the functions below, which check roles and allowed transitions.
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or is_manager());
create policy customers_read on public.customers for select to authenticated using (is_manager());
create policy requests_read on public.requests for select to authenticated
  using (is_manager() or (is_technician() and assigned_engineer_id = auth.uid()));
create policy attachments_read on public.request_attachments for select to authenticated
  using (is_manager() or (is_technician() and exists (select 1 from requests r where r.id = request_id and r.assigned_engineer_id = auth.uid())));
create policy history_read on public.status_history for select to authenticated
  using (is_manager() or (is_technician() and exists (select 1 from requests r where r.id = request_id and r.assigned_engineer_id = auth.uid())));
create policy assignment_read on public.assignment_history for select to authenticated using (is_manager());
create policy reports_read on public.service_reports for select to authenticated
  using (is_manager() or (is_technician() and engineer_id = auth.uid() and deleted_at is null));
create policy audit_read on public.report_audit_log for select to authenticated using (is_manager());
create policy feedback_read on public.feedback for select to authenticated using (is_manager());
create policy notifications_read on public.notifications for select to authenticated
  using ((audience = 'manager' and is_manager()) or (audience = 'engineer' and recipient_id = auth.uid() and is_technician()));

revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke select on all tables in schema public from anon;

-- ---------------------------------------------------------------------
-- 4. Customer functions (no account; secret token links)
-- ---------------------------------------------------------------------

create or replace function public.next_request_no() returns text
language plpgsql security definer set search_path = public as $$
declare y int := extract(year from now() at time zone 'Africa/Cairo'); n int;
begin
  insert into request_counters(year, last) values (y, 1)
  on conflict (year) do update set last = request_counters.last + 1
  returning last into n;
  return 'EC-' || y || '-' || lpad(n::text, 5, '0');
end $$;

create or replace function public.submit_request(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_phone text := normalize_phone(p->>'phone');
  v_name text := btrim(coalesce(p->>'name', ''));
  v_email text := btrim(coalesce(p->>'email', ''));
  v_service text := p->>'service';
  v_cust uuid; v_id uuid; v_no text; v_token text := new_token();
  v_path text; v_media jsonb := coalesce(p->'media', '[]'::jsonb);
  v_date date := nullif(p->>'date', '')::date;
begin
  if length(v_name) < 3 or length(v_name) > 120 then raise exception 'invalid_name'; end if;
  if v_phone !~ '^01[0125][0-9]{8}$' then raise exception 'invalid_phone'; end if;
  if v_email <> '' and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_email'; end if;
  if length(btrim(coalesce(p->>'area', ''))) < 2 or length(btrim(coalesce(p->>'address', ''))) < 8 then raise exception 'invalid_address'; end if;
  if length(btrim(coalesce(p->>'description', ''))) < 5 then raise exception 'invalid_description'; end if;
  if v_date is null or v_date < (now() at time zone 'Africa/Cairo')::date then raise exception 'invalid_date'; end if;
  if jsonb_typeof(v_media) <> 'array' or jsonb_array_length(v_media) > 6 then raise exception 'invalid_media'; end if;
  -- simple abuse protection
  if (select count(*) from requests where customer_phone = v_phone and created_at > now() - interval '24 hours') >= 5 then raise exception 'too_many_requests'; end if;
  if (select count(*) from requests where created_at > now() - interval '10 minutes') >= 60 then raise exception 'too_many_requests'; end if;

  insert into customers(phone, full_name, email) values (v_phone, v_name, v_email)
  on conflict (phone) do update set full_name = excluded.full_name,
    email = case when excluded.email <> '' then excluded.email else customers.email end, updated_at = now()
  returning id into v_cust;

  v_no := next_request_no();
  insert into requests(request_no, tracking_token_hash, customer_id, customer_name, customer_phone, customer_email,
    governorate, area, address, map_url, system_type, service_type, description, preferred_date, preferred_slot,
    customer_notes, priority)
  values (v_no, hash_token(v_token), v_cust, v_name, v_phone, v_email,
    btrim(p->>'governorate'), btrim(p->>'area'), btrim(p->>'address'),
    case when coalesce(p->>'map_url', '') ~* '^https?://' then left(p->>'map_url', 500) else '' end,
    p->>'system', v_service, left(btrim(p->>'description'), 4000), v_date, nullif(p->>'slot', ''),
    left(btrim(coalesce(p->>'notes', '')), 2000), case when v_service = 'emergency' then 'urgent' else 'normal' end)
  returning id into v_id;

  for v_path in select jsonb_array_elements_text(v_media) loop
    if v_path !~ '^incoming/[0-9a-f-]{36}/[A-Za-z0-9._-]+$' then raise exception 'invalid_media'; end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'media' and o.name = v_path) then raise exception 'invalid_media'; end if;
    insert into request_attachments(request_id, kind, storage_path, mime)
    values (v_id, 'customer', v_path, coalesce((select o.metadata->>'mimetype' from storage.objects o where o.bucket_id = 'media' and o.name = v_path), ''));
  end loop;

  insert into status_history(request_id, from_status, to_status, note, actor_name) values (v_id, null, 'new', 'تم إنشاء الطلب', 'العميل');
  perform notify('manager', null, v_id, 'طلب صيانة جديد ' || v_no || ' · ' || v_name || ' · ' || label_service(v_service));
  perform notify('customer', null, v_id, 'تم استلام طلب الصيانة. سنتواصل معك لتأكيد السعر والموعد.');
  return jsonb_build_object('request_no', v_no, 'token', v_token);
end $$;

create or replace function public.request_by_token(p_token text) returns public.requests
language sql stable security definer set search_path = public as $$
  select * from requests where tracking_token_hash = hash_token(p_token);
$$;

create or replace function public.get_tracking(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r requests; f feedback; v_fb_token text;
begin
  r := request_by_token(p_token);
  if r.id is null then return null; end if;
  select * into f from feedback where request_id = r.id;
  return jsonb_build_object(
    'request_no', r.request_no, 'status', r.status, 'system', r.system_type, 'service', r.service_type,
    'preferred_date', r.preferred_date, 'preferred_slot', r.preferred_slot,
    'price', r.price, 'appointment', r.appointment, 'change_request', r.change_request,
    'confirmed_by', r.confirmed_by, 'cancel_reason', r.cancel_reason, 'created_at', r.created_at,
    'feedback_pending', (f.request_id is not null and f.submitted_at is null),
    'notifications', coalesce((select jsonb_agg(jsonb_build_object('body', n.body, 'at', n.created_at) order by n.created_at desc)
                               from notifications n where n.request_id = r.id and n.audience = 'customer'), '[]'::jsonb));
end $$;

create or replace function public.find_request(p_request_no text, p_phone text) returns text
language plpgsql security definer set search_path = public as $$
declare r requests; v_token text;
begin
  -- rotates the tracking link: used when the customer lost it and proves the request number + phone
  select * into r from requests where request_no = upper(btrim(p_request_no)) and customer_phone = normalize_phone(p_phone);
  if r.id is null then return null; end if;
  v_token := new_token();
  update requests set tracking_token_hash = hash_token(v_token) where id = r.id;
  return v_token;
end $$;

create or replace function public.customer_accept(p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare r requests;
begin
  r := request_by_token(p_token);
  if r.id is null then raise exception 'not_found'; end if;
  if r.status <> 'pending' or r.change_request is not null or r.price is null or r.appointment is null then raise exception 'invalid_state'; end if;
  update requests set status = 'confirmed', confirmed_at = now(), confirmed_by = 'customer' where id = r.id;
  insert into status_history(request_id, from_status, to_status, note, actor_name) values (r.id, 'pending', 'confirmed', 'وافق العميل على السعر والموعد من صفحة المتابعة', 'العميل');
  perform notify('manager', null, r.id, 'العميل ' || r.customer_name || ' وافق على السعر والموعد للطلب ' || r.request_no || '. الطلب جاهز للتوزيع.');
  perform notify('customer', null, r.id, 'تم تأكيد موعد الزيارة ' || fmt_appt(r.appointment) || ' والسعر ' || r.price || ' ج.م.');
end $$;

create or replace function public.customer_change(p_token text, p_date date, p_slot text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare r requests;
begin
  r := request_by_token(p_token);
  if r.id is null then raise exception 'not_found'; end if;
  if r.status <> 'pending' then raise exception 'invalid_state'; end if;
  if p_date is null or p_date < (now() at time zone 'Africa/Cairo')::date or p_slot not in ('morning','noon','evening') then raise exception 'invalid_date'; end if;
  update requests set change_request = jsonb_build_object('date', p_date, 'slot', p_slot, 'note', left(btrim(coalesce(p_note, '')), 500), 'at', now()) where id = r.id;
  insert into status_history(request_id, from_status, to_status, note, actor_name) values (r.id, 'pending', 'pending', 'طلب تغيير الموعد إلى ' || p_date || ' · ' || label_slot(p_slot), 'العميل');
  perform notify('manager', null, r.id, 'العميل ' || r.customer_name || ' يطلب تغيير موعد الطلب ' || r.request_no || ' إلى ' || p_date || ' · ' || label_slot(p_slot) || coalesce(nullif(' · ' || btrim(coalesce(p_note, '')), ' · '), ''));
end $$;

create or replace function public.get_feedback(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('request_no', r.request_no, 'submitted', f.submitted_at is not null)
  from feedback f join requests r on r.id = f.request_id where f.token_hash = hash_token(p_token);
$$;

create or replace function public.submit_feedback(p_token text, p_quality int, p_punctuality int, p_professionalism int, p_overall int, p_comment text) returns void
language plpgsql security definer set search_path = public as $$
declare f feedback; v_no text;
begin
  select * into f from feedback where token_hash = hash_token(p_token);
  if f.request_id is null then raise exception 'not_found'; end if;
  if f.submitted_at is not null then raise exception 'already_submitted'; end if;
  update feedback set service_quality = p_quality, punctuality = p_punctuality, professionalism = p_professionalism,
    overall = p_overall, comment = left(btrim(coalesce(p_comment, '')), 2000), submitted_at = now()
  where request_id = f.request_id;
  select request_no into v_no from requests where id = f.request_id;
  perform notify('manager', null, f.request_id, 'تقييم جديد للطلب ' || v_no || ': ' || round((p_quality + p_punctuality + p_professionalism + p_overall) / 4.0, 1) || ' من 5');
end $$;

-- ---------------------------------------------------------------------
-- 5. Engineering-manager functions
-- ---------------------------------------------------------------------

create or replace function public.set_price_appointment(p_request uuid, p_price numeric, p_appointment timestamptz) returns void
language plpgsql security definer set search_path = public as $$
declare r requests; v_new text; v_changed boolean;
begin
  perform require_manager();
  select * into r from requests where id = p_request for update;
  if r.id is null then raise exception 'not_found'; end if;
  if r.status in ('in_progress','completed','needs_follow','closed','cancelled') then raise exception 'invalid_state'; end if;
  if p_price is null or p_price < 0 or p_appointment is null then raise exception 'invalid_input'; end if;
  v_changed := r.appointment is distinct from p_appointment;
  v_new := case when r.status = 'new' then 'pending'
                when r.status = 'confirmed' and v_changed then 'pending'
                else r.status end;
  update requests set price = p_price, appointment = p_appointment, change_request = null, status = v_new,
    confirmed_by = case when v_new = 'pending' then '' else confirmed_by end
  where id = r.id;
  perform add_history(r.id, r.status, v_new, 'السعر ' || p_price || ' ج.م · ' || fmt_appt(p_appointment));
  perform notify('customer', null, r.id, case when r.price is null then 'تم تحديد سعر الزيارة ' else 'تم تحديث سعر الزيارة ' end
    || p_price || ' ج.م والموعد ' || fmt_appt(p_appointment) || '. افتح صفحة المتابعة للموافقة.');
  if r.assigned_engineer_id is not null and v_changed then
    perform notify('engineer', r.assigned_engineer_id, r.id, 'تغيير موعد الزيارة ' || r.request_no || ' · ' || r.customer_name || ' أصبح ' || fmt_appt(p_appointment));
  end if;
end $$;

create or replace function public.confirm_request(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r requests;
begin
  perform require_manager();
  select * into r from requests where id = p_request for update;
  if r.status <> 'pending' or r.change_request is not null then raise exception 'invalid_state'; end if;
  update requests set status = 'confirmed', confirmed_at = now(), confirmed_by = 'manager' where id = r.id;
  perform add_history(r.id, 'pending', 'confirmed', 'وافق العميل (تأكيد هاتفي)');
  perform notify('customer', null, r.id, 'تم تأكيد موعد الزيارة ' || fmt_appt(r.appointment) || ' والسعر ' || r.price || ' ج.م.');
end $$;

create or replace function public.assign_request(p_request uuid, p_engineer uuid, p_notes text, p_confirm_first boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare r requests; v_old uuid; v_name text;
begin
  perform require_manager();
  if p_confirm_first then
    perform confirm_request(p_request);
  end if;
  select * into r from requests where id = p_request for update;
  if r.id is null then raise exception 'not_found'; end if;
  select full_name into v_name from profiles where id = p_engineer and role = 'technician' and is_active;
  if v_name is null then raise exception 'invalid_engineer'; end if;
  v_old := r.assigned_engineer_id;
  if v_old = p_engineer then
    update requests set manager_notes = left(btrim(coalesce(p_notes, '')), 2000) where id = r.id;
    return;
  end if;
  if r.status not in ('confirmed','assigned','accepted','on_the_way') then raise exception 'invalid_state'; end if;
  update requests set assigned_engineer_id = p_engineer, assigned_at = now(), status = 'assigned',
    manager_notes = left(btrim(coalesce(p_notes, '')), 2000)
  where id = r.id;
  insert into assignment_history(request_id, engineer_id, assigned_by) values (r.id, p_engineer, auth.uid());
  perform add_history(r.id, r.status, 'assigned',
    case when v_old is null then 'إسناد إلى ' || v_name else 'تحويل من ' || (select full_name from profiles where id = v_old) || ' إلى ' || v_name end);
  perform notify('engineer', p_engineer, r.id, 'مهمة جديدة ' || r.request_no || ' · ' || r.customer_name || ' · ' || r.area || ' · ' || coalesce(fmt_appt(r.appointment), ''));
  if v_old is not null then
    perform notify('engineer', v_old, r.id, 'تم سحب الطلب ' || r.request_no || ' منك وإسناده لمهندس آخر.');
  end if;
end $$;

create or replace function public.set_priority(p_request uuid, p_priority text) returns void
language plpgsql security definer set search_path = public as $$
declare r requests;
begin
  perform require_manager();
  select * into r from requests where id = p_request;
  if r.status in ('closed','cancelled') then raise exception 'invalid_state'; end if;
  update requests set priority = p_priority where id = r.id;
  perform add_history(r.id, r.status, r.status, 'الأولوية: ' || case p_priority when 'urgent' then 'عاجلة' when 'high' then 'مرتفعة' else 'عادية' end);
end $$;

create or replace function public.cancel_request(p_request uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare r requests;
begin
  perform require_manager();
  select * into r from requests where id = p_request for update;
  if r.status not in ('new','pending','confirmed','assigned','accepted','on_the_way','arrived') then raise exception 'invalid_state'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 2 then raise exception 'invalid_input'; end if;
  update requests set status = 'cancelled', cancel_reason = left(btrim(p_reason), 500), cancelled_at = now() where id = r.id;
  perform add_history(r.id, r.status, 'cancelled', btrim(p_reason));
  perform notify('customer', null, r.id, 'تم إلغاء طلب الصيانة. السبب: ' || btrim(p_reason));
  if r.assigned_engineer_id is not null then
    perform notify('engineer', r.assigned_engineer_id, r.id, 'إلغاء الطلب ' || r.request_no || ' · ' || r.customer_name);
  end if;
end $$;

create or replace function public.review_report(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r requests;
begin
  perform require_manager();
  update service_reports set review_status = 'reviewed', reviewed_by = auth.uid(), reviewed_at = now()
  where request_id = p_request and deleted_at is null;
  if not found then raise exception 'not_found'; end if;
  select * into r from requests where id = p_request;
  perform add_history(r.id, r.status, r.status, 'تمت مراجعة التقرير');
end $$;

create or replace function public.close_and_request_feedback(p_request uuid) returns text
language plpgsql security definer set search_path = public as $$
declare r requests; v_token text := new_token();
begin
  perform require_manager();
  select * into r from requests where id = p_request for update;
  if r.status <> 'completed' then raise exception 'invalid_state'; end if;
  if not exists (select 1 from service_reports where request_id = r.id and review_status = 'reviewed' and deleted_at is null) then raise exception 'report_not_reviewed'; end if;
  insert into feedback(request_id, engineer_id, token_hash) values (r.id, r.assigned_engineer_id, hash_token(v_token))
  on conflict (request_id) do update set token_hash = excluded.token_hash, sent_at = now()
    where feedback.submitted_at is null;
  update requests set status = 'closed', closed_at = now() where id = r.id;
  perform add_history(r.id, 'completed', 'closed', 'إغلاق وإنشاء رابط التقييم');
  perform notify('customer', null, r.id, 'شكرًا لاختيارك Echo. نرجو تقييم الخدمة من صفحة متابعة الطلب.');
  return v_token;
end $$;

create or replace function public.renew_feedback_link(p_request uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_token text := new_token();
begin
  perform require_manager();
  update feedback set token_hash = hash_token(v_token) where request_id = p_request and submitted_at is null;
  if not found then raise exception 'not_found'; end if;
  return v_token;
end $$;

create or replace function public.renew_tracking_link(p_request uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_token text := new_token();
begin
  perform require_manager();
  update requests set tracking_token_hash = hash_token(v_token) where id = p_request;
  if not found then raise exception 'not_found'; end if;
  return v_token;
end $$;

create or replace function public.close_request(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r requests;
begin
  perform require_manager();
  select * into r from requests where id = p_request for update;
  if r.status not in ('needs_follow','completed') then raise exception 'invalid_state'; end if;
  update requests set status = 'closed', closed_at = now() where id = r.id;
  perform add_history(r.id, r.status, 'closed', 'إغلاق بدون زيارة متابعة');
end $$;

create or replace function public.create_follow_up(p_request uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r requests; rep service_reports; v_id uuid; v_no text; v_token text := new_token();
begin
  perform require_manager();
  select * into r from requests where id = p_request for update;
  if r.status <> 'needs_follow' then raise exception 'invalid_state'; end if;
  select * into rep from service_reports where request_id = r.id and deleted_at is null;
  v_no := next_request_no();
  insert into requests(request_no, tracking_token_hash, customer_id, customer_name, customer_phone, customer_email,
    governorate, area, address, map_url, system_type, service_type, description, priority, follow_up_of)
  values (v_no, hash_token(v_token), r.customer_id, r.customer_name, r.customer_phone, r.customer_email,
    r.governorate, r.area, r.address, r.map_url, r.system_type, case when r.service_type = 'periodic' then 'repair' else r.service_type end,
    'زيارة متابعة للطلب ' || r.request_no || '. نتيجة الزيارة السابقة: ' || label_outcome(rep.outcome)
      || coalesce('. توصيات المهندس: ' || nullif(rep.engineer_notes, ''), ''),
    r.priority, r.id)
  returning id into v_id;
  update requests set status = 'closed', closed_at = now(), follow_up_id = v_id where id = r.id;
  perform add_history(r.id, 'needs_follow', 'closed', 'تم إنشاء زيارة متابعة ' || v_no);
  perform add_history(v_id, null, 'new', 'زيارة متابعة للطلب ' || r.request_no);
  perform notify('customer', null, v_id, 'تم فتح زيارة متابعة لطلبك ' || r.request_no || '. سنتواصل معك لتحديد الموعد.');
  return jsonb_build_object('id', v_id, 'request_no', v_no, 'token', v_token);
end $$;

create or replace function public.delete_report(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r requests;
begin
  perform require_manager();
  update service_reports set deleted_at = now(), deleted_by = auth.uid() where request_id = p_request and deleted_at is null;
  if not found then raise exception 'not_found'; end if;
  select * into r from requests where id = p_request for update;
  if r.status in ('completed','needs_follow') then
    update requests set status = 'in_progress' where id = r.id;
    perform add_history(r.id, r.status, 'in_progress', 'حُذف التقرير · يحتاج تقريرًا جديدًا');
  end if;
end $$;

create or replace function public.set_staff(p_user uuid, p_role text, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_manager();
  if p_role not in ('manager','technician','pending') then raise exception 'invalid_input'; end if;
  if p_user = auth.uid() and (p_role <> 'manager' or not p_active) then raise exception 'cannot_change_self'; end if;
  update profiles set role = p_role, is_active = p_active where id = p_user;
end $$;

create or replace function public.update_staff_contact(p_user uuid, p_name text, p_phone text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (is_manager() or p_user = auth.uid()) then raise exception 'not_allowed' using errcode = '42501'; end if;
  update profiles set full_name = left(btrim(p_name), 120), phone = normalize_phone(p_phone) where id = p_user;
end $$;

-- ---------------------------------------------------------------------
-- 6. Technician functions
-- ---------------------------------------------------------------------

create or replace function public.tech_advance(p_request uuid) returns text
language plpgsql security definer set search_path = public as $$
declare r requests; v_next text; v_me text;
begin
  if not is_technician() then raise exception 'not_allowed' using errcode = '42501'; end if;
  select * into r from requests where id = p_request for update;
  if r.id is null or r.assigned_engineer_id is distinct from auth.uid() then raise exception 'not_allowed' using errcode = '42501'; end if;
  v_next := case r.status when 'assigned' then 'accepted' when 'accepted' then 'on_the_way'
                          when 'on_the_way' then 'arrived' when 'arrived' then 'in_progress' end;
  if v_next is null then raise exception 'invalid_state'; end if;
  update requests set status = v_next where id = r.id;
  perform add_history(r.id, r.status, v_next, '');
  v_me := actor_name();
  if v_next = 'accepted' then perform notify('manager', null, r.id, v_me || ' قبل المهمة ' || r.request_no);
  elsif v_next = 'on_the_way' then
    perform notify('manager', null, r.id, v_me || ' بدأ التحرك إلى ' || r.customer_name || ' (' || r.request_no || ')');
    perform notify('customer', null, r.id, 'مهندس الصيانة في الطريق إليك.');
  elsif v_next = 'arrived' then perform notify('manager', null, r.id, v_me || ' وصل إلى موقع ' || r.customer_name || ' (' || r.request_no || ')');
  end if;
  return v_next;
end $$;

-- creates the report (technician) or edits it (technician before review, or manager)
create or replace function public.save_report(p_request uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare r requests; ex service_reports; v_status text; v_outcome text := p->>'outcome';
        v_path text; v_kind text; v_parts jsonb := coalesce(p->'parts', '[]'::jsonb); v_me text := actor_name();
begin
  select * into r from requests where id = p_request for update;
  if r.id is null then raise exception 'not_found'; end if;
  select * into ex from service_reports where request_id = r.id;
  if ex.request_id is not null and ex.deleted_at is not null then
    delete from service_reports where request_id = r.id;   -- audit trigger keeps a copy
    ex := null;
  end if;

  if is_manager() then
    if ex.request_id is null then raise exception 'not_found'; end if;
  elsif is_technician() and r.assigned_engineer_id = auth.uid() then
    if ex.request_id is null and r.status <> 'in_progress' then raise exception 'invalid_state'; end if;
    if ex.request_id is not null and ex.review_status = 'reviewed' then raise exception 'already_reviewed'; end if;
  else
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p->>'work_done', ''))) < 2 then raise exception 'invalid_input'; end if;
  if jsonb_typeof(v_parts) <> 'array' or jsonb_array_length(v_parts) > 30 then raise exception 'invalid_input'; end if;
  if coalesce((p->>'parts_replaced')::boolean, false) and (jsonb_array_length(v_parts) = 0 or exists (
       select 1 from jsonb_array_elements(v_parts) x where length(btrim(coalesce(x->>'name', ''))) = 0 or coalesce((x->>'qty')::int, 0) < 1)) then
    raise exception 'invalid_parts';
  end if;

  if ex.request_id is null then
    insert into service_reports(request_id, engineer_id, problem_type, problem_description, work_done, engineer_notes, parts_replaced, parts, outcome)
    values (r.id, auth.uid(), p->>'problem_type', left(coalesce(p->>'problem_description', ''), 4000), left(p->>'work_done', 4000),
            left(coalesce(p->>'engineer_notes', ''), 4000), coalesce((p->>'parts_replaced')::boolean, false),
            case when coalesce((p->>'parts_replaced')::boolean, false) then v_parts else '[]'::jsonb end, v_outcome);
    v_status := case when v_outcome = 'resolved' then 'completed' else 'needs_follow' end;
    update requests set status = v_status, completed_at = now() where id = r.id;
    perform add_history(r.id, r.status, v_status, 'تقرير الصيانة: ' || label_outcome(v_outcome));
    perform notify('manager', null, r.id, 'تقرير صيانة جديد ' || r.request_no || ' من ' || v_me || ' · ' || label_outcome(v_outcome));
    if v_status = 'needs_follow' then
      perform notify('manager', null, r.id, 'طلب زيارة إضافية للطلب ' || r.request_no || ' · ' || label_outcome(v_outcome));
    end if;
    perform notify('customer', null, r.id, case when v_status = 'completed' then 'انتهت زيارة الصيانة. شكرًا لك.'
      else 'انتهت زيارة الصيانة، ويحتاج الأمر متابعة. سيتواصل معك فريقنا.' end);
  else
    update service_reports set problem_type = p->>'problem_type', problem_description = left(coalesce(p->>'problem_description', ''), 4000),
      work_done = left(p->>'work_done', 4000), engineer_notes = left(coalesce(p->>'engineer_notes', ''), 4000),
      parts_replaced = coalesce((p->>'parts_replaced')::boolean, false),
      parts = case when coalesce((p->>'parts_replaced')::boolean, false) then v_parts else '[]'::jsonb end,
      outcome = v_outcome
    where request_id = r.id;
    if ex.outcome is distinct from v_outcome and r.status in ('completed','needs_follow') then
      v_status := case when v_outcome = 'resolved' then 'completed' else 'needs_follow' end;
      if v_status <> r.status then
        update requests set status = v_status where id = r.id;
        perform add_history(r.id, r.status, v_status, 'تعديل نتيجة التقرير');
      end if;
    end if;
    if not is_manager() then perform notify('manager', null, r.id, v_me || ' عدّل تقرير الطلب ' || r.request_no); end if;
  end if;

  -- photos: replace the before/after list with what was sent
  delete from request_attachments where request_id = r.id and kind in ('before','after');
  for v_kind in select unnest(array['before','after']) loop
    for v_path in select jsonb_array_elements_text(coalesce(p->v_kind, '[]'::jsonb)) loop
      if v_path !~ ('^reports/' || r.id || '/[A-Za-z0-9._-]+$') then raise exception 'invalid_media'; end if;
      insert into request_attachments(request_id, kind, storage_path) values (r.id, v_kind, v_path);
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 7. Shared staff functions
-- ---------------------------------------------------------------------

create or replace function public.mark_notifications_read(p_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  update notifications set read_at = now()
  where id = any(p_ids) and read_at is null
    and ((audience = 'manager' and is_manager()) or (audience = 'engineer' and recipient_id = auth.uid()));
end $$;

-- One call returns everything the signed-in staff member may see (row-level security applies: SECURITY INVOKER).
create or replace function public.staff_snapshot() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'me', (select to_jsonb(p) from profiles p where p.id = auth.uid()),
    'staff', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from profiles p), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(to_jsonb(r) - 'tracking_token_hash' order by r.created_at desc) from requests r), '[]'::jsonb),
    'attachments', coalesce((select jsonb_agg(to_jsonb(a)) from request_attachments a), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(to_jsonb(h) order by h.created_at) from status_history h), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(to_jsonb(s)) from service_reports s), '[]'::jsonb),
    'audit', coalesce((select jsonb_agg(jsonb_build_object('request_id', l.request_id, 'action', l.action, 'actor_name', l.actor_name, 'created_at', l.created_at, 'old', l.old_data, 'new', l.new_data) order by l.created_at) from report_audit_log l), '[]'::jsonb),
    'feedback', coalesce((select jsonb_agg(to_jsonb(f) - 'token_hash') from feedback f), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from (select * from notifications order by created_at desc limit 300) n), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------
-- 8. Function permissions
-- ---------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.submit_request(jsonb), public.get_tracking(text), public.find_request(text, text),
  public.customer_accept(text), public.customer_change(text, date, text, text),
  public.get_feedback(text), public.submit_feedback(text, int, int, int, int, text)
  to anon, authenticated;
grant execute on function public.set_price_appointment(uuid, numeric, timestamptz), public.confirm_request(uuid),
  public.assign_request(uuid, uuid, text, boolean), public.set_priority(uuid, text), public.cancel_request(uuid, text),
  public.review_report(uuid), public.close_and_request_feedback(uuid), public.renew_feedback_link(uuid),
  public.renew_tracking_link(uuid), public.close_request(uuid), public.create_follow_up(uuid), public.delete_report(uuid),
  public.set_staff(uuid, text, boolean), public.update_staff_contact(uuid, text, text),
  public.tech_advance(uuid), public.save_report(uuid, jsonb), public.mark_notifications_read(uuid[]),
  public.staff_snapshot(), public.is_manager(), public.is_technician()
  to authenticated;

-- ---------------------------------------------------------------------
-- 9. File storage (private bucket, 20 MB per file)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 20971520, array['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- customers (no account) may only add new files under incoming/<random-id>/
create policy media_customer_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'media' and name ~ '^incoming/[0-9a-f-]{36}/[A-Za-z0-9._-]+$');
-- staff report photos under reports/<request id>/
create policy media_report_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and name ~ '^reports/[0-9a-f-]{36}/[A-Za-z0-9._-]+$' and (
    public.is_manager() or exists (select 1 from public.requests r where r.id::text = (storage.foldername(name))[2] and r.assigned_engineer_id = auth.uid() and public.is_technician())));
-- viewing: the manager sees everything; a technician sees files of requests assigned to him
create policy media_staff_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and (
    public.is_manager()
    or exists (select 1 from public.request_attachments a join public.requests r on r.id = a.request_id
               where a.storage_path = name and r.assigned_engineer_id = auth.uid() and public.is_technician())
    or (name like 'reports/%' and exists (select 1 from public.requests r where r.id::text = (storage.foldername(name))[2] and r.assigned_engineer_id = auth.uid() and public.is_technician()))));

-- ---------------------------------------------------------------------
-- 10. Realtime (screens update without reloading; row-level security applies)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.requests, public.notifications, public.service_reports, public.profiles, public.feedback;

-- ---------------------------------------------------------------------
-- 11. Hardening
-- ---------------------------------------------------------------------
alter function public.normalize_phone(text) set search_path = public;
alter function public.fmt_appt(timestamptz) set search_path = public;
alter function public.label_service(text) set search_path = public;
alter function public.label_outcome(text) set search_path = public;
alter function public.label_slot(text) set search_path = public;
alter function public.touch_updated_at() set search_path = public;
revoke execute on function public.is_manager(), public.is_technician() from anon;
comment on table public.request_counters is 'Internal counter for request numbers. No direct access: only next_request_no() (security definer) writes it.';

-- ---------------------------------------------------------------------
-- 12. Rating from the tracking page (customer already holds the tracking link)
-- ---------------------------------------------------------------------
create or replace function public.feedback_token_from_tracking(p_token text) returns text
language plpgsql security definer set search_path = public as $$
declare r requests; v_token text := new_token();
begin
  r := request_by_token(p_token);
  if r.id is null then return null; end if;
  update feedback set token_hash = hash_token(v_token) where request_id = r.id and submitted_at is null;
  if not found then return null; end if;
  return v_token;
end $$;
revoke execute on function public.feedback_token_from_tracking(text) from public;
grant execute on function public.feedback_token_from_tracking(text) to anon, authenticated;
