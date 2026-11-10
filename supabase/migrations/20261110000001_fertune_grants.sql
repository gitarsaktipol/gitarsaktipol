-- FerTune: Premium lewat akun (tanpa pembelian Google Play).
-- Dipakai untuk akun uji peninjau Google Play, akun Ferdi, atau hadiah. Diisi admin (SQL / service role).
-- Aplikasi FerTune membaca baris milik email akun yang sedang login (RLS) dan menganggapnya Premium
-- selama `until` kosong atau belum lewat.
create table if not exists public.fertune_grants (
  email text primary key check (email = lower(email)),
  until timestamptz,
  note text,
  created_at timestamptz not null default now()
);
alter table public.fertune_grants enable row level security;

create policy "fertune_grants_select_own" on public.fertune_grants
  for select to authenticated
  using (email = lower((select auth.jwt() ->> 'email')) and (until is null or until > now()));

create policy "fertune_grants_admin_all" on public.fertune_grants
  for all to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

revoke all on public.fertune_grants from anon;

-- Akun uji untuk peninjau Google Play (alias Gmail; email verifikasi masuk ke kotak gitarsaktipol@gmail.com).
insert into public.fertune_grants (email, until, note)
values ('gitarsaktipol+review@gmail.com', null, 'Akun uji peninjau Google Play')
on conflict (email) do nothing;
