-- Istilah "harga pendiri" diganti "100 Pembeli Pertama" di pesan untuk pembeli (13 Nov 2026, diminta Ferdi).
-- HANYA kalimat pesan yang berubah; aturan harga, kupon & slot sama persis dengan migrasi 20261112000001.
-- Angka diambil dari jumlah slot di pengaturan promo (products.pricing_tiers.founderSlots).

create or replace function public.validate_coupon(p_code text, p_subtotal integer, p_product_ids bigint[] default null)
returns table(ok boolean, error text, code text, discount integer, coupon_type text, coupon_value integer, min_purchase integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_coupon coupons%rowtype;
  v_slots integer;
begin
  if p_product_ids is not null then
    select (x.s->>'slots')::integer into v_slots
      from products pr, lateral (select public.founder_promo_state(pr) s) x
     where pr.id = any(p_product_ids) and coalesce((x.s->>'active')::boolean, false)
     limit 1;
    if v_slots is not null then
      return query select false, format('Kupon tidak bisa digabung dengan harga %s Pembeli Pertama. Kamu sudah dapat harga terendah.', v_slots),
        null::text, 0, null::text, null::integer, null::integer;
      return;
    end if;
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
  v_slots integer;
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
        v_slots := (v_state->>'slots')::integer;
      end if;
    end if;

    -- Harga naik dibanding yang dilihat pembeli (slot pendiri habis saat checkout) -> minta persetujuan dulu.
    if (v_item->>'price') ~ '^\d+(\.\d+)?$' and v_price > (v_item->>'price')::numeric then
      raise exception using errcode = 'GS001',
        message = format('Harga %s Pembeli Pertama untuk "%s" sudah habis. Harga sekarang Rp%s.',
                         coalesce(((public.founder_promo_state(v_prod))->>'slots'), '100'), v_prod.name,
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
      raise exception 'Kupon tidak bisa digabung dengan harga % Pembeli Pertama. Kamu sudah dapat harga terendah.', v_slots;
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
