-- FerTune: umpan balik saat hapus akun + catatan pembelian per sumber (Play Store / Web).
-- Keduanya hanya bisa DIBACA admin. Umpan balik ditulis lewat fungsi submit_fertune_feedback
-- (tanpa menyimpan siapa penulisnya -> anonim). Pembelian hanya ditulis oleh Edge Function
-- (service_role) saat integrasi pembayaran FerTune sudah dipasang.

create table if not exists public.fertune_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reason text not null,
  note text,
  source text not null default 'web' check (source in ('web', 'playstore'))
);
alter table public.fertune_feedback enable row level security;
create policy "fertune_feedback_admin_select" on public.fertune_feedback
  for select to authenticated using (public.is_admin((select auth.uid())));
revoke insert, update, delete on public.fertune_feedback from anon, authenticated;

create or replace function public.submit_fertune_feedback(p_reason text, p_note text, p_source text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    raise exception 'Harus masuk dulu.';
  end if;
  if coalesce(trim(p_reason), '') = '' and coalesce(trim(p_note), '') = '' then
    return;  -- kosong: tidak ada yang disimpan
  end if;
  insert into fertune_feedback (reason, note, source)
  values (
    left(coalesce(nullif(trim(p_reason), ''), '(tidak memilih alasan)'), 120),
    nullif(left(trim(coalesce(p_note, '')), 500), ''),
    case when p_source = 'playstore' then 'playstore' else 'web' end
  );
end;
$$;
revoke all on function public.submit_fertune_feedback(text, text, text) from public, anon;
grant execute on function public.submit_fertune_feedback(text, text, text) to authenticated;

create table if not exists public.fertune_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  source text not null check (source in ('web', 'playstore')),
  product text not null default 'fertune',
  amount integer not null default 0 check (amount >= 0),
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  ref text unique,
  created_at timestamptz not null default now()
);
alter table public.fertune_purchases enable row level security;
create policy "fertune_purchases_admin_select" on public.fertune_purchases
  for select to authenticated using (public.is_admin((select auth.uid())));
revoke insert, update, delete on public.fertune_purchases from anon, authenticated;
create index if not exists fertune_purchases_source_idx on public.fertune_purchases (source, created_at);
