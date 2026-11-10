-- FerTune Premium lewat WEB (paket sekali bayar) + Premium menempel di AKUN (Nov 2026, diputuskan Ferdi).
--  * products.fertune_days: produk "FerTune Premium" (30 = 1 bulan, 365 = 1 tahun). Boleh dibeli berulang (perpanjang).
--  * Pesanan lunas (order_count_stats, sekali per pesanan) menambah masa Premium akun pembeli di fertune_grants
--    dan mencatat fertune_purchases (source 'web').
--  * Langganan Google Play yang dibeli sambil masuk akun ikut dicatat ke akun (fertune_play_grant, dipanggil
--    Edge Function fertune-play-verify). Satu langganan Play hanya untuk SATU akun (fertune_play_links).

alter table public.products add column if not exists fertune_days integer
  check (fertune_days is null or fertune_days between 1 and 3660);

-- Tambah masa Premium: mulai dari yang lebih akhir antara "sekarang" dan masa yang masih berjalan.
create or replace function public.fertune_extend_grant(p_email text, p_days integer, p_note text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if p_email is null or p_days is null or p_days < 1 then return; end if;
  insert into fertune_grants (email, until, note)
  values (lower(p_email), now() + make_interval(days => p_days), left(p_note, 200))
  on conflict (email) do update
    set until = case when fertune_grants.until is null then null
                     else greatest(fertune_grants.until, now()) + make_interval(days => p_days) end,
        note = left(excluded.note, 200);
end $$;
revoke all on function public.fertune_extend_grant(text, integer, text) from public, anon, authenticated;

-- Satu langganan Google Play = satu akun.
create table if not exists public.fertune_play_links (
  token_hash text primary key,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.fertune_play_links enable row level security;
revoke all on public.fertune_play_links from anon, authenticated;

-- Dipanggil Edge Function (service_role): langganan Play aktif sampai p_until → akun ikut Premium sampai saat itu.
-- Mengembalikan false bila langganan itu sudah terikat ke akun lain.
create or replace function public.fertune_play_grant(p_token_hash text, p_email text, p_until timestamptz)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_email text;
begin
  if p_token_hash is null or p_email is null or p_until is null then return false; end if;
  insert into fertune_play_links (token_hash, email) values (p_token_hash, lower(p_email))
  on conflict (token_hash) do nothing;
  select email into v_email from fertune_play_links where token_hash = p_token_hash;
  if v_email is distinct from lower(p_email) then return false; end if;
  insert into fertune_grants (email, until, note) values (lower(p_email), p_until, 'Langganan Google Play')
  on conflict (email) do update
    set until = case when fertune_grants.until is null then null else greatest(fertune_grants.until, excluded.until) end;
  return true;
end $$;
revoke all on function public.fertune_play_grant(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.fertune_play_grant(text, text, timestamptz) to service_role;

-- orders_before_insert: produk FerTune boleh dibeli lagi walau pernah lunas (perpanjang), dan jumlah harinya
-- ikut dicatat di item pesanan. Fungsi lama ditambal di tempat (isi lainnya tidak diubah).
do $do$
declare d text; d2 text;
begin
  select pg_get_functiondef('public.orders_before_insert()'::regprocedure) into d;
  if position('fertune_days' in d) > 0 then return; end if;
  d2 := regexp_replace(d,
    'if exists \(select 1 from orders o(\s+)where o\.customer_id = new\.customer_id and o\.payment = ''PAID''',
    'if v_prod.fertune_days is null and exists (select 1 from orders o\1where o.customer_id = new.customer_id and o.payment = ''PAID''');
  if d2 = d then raise exception 'tambalan 1 orders_before_insert gagal'; end if;
  d := d2;
  d2 := replace(d,
    '''qty'', v_qty, ''type'', v_prod.product_type)',
    '''qty'', v_qty, ''type'', v_prod.product_type)
      || case when v_prod.fertune_days is not null then jsonb_build_object(''fertune_days'', v_prod.fertune_days) else ''{}''::jsonb end');
  if d2 = d then raise exception 'tambalan 2 orders_before_insert gagal'; end if;
  execute d2;
end $do$;

-- order_count_stats: sama seperti sebelumnya + masa Premium FerTune.
create or replace function public.order_count_stats(p_order_id text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_order orders%rowtype;
  v_item jsonb;
  v_qty integer;
  v_has_physical boolean := false;
  v_email text;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found or v_order.stats_counted then
    return;
  end if;
  for v_item in select value from jsonb_array_elements(v_order.items) loop
    v_qty := case when (v_item->>'qty') ~ '^\d+$' then (v_item->>'qty')::integer else 1 end;
    update products set sold = coalesce(sold, 0) + v_qty where id = (v_item->>'id')::bigint;
    if (v_item->>'fertune_days') ~ '^\d+$' then
      select lower(u.email) into v_email from auth.users u where u.id = v_order.customer_id;
      v_email := coalesce(v_email, lower(v_order.customer_email));
      perform public.fertune_extend_grant(v_email, (v_item->>'fertune_days')::integer, 'Beli di web, pesanan ' || v_order.id);
      insert into fertune_purchases (user_id, source, product, amount, status, ref)
      values (v_order.customer_id, 'web', left(coalesce(v_item->>'name', 'FerTune Premium'), 120),
              greatest(coalesce((v_item->>'price')::integer, 0), 0), 'paid', v_order.id || '-' || (v_item->>'id'))
      on conflict (ref) do nothing;
    end if;
    if coalesce(v_item->>'type', 'digital') = 'physical' then
      v_has_physical := true;
      if nullif(v_item->>'variant', '') is not null then
        update products set variants = (
          select coalesce(jsonb_agg(
            case when e->>'name' = v_item->>'variant' and (e->>'stock') ~ '^\d+$'
                 then jsonb_set(e, '{stock}', to_jsonb(greatest((e->>'stock')::integer - v_qty, 0)))
                 else e end order by ord), '[]'::jsonb)
          from jsonb_array_elements(variants) with ordinality as t(e, ord))
        where id = (v_item->>'id')::bigint;
      else
        update products set stock = greatest(stock - v_qty, 0)
        where id = (v_item->>'id')::bigint and stock is not null;
      end if;
    end if;
  end loop;
  if v_order.coupon_code is not null then
    update coupons set used = coalesce(used, 0) + 1 where code = v_order.coupon_code;
  end if;
  update orders set stats_counted = true,
         fulfillment_status = case when v_has_physical then coalesce(fulfillment_status, 'Dikemas') else fulfillment_status end
   where id = p_order_id;
end;
$function$;

-- Masa peralihan: akun yang sudah terdaftar sebelum web dikunci mendapat Premium 30 hari; admin selamanya.
insert into public.fertune_grants (email, until, note)
select lower(u.email), now() + interval '30 days', 'Masa peralihan web (Nov 2026)'
from auth.users u where u.email is not null
on conflict (email) do nothing;
insert into public.fertune_grants (email, until, note)
select lower(u.email), null, 'Admin'
from auth.users u join public.profiles p on p.id = u.id where p.role = 'admin' and u.email is not null
on conflict (email) do update set until = null, note = 'Admin';

-- Produk di toko (draft dulu; dipublikasikan setelah website versi baru tayang).
insert into public.products (slug, name, category, level, price, old_price, badge, duration, format, hue, description, benefits, learn_points, bonus, status, sort_order, product_type, fertune_days)
select v.slug, v.name, 'Aplikasi FerTune', 'Semua level', v.price, v.old_price, 'New', v.duration, 'Aplikasi (web & Android)', '#FF6FA8', v.description,
       '["Semua 234 level Arcade (huruf A sampai Z)","Latihan baca not di semua tangga nada, Custom, dan dari partiturmu sendiri","Menulis partitur tanpa batas: akor, lirik, tablatur gitar, piano 2 tangan","Rekam dari keyboard MIDI, impor MIDI / MusicXML / lagu","Ekspor PDF, gambar, dan MIDI","Partitur tersimpan di akunmu, bisa dibuka di HP dan laptop"]'::jsonb,
       '[]'::jsonb, '', 'draft', v.sort_order, 'digital', v.days
from (values
  ('fertune-premium-1-bulan', 'FerTune Premium 1 Bulan', 45000, 99000, '30 hari', 10, 30,
   'FerTune adalah teman latihan musikmu: tuner, latihan baca not sambil memainkan alat musik asli, Arcade 234 level, dan penulis partitur. Paket ini membuka semua fitur Premium selama 30 hari untuk akunmu, di web fertune.gitarsakti.com maupun di aplikasi Android. Sekali bayar, tidak diperpanjang otomatis. Beli lagi sebelum habis, masa aktifmu ditambah.'),
  ('fertune-premium-1-tahun', 'FerTune Premium 1 Tahun', 350000, 999000, '365 hari', 11, 365,
   'FerTune adalah teman latihan musikmu: tuner, latihan baca not sambil memainkan alat musik asli, Arcade 234 level, dan penulis partitur. Paket ini membuka semua fitur Premium selama 365 hari untuk akunmu, di web fertune.gitarsakti.com maupun di aplikasi Android. Sekali bayar, tidak diperpanjang otomatis. Beli lagi sebelum habis, masa aktifmu ditambah.')
) as v(slug, name, price, old_price, duration, sort_order, days, description)
where not exists (select 1 from public.products p where p.slug = v.slug);
