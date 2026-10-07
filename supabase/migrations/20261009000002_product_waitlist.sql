-- Daftar tunggu "Beri tahu saya" untuk kelas berstatus Segera Hadir.
create table if not exists public.product_waitlist (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 200),
  created_at timestamptz not null default now()
);
create unique index if not exists product_waitlist_uniq on public.product_waitlist (product_id, lower(email));
alter table public.product_waitlist enable row level security;

create policy product_waitlist_insert on public.product_waitlist
  for insert to anon, authenticated
  with check (exists (select 1 from public.products p where p.id = product_id and p.status = 'soon'));
create policy product_waitlist_admin_select on public.product_waitlist
  for select using (is_admin((select auth.uid())));
create policy product_waitlist_admin_delete on public.product_waitlist
  for delete using (is_admin((select auth.uid())));
