-- Akun review Midtrans (13 Nov 2026, diminta Ferdi): peninjau Midtrans boleh memakai Midtrans (sandbox)
-- walau metode itu NONAKTIF untuk pembeli umum.
--  * review_accounts = daftar email akun review (diatur admin di Pengaturan › Metode Pembayaran; hapus barisnya
--    setelah Midtrans produksi aktif).
--  * payment_methods.review_only = metode tampil & diterima HANYA untuk akun review (selama enabled=false).
--  * orders.is_review (diisi trigger) -> pesanan akun review tidak menambah "terjual", stok, pemakaian kupon,
--    dan tidak memakan slot "N Pembeli Pertama". Akun review juga boleh membeli produk yang sama berulang kali.

create table if not exists public.review_accounts (
  email text primary key check (email = lower(trim(email)) and email like '%@%'),
  note text,
  created_at timestamptz not null default now()
);
alter table public.review_accounts enable row level security;
drop policy if exists review_accounts_admin on public.review_accounts;
create policy review_accounts_admin on public.review_accounts for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create or replace function public.is_review_account(uid uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select uid is not null and exists (
    select 1 from auth.users u join public.review_accounts r on r.email = lower(u.email) where u.id = uid);
$$;
revoke all on function public.is_review_account(uuid) from public;
grant execute on function public.is_review_account(uuid) to anon;
grant execute on function public.is_review_account(uuid) to authenticated;

alter table public.payment_methods add column if not exists review_only boolean not null default false;
alter table public.orders add column if not exists is_review boolean not null default false;

drop policy if exists payment_methods_select_review on public.payment_methods;
create policy payment_methods_select_review on public.payment_methods for select
  using (review_only and public.is_review_account(auth.uid()));

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
     and not coalesce(o.is_review, false)
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
  v_review boolean := public.is_review_account(new.customer_id);
begin
  if jsonb_typeof(new.items) is distinct from 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'Keranjang kosong.';
  end if;

  -- Saklar metode pembayaran (mis. Midtrans dimatikan selama masih sandbox).
  if new.payment_method_id is not null
     and not exists (select 1 from payment_methods m where m.id = new.payment_method_id
                       and (m.enabled or (m.review_only and v_review))) then
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
      if not v_review and v_prod.fertune_days is null and exists (select 1 from orders o
                 where o.customer_id = new.customer_id and o.payment = 'PAID'
                   and o.items @> jsonb_build_array(jsonb_build_object('id', v_prod.id))) then
        raise exception 'Kamu sudah memiliki produk "%".', v_prod.name;
      end if;
      if not v_review and exists (select 1 from orders o
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
  new.is_review := v_review;
  new.created_at := now();
  return new;
end;
$function$;

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
    if not coalesce(v_order.is_review, false) then
      update products set sold = coalesce(sold, 0) + v_qty where id = (v_item->>'id')::bigint;
    end if;
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
    end if;
    if coalesce(v_item->>'type', 'digital') = 'physical' and not coalesce(v_order.is_review, false) then
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
  if v_order.coupon_code is not null and not coalesce(v_order.is_review, false) then
    update coupons set used = coalesce(used, 0) + 1 where code = v_order.coupon_code;
  end if;
  update orders set stats_counted = true,
         fulfillment_status = case when v_has_physical then coalesce(fulfillment_status, 'Dikemas') else fulfillment_status end
   where id = p_order_id;
end;
$function$;

create or replace function public.coupon_reserved_count(p_code text)
returns integer language sql stable security definer set search_path to 'public' as $$
  select count(*)::integer from orders o
   where upper(o.coupon_code) = upper(p_code) and not o.is_review
     and (o.payment = 'PAID' or (o.payment = 'Pending' and o.created_at > now() - interval '24 hours'));
$$;

-- Data awal: akun review yang sudah dibuat Ferdi + Midtrans (sandbox) aktif khusus akun review.
insert into public.review_accounts (email, note)
values ('ferdiancrestianto+midtrans@gmail.com', 'Akun Review Midtrans (sandbox). Hapus setelah Midtrans produksi aktif.')
on conflict (email) do nothing;
update public.payment_methods set review_only = true where type = 'midtrans';
