-- Harga pendiri: SATU aturan di server untuk semua pintu masuk (12 Nov 2026, disetujui Ferdi).
--
-- Dulu harga pendiri disimpan di landing page (landing_pages.extra.promo) dan hanya berlaku kalau
-- pesanan membawa tanda landing page + browser mengirim angka harga pendiri. Pembeli dari katalog /
-- halaman produk / setelah login ditagih harga normal. Sekarang:
--  * Pengaturan disimpan di produk: products.pricing_tiers = {founderPrice, founderSlots, endsAt}.
--  * founder_promo_state(produk) = satu-satunya hitungan (harga normal, harga pendiri, slot, sisa, aktif).
--  * product_pricing() = dibaca SEMUA halaman (katalog, produk, landing page, keranjang, checkout).
--  * orders_before_insert memakai fungsi yang sama untuk semua pesanan (tanpa melihat asal pembeli).
--  * Slot terpakai = terjual (products.sold) + pesanan harga pendiri yang masih menunggu bayar (<=24 jam)
--    -- sama seperti sebelumnya. Satu akun = satu slot (kelas digital tidak bisa dibeli dua kali).
--  * Promo berakhir pada yang lebih dulu: slot habis ATAU tanggal endsAt (YYYY-MM-DD, 23:59 WIB) lewat.
--  * Kupon TIDAK bisa digabung dengan harga pendiri (keputusan Ferdi). Setelah slot habis kupon berlaku lagi.
--  * Kalau harga di server LEBIH TINGGI dari yang dilihat pembeli (mis. slot habis saat di checkout),
--    pesanan ditolak dengan kode GS001 supaya pembeli menyetujui harga baru dulu (tidak ditagih diam-diam).
--  * Metode pembayaran yang dinonaktifkan admin tidak bisa dipakai membuat pesanan (saklar Midtrans).

create or replace function public.founder_promo_state(p products)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  t jsonb := p.pricing_tiers;
  v_fp integer;
  v_slots integer;
  v_ends text;
  v_taken integer;
  v_expired boolean := false;
begin
  if t is null or jsonb_typeof(t) <> 'object' or p.product_type is distinct from 'digital' then
    return null;
  end if;
  if not ((t->>'founderPrice') ~ '^\d+(\.\d+)?$' and (t->>'founderSlots') ~ '^\d+(\.\d+)?$') then
    return null;
  end if;
  v_fp := (t->>'founderPrice')::numeric::integer;
  v_slots := (t->>'founderSlots')::numeric::integer;
  if v_fp <= 0 or v_slots <= 0 or v_fp >= coalesce(p.price, 0) then
    return null;
  end if;
  v_ends := nullif(trim(coalesce(t->>'endsAt', '')), '');
  if v_ends ~ '^\d{4}-\d{2}-\d{2}$' and now() > (v_ends || ' 23:59:59+07')::timestamptz then
    v_expired := true;
  end if;
  select coalesce(p.sold, 0) + count(*) into v_taken from orders o
   where o.payment = 'Pending' and o.created_at > now() - interval '24 hours'
     and (o.items @> jsonb_build_array(jsonb_build_object('id', p.id, 'founder', true))
          or o.items @> jsonb_build_array(jsonb_build_object('id', p.id, 'price', v_fp)));
  return jsonb_build_object(
    'list_price', p.price,
    'founder_price', v_fp,
    'slots', v_slots,
    'taken', v_taken,
    'left', greatest(v_slots - v_taken, 0),
    'ends_at', coalesce(v_ends, ''),
    'active', (not v_expired) and v_taken < v_slots);
end;
$$;
revoke all on function public.founder_promo_state(products) from public, anon, authenticated;

-- Dibaca semua halaman (juga pengunjung yang belum login). Hanya produk yang punya pengaturan harga pendiri.
create or replace function public.product_pricing()
returns table(product_id bigint, list_price integer, price integer, founder_price integer,
              founder_slots integer, founder_left integer, founder_active boolean, ends_at text)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  r products%rowtype;
  s jsonb;
