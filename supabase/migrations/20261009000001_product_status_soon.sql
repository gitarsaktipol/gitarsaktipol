-- Status baru "soon" (Segera Hadir): produk tampil di toko tapi belum bisa dibeli.
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check
  check (status = any (array['published'::text, 'draft'::text, 'archived'::text, 'soon'::text]));

-- Blokir pemesanan produk "soon" di sisi server (tidak hanya di tampilan).
create or replace function public.orders_block_unavailable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb;
  pid text;
begin
  for it in select * from jsonb_array_elements(coalesce(to_jsonb(new.items), '[]'::jsonb)) loop
    pid := it->>'id';
    if pid is not null and exists (
      select 1 from public.products p where p.id::text = pid and p.status = 'soon'
    ) then
      raise exception 'Kelas ini belum dibuka (segera hadir).';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists orders_block_unavailable on public.orders;
create trigger orders_block_unavailable before insert on public.orders
  for each row execute function public.orders_block_unavailable();

revoke execute on function public.orders_block_unavailable() from public, anon, authenticated;
