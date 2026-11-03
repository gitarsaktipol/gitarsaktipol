-- Pengaman kupon & harga pendiri (audit 3 Nov 2026, disetujui Ferdi).
-- 1. Batas pemakaian kupon & slot harga pendiri ikut menghitung pesanan yang MASIH MENUNGGU
--    BAYAR (maks 24 jam terakhir), bukan hanya yang sudah lunas. Pesanan dikunci per kupon/produk
--    (FOR UPDATE) supaya pesanan yang masuk bersamaan tidak lolos bareng.
-- 2. Aturan isian kupon: nilai > 0, persen maks 100, minimum belanja & kuota tidak minus.
-- 3. "Terjual", stok & pemakaian kupon hanya ditambah SEKALI per pesanan (kolom stats_counted),
--    walau admin mengubah status Lunas -> Menunggu -> Lunas lagi.

-- ---------- 3. penanda sudah dihitung ----------
alter table public.orders add column if not exists stats_counted boolean not null default false;
update public.orders set stats_counted = true where payment = 'PAID' and not stats_counted;

-- ---------- 2. aturan isian kupon ----------
alter table public.coupons drop constraint if exists coupons_value_check;
alter table public.coupons add constraint coupons_value_check
  check (value > 0 and (type <> 'percent' or value <= 100));
alter table public.coupons drop constraint if exists coupons_nonneg_check;
alter table public.coupons add constraint coupons_nonneg_check
  check (coalesce(min_purchase, 0) >= 0 and coalesce(usage_limit, 0) >= 0);

-- ---------- 1. hitungan pemakaian kupon (lunas + menunggu bayar ≤24 jam) ----------
create or replace function public.coupon_reserved_count(p_code text)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select count(*)::integer from orders o
   where upper(o.coupon_code) = upper(p_code)
     and (o.payment = 'PAID' or (o.payment = 'Pending' and o.created_at > now() - interval '24 hours'));
$$;
revoke all on function public.coupon_reserved_count(text) from public, anon, authenticated;

create or replace function public.validate_coupon(p_code text, p_subtotal integer)
 returns table(ok boolean, error text, code text, discount integer, coupon_type text, coupon_value integer, min_purchase integer)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_coupon coupons%rowtype;
begin
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
    return query select false, format('Minimum belanja untuk kupon ini Rp%s.', to_char(v_coupon.min_purchase, 'FM999G999G999')), null::text, 0, null::text, null::integer, null::integer;
    return;
  end if;
  return query select true, null::text, v_coupon.code,
    case when v_coupon.type = 'percent' then round(coalesce(p_subtotal, 0) * v_coupon.value / 100.0)::integer
         else least(v_coupon.value, coalesce(p_subtotal, 0)) end,
    v_coupon.type, v_coupon.value, coalesce(v_coupon.min_purchase, 0);
end;
$function$;

create or replace function public.orders_before_insert()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_item jsonb;
  v_prod products%rowtype;
  v_lp landing_pages%rowtype;
  v_promo jsonb;
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
  v_founder_taken integer;