begin
  for r in select * from products where status in ('published', 'soon') and pricing_tiers is not null loop
    s := public.founder_promo_state(r);
    if s is null then continue; end if;
    product_id := r.id;
    list_price := (s->>'list_price')::integer;
    founder_price := (s->>'founder_price')::integer;
    founder_slots := (s->>'slots')::integer;
    founder_left := (s->>'left')::integer;
    founder_active := (s->>'active')::boolean;
    price := case when founder_active then founder_price else list_price end;
    ends_at := s->>'ends_at';
    return next;
  end loop;
end;
$$;
revoke all on function public.product_pricing() from public;
grant execute on function public.product_pricing() to anon, authenticated;

-- Kupon: tahu isi keranjang supaya bisa menolak penggabungan dengan harga pendiri.
drop function if exists public.validate_coupon(text, integer);
create or replace function public.validate_coupon(p_code text, p_subtotal integer, p_product_ids bigint[] default null)
returns table(ok boolean, error text, code text, discount integer, coupon_type text, coupon_value integer, min_purchase integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_coupon coupons%rowtype;
begin
  if p_product_ids is not null and exists (
       select 1 from products pr where pr.id = any(p_product_ids)
          and coalesce((public.founder_promo_state(pr)->>'active')::boolean, false)) then
    return query select false, 'Kupon tidak bisa digabung dengan harga pendiri. Kamu sudah dapat harga terendah.'::text,
      null::text, 0, null::text, null::integer, null::integer;
    return;
  end if;
  select * into v_coupon from coupons c where upper(c.code) = upper(trim(p_code));
  if not found then
    return query select false, 'Kode kupon tidak valid.'::text, null::text, 0, null::text, null::integer, null::integer;
    return;
  end if;
  if v_coupon.expiry ~ '^\d{4}-\d{2}-\d{2}$' and v_coupon.expiry::date < current_date then
    return query select false, 'Kupon sudah kedaluwarsa.'::text, null::text, 0, null::text, null::integer, null::integer;
    return;
  end if;
  if coalesce(v_coupon.usage_limit, 0) > 0
     and greatest(coalesce(v_coupon.used, 0), public.coupon_reserved_count(v_coupon.code)) >= v_coupon.usage_limit then
    return query select false, 'Kupon sudah mencapai batas penggunaan.'::text, null::text, 0, null::text, null::integer, null::integer;
    return;
  end if;
  if coalesce(p_subtotal, 0) < coalesce(v_coupon.min_purchase, 0) then
    return query select false, format('Minimum belanja untuk kupon ini Rp%s.', replace(to_char(v_coupon.min_purchase, 'FM999,999,999'), ',', '.')), null::text, 0, null::text, null::integer, null::integer;
    return;
  end if;
  return query select true, null::text, v_coupon.code,
    case when v_coupon.type = 'percent' then round(coalesce(p_subtotal, 0) * v_coupon.value / 100.0)::integer
         else least(v_coupon.value, coalesce(p_subtotal, 0)) end,
    v_coupon.type, v_coupon.value, coalesce(v_coupon.min_purchase, 0);
end;
$function$;
revoke all on function public.validate_coupon(text, integer, bigint[]) from public, anon;
grant execute on function public.validate_coupon(text, integer, bigint[]) to authenticated;

create or replace function public.orders_before_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_item jsonb;
  v_prod products%rowtype;
  v_state jsonb;
  v_founder boolean;
  v_any_founder boolean := false;
  v_price integer;
  v_qty integer;
  v_variant text;
  v_vrow jsonb;
  v_avail integer;
  v_key text;
  v_keys text[] := '{}';
  v_items jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_coupon coupons%rowtype;
  v_email text;
  v_has_physical boolean := false;
  v_ship jsonb;
  v_fee integer := 0;
  v_free integer;
  v_addr jsonb;
begin
  if jsonb_typeof(new.items) is distinct from 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'Keranjang kosong.';
  end if;

  -- Saklar metode pembayaran (mis. Midtrans dimatikan selama masih sandbox).
  if new.payment_method_id is not null
     and not exists (select 1 from payment_methods m where m.id = new.payment_method_id and m.enabled) then
    raise exception 'Metode pembayaran ini sedang tidak tersedia. Silakan pilih Transfer Bank.';
  end if;

  for v_item in select value from jsonb_array_elements(new.items) loop
    -- FOR UPDATE: pesanan bersamaan untuk produk yang sama diproses bergantian (stok & slot pendiri).
    select * into v_prod from products where id = nullif(v_item->>'id', '')::bigint for update;
    if not found or v_prod.status = 'archived' then
      raise exception 'Produk tidak tersedia lagi. Muat ulang halaman lalu coba lagi.';
    end if;

    v_variant := nullif(trim(coalesce(v_item->>'variant', '')), '');
    v_qty := case when (v_item->>'qty') ~ '^\d+$' then (v_item->>'qty')::integer else 1 end;
    v_qty := greatest(1, least(v_qty, 99));
    v_founder := false;

    if v_prod.product_type = 'physical' then
      v_has_physical := true;
      if jsonb_array_length(coalesce(v_prod.variants, '[]'::jsonb)) > 0 then
        v_vrow := null;
        select e into v_vrow from jsonb_array_elements(v_prod.variants) e where e->>'name' = v_variant limit 1;
        if v_vrow is null then
          raise exception 'Pilih varian untuk "%".', v_prod.name;
        end if;
        v_avail := case when (v_vrow->>'stock') ~ '^\d+$' then (v_vrow->>'stock')::integer end;
      else
        v_variant := null;
        v_avail := v_prod.stock;
      end if;
      if v_avail is not null and v_avail < v_qty then
        raise exception 'Stok "%"% tidak cukup (tersisa %).', v_prod.name,
          coalesce(' (' || v_variant || ')', ''), greatest(v_avail, 0);
      end if;
      v_key := v_prod.id || '|' || coalesce(v_variant, '');
      if v_key = any(v_keys) then continue; end if;
      v_keys := v_keys || v_key;
      v_price := v_prod.price;
    else
      v_qty := 1;
      v_variant := null;
      v_key := v_prod.id || '|';
      if v_key = any(v_keys) then continue; end if;
      v_keys := v_keys || v_key;
      if v_prod.fertune_days is null and exists (select 1 from orders o
                 where o.customer_id = new.customer_id and o.payment = 'PAID'
                   and o.items @> jsonb_build_array(jsonb_build_object('id', v_prod.id))) then
        raise exception 'Kamu sudah memiliki produk "%".', v_prod.name;
      end if;
      if exists (select 1 from orders o
                 where o.customer_id = new.customer_id and o.payment = 'Pending'
                   and o.items @> jsonb_build_array(jsonb_build_object('id', v_prod.id))) then
        raise exception 'Masih ada pesanan "%" yang menunggu pembayaran. Selesaikan atau batalkan dulu di menu Pesanan.', v_prod.name;
      end if;

      -- Harga pendiri: aturan yang sama untuk semua pembeli & semua pintu masuk.
      v_price := v_prod.price;
      v_state := public.founder_promo_state(v_prod);
      if v_state is not null and (v_state->>'active')::boolean then
        v_price := (v_state->>'founder_price')::integer;
        v_founder := true;
        v_any_founder := true;
      end if;
    end if;

    -- Harga naik dibanding yang dilihat pembeli (slot pendiri habis saat checkout) -> minta persetujuan dulu.
    if (v_item->>'price') ~ '^\d+(\.\d+)?$' and v_price > (v_item->>'price')::numeric then
      raise exception using errcode = 'GS001',
        message = format('Harga pendiri untuk "%s" sudah habis. Harga sekarang Rp%s.', v_prod.name,
                         replace(to_char(v_price, 'FM999,999,999'), ',', '.')),
        detail = jsonb_build_object('id', v_prod.id, 'price', v_price)::text;
    end if;

    v_items := v_items || jsonb_build_array(
      jsonb_build_object('id', v_prod.id,
                         'name', v_prod.name || coalesce(' (' || v_variant || ')', ''),
                         'price', v_price, 'qty', v_qty, 'type', v_prod.product_type)
      || case when v_founder then jsonb_build_object('founder', true, 'list_price', v_prod.price) else '{}'::jsonb end
      || case when v_prod.fertune_days is not null then jsonb_build_object('fertune_days', v_prod.fertune_days) else '{}'::jsonb end
      || case when v_variant is not null then jsonb_build_object('variant', v_variant) else '{}'::jsonb end
      || case when nullif(v_item->>'lp', '') is not null and v_prod.product_type = 'digital'
              then jsonb_build_object('lp', left(v_item->>'lp', 80)) else '{}'::jsonb end);
    v_subtotal := v_subtotal + v_price * v_qty;
  end loop;

  if nullif(trim(coalesce(new.coupon_code, '')), '') is not null then
    if v_any_founder then
      raise exception 'Kupon tidak bisa digabung dengan harga pendiri. Kamu sudah dapat harga terendah.';
    end if;
    select * into v_coupon from coupons c where upper(c.code) = upper(trim(new.coupon_code)) for update;
    if not found then
      raise exception 'Kode kupon tidak valid.';
    end if;
    if v_coupon.expiry ~ '^\d{4}-\d{2}-\d{2}$' and v_coupon.expiry::date < current_date then
      raise exception 'Kupon sudah kedaluwarsa.';
    end if;
    if coalesce(v_coupon.usage_limit, 0) > 0
       and greatest(coalesce(v_coupon.used, 0), public.coupon_reserved_count(v_coupon.code)) >= v_coupon.usage_limit then
      raise exception 'Kupon sudah mencapai batas penggunaan.';
    end if;
    if v_subtotal < coalesce(v_coupon.min_purchase, 0) then
      raise exception 'Minimum belanja untuk kupon % belum terpenuhi.', v_coupon.code;
    end if;
    v_discount := case when v_coupon.type = 'percent' then round(v_subtotal * least(greatest(v_coupon.value, 0), 100) / 100.0)::integer
                       else least(greatest(v_coupon.value, 0), v_subtotal) end;
    new.coupon_code := v_coupon.code;
  else
    new.coupon_code := null;
  end if;

  if v_has_physical then
    v_addr := new.shipping_address;
    if v_addr is null
       or nullif(trim(coalesce(v_addr->>'name', '')), '') is null
       or nullif(trim(coalesce(v_addr->>'phone', '')), '') is null
       or nullif(trim(coalesce(v_addr->>'address', '')), '') is null
       or nullif(trim(coalesce(v_addr->>'city', '')), '') is null then
      raise exception 'Lengkapi alamat pengiriman (nama, nomor HP, alamat, kota).';
    end if;
    new.shipping_address := jsonb_build_object(
      'name', left(v_addr->>'name', 120), 'phone', left(v_addr->>'phone', 30),
      'address', left(v_addr->>'address', 500), 'city', left(v_addr->>'city', 120),
      'province', left(coalesce(v_addr->>'province', ''), 120), 'postal', left(coalesce(v_addr->>'postal', ''), 10),
      'note', left(coalesce(v_addr->>'note', ''), 300));
    select content->'shipping' into v_ship from site_content where id = 1;
    v_fee := case when (v_ship->>'flatFee') ~ '^\d+$' then (v_ship->>'flatFee')::integer else 0 end;
    v_free := case when (v_ship->>'freeAbove') ~ '^\d+$' then (v_ship->>'freeAbove')::integer end;
    if v_free is not null and v_free > 0 and (v_subtotal - v_discount) >= v_free then
      v_fee := 0;
    end if;
  else
    new.shipping_address := null;
    v_fee := 0;
  end if;

  select email into v_email from profiles where id = new.customer_id;

  new.items := v_items;
  new.subtotal := v_subtotal;
  new.discount := v_discount;
  new.shipping_fee := v_fee;
  new.total := greatest(v_subtotal - v_discount, 0) + v_fee;
  new.payment := 'Pending';
  new.status := 'Menunggu Pembayaran';
  new.fulfillment_status := null;
  new.tracking_number := null;
  new.customer_email := coalesce(v_email, new.customer_email);
  new.proof_image_url := null;
  new.proof_note := null;
  new.proof_submitted_at := null;
  new.stats_counted := false;
  new.created_at := now();
  return new;
end;
$function$;

-- Pengaturan harga pendiri Secret Of Shredding dipindah dari landing page ke produk (disetujui Ferdi).
update public.products
   set pricing_tiers = jsonb_build_object('founderPrice', 247000, 'founderSlots', 100, 'endsAt', '')
 where slug = 'secret-of-shredding' and pricing_tiers is null;
