create extension if not exists pgcrypto;
create type tag_status as enum ('disponible','asignado','vendido','suspendido','defectuoso');
create table admins(user_id uuid primary key references auth.users on delete cascade);
create function is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from admins where user_id=auth.uid()) $$;
create function is_google_url(u text) returns boolean language sql immutable as $$
 select u ~* '^https://((www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?/(maps|search)|maps\.google\.[a-z]{2,3}(\.[a-z]{2})?|maps\.app\.goo\.gl|goo\.gl/maps|g\.page|g\.co/kgs|search\.google\.com/local)(/|\?|$)' and u !~ '\s' $$;
create table models(id uuid primary key default gen_random_uuid(), name text not null unique);
insert into models(name) values ('Cartel 15x10');
create table batches(id uuid primary key default gen_random_uuid(), batch_number serial unique, model_id uuid not null references models, quantity int not null check (quantity between 1 and 1000), notes text, created_by uuid, created_at timestamptz default now());
create table businesses(id uuid primary key default gen_random_uuid(), trade_name text not null, contact_name text, phone text, email text, address text, google_review_url text check (google_review_url is null or is_google_url(google_review_url)), notes text, created_at timestamptz default now());
create sequence tag_folio_seq;
create table tags(id uuid primary key default gen_random_uuid(),
 folio text not null unique default 'MG-'||lpad(nextval('tag_folio_seq')::text,6,'0'),
 public_code text not null unique check (public_code ~ '^[A-HJ-NP-Z2-9]{10}$'),
 model_id uuid not null references models, batch_id uuid references batches, manufactured_at date default current_date,
 status tag_status not null default 'disponible', business_id uuid references businesses,
 destination_url text check (destination_url is null or is_google_url(destination_url)),
 assigned_at timestamptz, notes text, created_at timestamptz default now(), updated_at timestamptz default now());
create index on tags(status); create index on tags(business_id); create index on tags(batch_id);
create table audit_log(id bigserial primary key, at timestamptz default now(), user_id uuid, action text not null, tag_id uuid references tags on delete set null, details jsonb);
create function tags_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.public_code<>old.public_code then raise exception 'public_code es inmutable'; end if;
 new.updated_at=now();
 if new.destination_url is distinct from old.destination_url then insert into audit_log(user_id,action,tag_id,details) values(auth.uid(),'url_changed',new.id,jsonb_build_object('from',old.destination_url,'to',new.destination_url)); end if;
 if new.business_id is distinct from old.business_id then insert into audit_log(user_id,action,tag_id,details) values(auth.uid(),'assigned',new.id,jsonb_build_object('business',new.business_id)); end if;
 if new.status is distinct from old.status then insert into audit_log(user_id,action,tag_id,details) values(auth.uid(), case when new.status='suspendido' then 'suspended' when old.status='suspendido' then 'reactivated' else 'status_changed' end,new.id,jsonb_build_object('from',old.status,'to',new.status)); end if;
 return new; end $$;
create trigger tags_guard before update on tags for each row execute function tags_guard();
create function create_batch(p_model uuid,p_qty int,p_notes text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare b uuid; n int:=0; c text; alpha text:='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
 if not is_admin() then raise exception 'forbidden'; end if;
 if p_qty<1 or p_qty>1000 then raise exception 'cantidad invalida'; end if;
 insert into batches(model_id,quantity,notes,created_by) values(p_model,p_qty,p_notes,auth.uid()) returning id into b;
 while n<p_qty loop
  select string_agg(substr(alpha,1+(get_byte(gen_random_bytes(1),0)%32),1),'') into c from generate_series(1,10);
  insert into tags(model_id,batch_id,public_code) values(p_model,b,c) on conflict (public_code) do nothing;
  if found then n:=n+1; end if;
 end loop;
 insert into audit_log(user_id,action,details) values(auth.uid(),'batch_created',jsonb_build_object('batch',b,'qty',p_qty));
 return b; end $$;
create function resolve_redirect(p_code text) returns table(status text,url text) language sql stable security definer set search_path=public as $$
 select t.status::text,t.destination_url from tags t where t.public_code=upper(p_code) limit 1 $$;
grant execute on function resolve_redirect(text) to anon,authenticated;
revoke execute on function create_batch(uuid,int,text) from anon;
do $$ declare t text; begin foreach t in array array['models','batches','businesses','tags','audit_log'] loop
 execute format('alter table %I enable row level security',t);
 execute format('create policy admin_all on %I for all using (is_admin()) with check (is_admin())',t); end loop; end $$;
alter table admins enable row level security;
create policy own on admins for select using (user_id=auth.uid());
-- Tras crear tu usuario en Auth:  insert into admins select id from auth.users where email='TU@CORREO';
