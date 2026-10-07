-- Pembayaran online Midtrans (Snap).
-- Kolom bantu di orders + dua fungsi internal yang HANYA bisa dipanggil service_role
-- (dipakai Edge Function midtrans-webhook setelah tanda tangan notifikasi diverifikasi).
-- Menandai pesanan lunas lewat sini melakukan hal yang sama dengan admin_update_order_status
-- (menambah sold, mengurangi stok fisik, menambah pemakaian kupon, status pengiriman).

alter table public.orders
  add column if not exists midtrans_token text,
  add column if not exists midtrans_order_id text,
  add column if not exists midtrans_attempt integer not null default 0,
  add column if not exists midtrans_env text,
  add column if not exists midtrans_token_at timestamptz,
  add column if not exists paid_via text;

create unique index if not exists orders_midtrans_order_id_key
  on public.orders (midtrans_order_id) where midtrans_order_id is not null;

create or replace function public.system_mark_order_paid(p_order_id text, p_via text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_order orders%rowtype;
  v_item jsonb;
  v_qty integer;
  v_has_physical boolean := false;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;
  if v_order.payment = 'PAID' then
    return false;  -- sudah lunas (notifikasi ganda dari Midtrans) -> tidak diproses ulang
  end if;

  update orders
     set payment = 'PAID', status = 'Selesai', paid_via = left(coalesce(p_via, ''), 60),
         method = 'Midtrans' || coalesce(' (' || nullif(left(p_via, 40), '') || ')', '')
   where id = p_order_id;

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
  return true;
end;
$$;

create or replace function public.system_fail_order(p_order_id text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update orders set payment = 'Failed', status = 'Dibatalkan'
   where id = p_order_id and payment = 'Pending';
  return found;
end;
$$;

revoke all on function public.system_mark_order_paid(text, text) from public, anon, authenticated;
revoke all on function public.system_fail_order(text) from public, anon, authenticated;
grant execute on function public.system_mark_order_paid(text, text) to service_role;
grant execute on function public.system_fail_order(text) to service_role;
