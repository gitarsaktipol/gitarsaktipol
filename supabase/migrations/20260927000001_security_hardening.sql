-- =====================================================================
-- Gitar Sakti — pengamanan database sebelum go-live
-- (sudah diterapkan ke project Supabase addtajuxfoxcaezmkice)
--
-- Menutup celah:
--  1. Customer bisa mengubah kolom "role" profilnya sendiri jadi 'admin'
--     (policy UPDATE profiles tidak membatasi kolom) -> ambil alih toko.
--  2. Harga/total/diskon pesanan dikirim dari browser apa adanya -> customer
--     bisa bikin pesanan Rp1 untuk produk Rp247.000.
--  3. Semua kode kupon bisa dibaca siapa saja lewat API publik.
--  4. Fungsi SECURITY DEFINER tanpa search_path & bisa dipanggil anon.
--  5. Setiap admin mengedit kurikulum, SEMUA video dihapus & dibuat ulang
--     -> progres belajar semua member ikut terhapus (FK ON DELETE CASCADE).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES: user hanya boleh ubah nama & nomor WA miliknya sendiri
-- ---------------------------------------------------------------------
revoke update on public.profiles from anon, authenticated;
grant update (name, phone) on public.profiles to authenticated;

drop policy if exists "User boleh update nama/telepon sendiri" on public.profiles;
create policy "User boleh update nama/telepon sendiri" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------
-- 2. KUPON: tidak lagi bisa dilihat publik; validasi lewat RPC
-- ---------------------------------------------------------------------
drop policy if exists "Semua orang boleh lihat kupon" on public.coupons;

drop function if exists public.validate_coupon(text, integer);
create function public.validate_coupon(p_code text, p_subtotal integer)
returns table(ok boolean, error text, code text, discount integer, coupon_type text, coupon_value integer, min_purchase integer)
language plpgsql
security definer
set search_path = public
as $$
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
  if coalesce(v_coupon.usage_limit, 0) > 0 and coalesce(v_coupon.used, 0) >= v_coupon.usage_limit then
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
$$;
revoke execute on function public.validate_coupon(text, integer) from public, anon;
grant execute on function public.validate_coupon(text, integer) to authenticated;

-- ---------------------------------------------------------------------
-- 3. ORDERS: harga, diskon & total dihitung ulang di server
-- ---------------------------------------------------------------------
-- Browser tidak boleh menentukan id pesanan / bukti bayar / waktu pembuatan.
revoke insert on public.orders from anon, authenticated;
grant insert (customer_id, customer_name, customer_email, customer_phone, items, subtotal, discount,
              coupon_code, total, payment, status, method, payment_method_id)
  on public.orders to authenticated;

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
  v_items jsonb := '[]'::jsonb;
  v_ids bigint[] := '{}';
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_coupon coupons%rowtype;
  v_email text;
begin
  if jsonb_typeof(new.items) is distinct from 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'Keranjang kosong.';
  end if;

  for v_item in select value from jsonb_array_elements(new.items) loop
    select * into v_prod from products where id = nullif(v_item->>'id', '')::bigint;
    if not found or v_prod.status = 'archived' then
      raise exception 'Produk tidak tersedia lagi. Muat ulang halaman lalu coba lagi.';
    end if;
    if v_prod.id = any(v_ids) then
      continue;
    end if;
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
    v_ids := v_ids || v_prod.id;

    -- Harga normal produk, kecuali pembelian lewat landing page yang promonya masih aktif
    -- (slot pembeli pertama belum habis). Batas waktu countdown dihitung per-pengunjung di
    -- browser, jadi yang bisa dijamin server hanya kuota slot-nya.
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

    v_items := v_items || jsonb_build_array(
      jsonb_build_object('id', v_prod.id, 'name', v_prod.name, 'price', v_price)
      || case when nullif(v_item->>'lp', '') is not null then jsonb_build_object('lp', v_item->>'lp') else '{}'::jsonb end);
    v_subtotal := v_subtotal + v_price;
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

  select email into v_email from profiles where id = new.customer_id;

  new.items := v_items;
  new.subtotal := v_subtotal;
  new.discount := v_discount;
  new.total := greatest(v_subtotal - v_discount, 0);
  new.payment := 'Pending';
  new.status := 'Menunggu Pembayaran';
  new.customer_email := coalesce(v_email, new.customer_email);
  new.proof_image_url := null;
  new.proof_note := null;
  new.proof_submitted_at := null;
  new.created_at := now();
  return new;
end;
$$;
revoke execute on function public.orders_before_insert() from public, anon, authenticated;

drop trigger if exists orders_before_insert on public.orders;
create trigger orders_before_insert
  before insert on public.orders
  for each row execute function public.orders_before_insert();

