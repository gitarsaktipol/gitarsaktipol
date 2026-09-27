-- =====================================================================
-- Gitar Sakti — toko merchandise (barang fisik) + urutan drag & drop
-- (sudah diterapkan ke project Supabase addtajuxfoxcaezmkice)
--
--  * products: jenis produk (digital / fisik), stok, varian (ukuran/ketebalan/warna),
--    foto, berat.
--  * orders: alamat kirim, ongkir, status pengiriman & nomor resi.
--  * Ongkir TETAP: diatur admin di site_content.content.shipping
--    { flatFee, freeAbove } — dihitung di server, tidak bisa dimanipulasi browser.
--  * Stok dicek saat pesanan dibuat dan dikurangi saat admin menandai LUNAS.
--  * RPC simpan urutan produk & metode pembayaran sekaligus (hasil drag & drop).
-- =====================================================================

-- ---------- kolom baru ----------
alter table public.products add column if not exists product_type text not null default 'digital';
alter table public.products drop constraint if exists products_product_type_check;
alter table public.products add constraint products_product_type_check check (product_type in ('digital', 'physical'));
alter table public.products add column if not exists stock integer;                          -- null = tidak dibatasi
alter table public.products add column if not exists variants jsonb not null default '[]'::jsonb; -- [{ "name": "L", "stock": 10 }]
alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;   -- ["https://.../foto.jpg"]
alter table public.products add column if not exists weight_grams integer;

alter table public.orders add column if not exists shipping_address jsonb;
alter table public.orders add column if not exists shipping_fee integer not null default 0;
alter table public.orders add column if not exists fulfillment_status text;
alter table public.orders add column if not exists tracking_number text;
grant insert (shipping_address) on public.orders to authenticated;

alter table public.profiles add column if not exists address jsonb;
grant update (address) on public.profiles to authenticated;

-- ---------- trigger pesanan: digital + fisik ----------
create or replace function public.orders_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
begin
  if jsonb_typeof(new.items) is distinct from 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'Keranjang kosong.';
  end if;

  for v_item in select value from jsonb_array_elements(new.items) loop
    select * into v_prod from products where id = nullif(v_item->>'id', '')::bigint;
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
      -- Produk digital: sekali beli, akses selamanya.
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
             and coalesce(v_prod.sold, 0) < (v_promo->>'founderSlots')::numeric
             and (v_item->>'price') ~ '^\d+(\.\d+)?$'
             and (v_item->>'price')::numeric = (v_promo->>'founderPrice')::numeric then
            v_price := (v_promo->>'founderPrice')::numeric::integer;
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
    select * into v_coupon from coupons c where upper(c.code) = upper(trim(new.coupon_code));
    if not found then
      raise exception 'Kode kupon tidak valid.';
    end if;
    if v_coupon.expiry ~ '^\d{4}-\d{2}-\d{2}$' and v_coupon.expiry::date < current_date then
      raise exception 'Kupon sudah kedaluwarsa.';
    end if;
    if coalesce(v_coupon.usage_limit, 0) > 0 and coalesce(v_coupon.used, 0) >= v_coupon.usage_limit then
      raise exception 'Kupon sudah mencapai batas penggunaan.';
    end if;
    if v_subtotal < coalesce(v_coupon.min_purchase, 0) then
      raise exception 'Minimum belanja untuk kupon % belum terpenuhi.', v_coupon.code;
    end if;
    v_discount := case when v_coupon.type = 'percent' then round(v_subtotal * v_coupon.value / 100.0)::integer
                       else least(v_coupon.value, v_subtotal) end;
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
  new.created_at := now();
  return new;
end;
$$;
revoke execute on function public.orders_before_insert() from public, anon, authenticated;

-- ---------- ubah status pembayaran: + kurangi stok & mulai proses kirim ----------
create or replace function public.admin_update_order_status(p_order_id text, p_payment text, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_item jsonb;
  v_qty integer;
  v_has_physical boolean := false;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Hanya admin yang boleh mengubah status pesanan.';
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  update orders set payment = p_payment, status = p_status where id = p_order_id;

  -- Hanya sekali, saat PERTAMA KALI menjadi PAID (klik ulang tidak menghitung dobel).
  if p_payment = 'PAID' and v_order.payment is distinct from 'PAID' then
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
      update coupons set used = used + 1 where code = v_order.coupon_code;
    end if;
    if v_has_physical then
      update orders set fulfillment_status = coalesce(fulfillment_status, 'Dikemas') where id = p_order_id;
    end if;
  end if;
end;
$$;
revoke execute on function public.admin_update_order_status(text, text, text) from public, anon;
grant execute on function public.admin_update_order_status(text, text, text) to authenticated;

-- ---------- status pengiriman & resi ----------
create or replace function public.admin_update_fulfillment(p_order_id text, p_status text, p_tracking text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Hanya admin.';
  end if;
  if p_status not in ('Dikemas', 'Dikirim', 'Diterima') then
    raise exception 'Status pengiriman tidak valid.';
  end if;
  update orders set fulfillment_status = p_status, tracking_number = nullif(trim(coalesce(p_tracking, '')), '')
   where id = p_order_id and payment = 'PAID';
  if not found then
    raise exception 'Pesanan belum lunas atau tidak ditemukan.';
  end if;
end;
$$;
revoke execute on function public.admin_update_fulfillment(text, text, text) from public, anon;
grant execute on function public.admin_update_fulfillment(text, text, text) to authenticated;

-- ---------- simpan urutan hasil drag & drop (sekali panggil) ----------
create or replace function public.admin_reorder_products(p_ids bigint[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Hanya admin.'; end if;
  update products p set sort_order = x.ord - 1
    from unnest(p_ids) with ordinality as x(id, ord)
   where p.id = x.id;
end;
$$;
revoke execute on function public.admin_reorder_products(bigint[]) from public, anon;
grant execute on function public.admin_reorder_products(bigint[]) to authenticated;

create or replace function public.admin_reorder_payment_methods(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Hanya admin.'; end if;
  update payment_methods p set sort_order = x.ord - 1
    from unnest(p_ids) with ordinality as x(id, ord)
   where p.id = x.id;
end;
$$;
revoke execute on function public.admin_reorder_payment_methods(uuid[]) from public, anon;
grant execute on function public.admin_reorder_payment_methods(uuid[]) to authenticated;

-- ---------- foto produk (bucket publik, hanya admin yang boleh upload/hapus) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin upload foto produk" on storage.objects;
create policy "Admin upload foto produk" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));
drop policy if exists "Admin ubah foto produk" on storage.objects;
create policy "Admin ubah foto produk" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin(auth.uid()));
drop policy if exists "Admin hapus foto produk" on storage.objects;
create policy "Admin hapus foto produk" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin(auth.uid()));
