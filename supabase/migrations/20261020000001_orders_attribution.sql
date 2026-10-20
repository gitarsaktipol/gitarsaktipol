-- Sumber kunjungan pembeli (UTM iklan / fbclid / gclid / referrer) disimpan di pesanan,
-- supaya admin tahu iklan atau kampanye mana yang menghasilkan pembelian.
-- Diisi browser saat checkout (opsional), hanya berupa label — tidak memengaruhi harga/status.
alter table public.orders add column if not exists attribution jsonb;

alter table public.orders drop constraint if exists orders_attribution_check;
alter table public.orders add constraint orders_attribution_check
  check (attribution is null or (jsonb_typeof(attribution) = 'object' and octet_length(attribution::text) <= 2000));

grant insert (attribution) on public.orders to authenticated;