-- Bukti transfer hanya untuk pesanan Pending milik sendiri, dan file-nya harus di folder sendiri.
create or replace function public.attach_payment_proof(p_order_id text, p_proof_url text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or split_part(coalesce(p_proof_url, ''), '/', 1) <> auth.uid()::text then
    raise exception 'Lokasi file bukti transfer tidak valid.';
  end if;
  update orders
     set proof_image_url = p_proof_url,
         proof_note = left(coalesce(p_note, ''), 500),
         proof_submitted_at = now(),
         status = 'Menunggu Verifikasi'
   where id = p_order_id and customer_id = auth.uid() and payment = 'Pending';
  if not found then
    raise exception 'Pesanan tidak ditemukan, bukan milik Anda, atau sudah diproses.';
  end if;
end;
$$;
revoke execute on function public.attach_payment_proof(text, text, text) from public, anon;
grant execute on function public.attach_payment_proof(text, text, text) to authenticated;

-- Customer boleh membatalkan pesanannya sendiri yang belum dibayar (supaya bisa checkout ulang).
create or replace function public.cancel_my_order(p_order_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update orders set payment = 'Failed', status = 'Dibatalkan'
   where id = p_order_id and customer_id = auth.uid() and payment = 'Pending';
  if not found then
    raise exception 'Pesanan tidak ditemukan atau sudah diproses.';
  end if;
end;
$$;
revoke execute on function public.cancel_my_order(text) from public, anon;
grant execute on function public.cancel_my_order(text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. KURIKULUM: simpan tanpa menghapus-ulang (progres member tetap aman)
-- ---------------------------------------------------------------------
create or replace function public.admin_save_curriculum(p_product_id bigint, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_idx integer := 0;
  v_id bigint;
  v_keep bigint[] := '{}';
  v_is_section boolean;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Hanya admin yang boleh mengubah materi.';
  end if;
  if not exists (select 1 from products where id = p_product_id) then
    raise exception 'Produk tidak ditemukan.';
  end if;
  -- Kunci per produk supaya 2 simpanan cepat berturut-turut tidak saling tumpang tindih.
  perform pg_advisory_xact_lock(p_product_id);

  for v_item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_is_section := coalesce(v_item->>'type', 'video') = 'section';
    v_id := case when (v_item->>'id') ~ '^\d+$' then (v_item->>'id')::bigint end;
    if v_id is not null and exists (select 1 from curriculum_videos where id = v_id and product_id = p_product_id) then
      update curriculum_videos set
        title = coalesce(v_item->>'title', ''),
        description = case when v_is_section then '' else coalesce(v_item->>'desc', '') end,
        url = case when v_is_section then '' else coalesce(v_item->>'url', '') end,
        duration = case when v_is_section then '__section__' else coalesce(v_item->>'duration', '') end,
        sort_order = v_idx
      where id = v_id;
    else
      insert into curriculum_videos (product_id, title, description, url, duration, sort_order)
      values (p_product_id,
              coalesce(v_item->>'title', ''),
              case when v_is_section then '' else coalesce(v_item->>'desc', '') end,
              case when v_is_section then '' else coalesce(v_item->>'url', '') end,
              case when v_is_section then '__section__' else coalesce(v_item->>'duration', '') end,
              v_idx)
      returning id into v_id;
    end if;
    v_keep := v_keep || v_id;
    v_idx := v_idx + 1;
  end loop;

  delete from curriculum_videos where product_id = p_product_id and not (id = any(v_keep));
end;
$$;
revoke execute on function public.admin_save_curriculum(bigint, jsonb) from public, anon;
grant execute on function public.admin_save_curriculum(bigint, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Fungsi lama: kunci search_path & batasi siapa yang boleh memanggil
-- ---------------------------------------------------------------------
alter function public.handle_new_user() set search_path = public;
alter function public.generate_order_id() set search_path = public;
alter function public.admin_update_order_status(text, text, text) set search_path = public;
alter function public.increment_lp_visit(text) set search_path = public;
alter function public.increment_lp_click(text) set search_path = public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.admin_update_order_status(text, text, text) from public, anon;
grant execute on function public.admin_update_order_status(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Storage bukti transfer: maks 5MB, hanya gambar
-- ---------------------------------------------------------------------
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
 where id = 'payment-proofs';

-- ---------------------------------------------------------------------
-- 7. Bersihkan policy ganda (isinya sama dengan policy lain yang tetap ada)
-- ---------------------------------------------------------------------
drop policy if exists "Admin boleh hapus landing page" on public.landing_pages;
drop policy if exists "Admin boleh buat landing page" on public.landing_pages;
drop policy if exists "Admin boleh ubah landing page" on public.landing_pages;
drop policy if exists "Semua orang boleh lihat landing page yang published" on public.landing_pages;
drop policy if exists "Admin boleh lihat semua landing page termasuk draft" on public.landing_pages;
drop policy if exists "Admin boleh lihat data kunjungan" on public.site_visits;