begin
  if jsonb_typeof(new.items) is distinct from 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'Keranjang kosong.';
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
      if exists (select 1 from orders o
                 where o.customer_id = new.customer_id and o.payment = 'PAID'
                   and o.items @> jsonb_build_array(jsonb_build_object('id', v_prod.id))) then
        raise exception 'Kamu sudah memiliki produk "%".', v_prod.name;
      end if;
      if exists (select 1 from orders o
                 where o.customer_id = new.customer_id and o.payment = 'Pending'
                   and o.items @> jsonb_build_array(jsonb_build_object('id', v_prod.id))) then
        raise exception 'Masih ada pesanan "%" yang menunggu pembayaran. Selesaikan atau batalkan dulu di menu Pesanan.', v_prod.name;
      end if;

      v_price := v_prod.price;
      if nullif(v_item->>'lp', '') is not null then
        select * into v_lp from landing_pages
          where slug = v_item->>'lp' and product_id = v_prod.id and status = 'published';
        if found then
          v_promo := coalesce(
            v_lp.extra->'promo',
            case when v_prod.pricing_tiers is not null then
              jsonb_build_object('enabled', true,
                                 'founderPrice', v_prod.pricing_tiers->'founderPrice',
                                 'founderSlots', v_prod.pricing_tiers->'founderSlots')
            end);
          if v_promo is not null
             and coalesce((v_promo->>'enabled')::boolean, false)
             and (v_promo->>'founderPrice') ~ '^\d+(\.\d+)?$'
             and (v_promo->>'founderSlots') ~ '^\d+(\.\d+)?$'
             and (v_item->>'price') ~ '^\d+(\.\d+)?$'
             and (v_item->>'price')::numeric = (v_promo->>'founderPrice')::numeric then
            -- Slot terpakai = sudah terjual + pesanan harga pendiri yang masih menunggu bayar (≤24 jam).
            select coalesce(v_prod.sold, 0) + count(*) into v_founder_taken from orders o
             where o.payment = 'Pending' and o.created_at > now() - interval '24 hours'
               and o.items @> jsonb_build_array(jsonb_build_object('id', v_prod.id,
                     'price', (v_promo->>'founderPrice')::numeric::integer));
            if v_founder_taken < (v_promo->>'founderSlots')::numeric then
              v_price := (v_promo->>'founderPrice')::numeric::integer;
            end if;
          end if;
        end if;
      end if;
    end if;

    v_items := v_items || jsonb_build_array(
      jsonb_build_object('id', v_prod.id,
                         'name', v_prod.name || coalesce(' (' || v_variant || ')', ''),
                         'price', v_price, 'qty', v_qty, 'type', v_prod.product_type)
      || case when v_variant is not null then jsonb_build_object('variant', v_variant) else '{}'::jsonb end
      || case when nullif(v_item->>'lp', '') is not null and v_prod.product_type = 'digital'
              then jsonb_build_object('lp', v_item->>'lp') else '{}'::jsonb end);
    v_subtotal := v_subtotal + v_price * v_qty;
  end loop;

  if nullif(trim(coalesce(new.coupon_code, '')), '') is not null then
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

-- ---------- 3. hitungan terjual/stok/kupon sekali saja ----------
create or replace function public.order_count_stats(p_order_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order orders%rowtype;
  v_item jsonb;
  v_qty integer;
  v_has_physical boolean := false;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found or v_order.stats_counted then
    return;
  end if;
  for v_item in select value from jsonb_array_elements(v_order.items) loop
    v_qty := case when (v_item->>'qty') ~ '^\d+$' then (v_item->>'qty')::integer else 1 end;
    update products set sold = coalesce(sold, 0) + v_qty where id = (v_item->>'id')::bigint;
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
revoke all on function public.order_count_stats(text) from public, anon, authenticated;

create or replace function public.admin_update_order_status(p_order_id text, p_payment text, p_status text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_order orders%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Hanya admin yang boleh mengubah status pesanan.';
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  update orders set payment = p_payment, status = p_status where id = p_order_id;

  if p_payment = 'PAID' then
    perform public.order_count_stats(p_order_id);
  end if;
end;
$function$;

create or replace function public.system_mark_order_paid(p_order_id text, p_via text)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_order orders%rowtype;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;
  if v_order.payment = 'PAID' then
    return false;
  end if;

  update orders
     set payment = 'PAID', status = 'Selesai', paid_via = left(coalesce(p_via, ''), 60),
         method = 'Midtrans' || coalesce(' (' || nullif(left(p_via, 40), '') || ')', '')
   where id = p_order_id;

  perform public.order_count_stats(p_order_id);
  return true;
end;
$function$;
revoke all on function public.system_mark_order_paid(text, text) from public, anon, authenticated;
