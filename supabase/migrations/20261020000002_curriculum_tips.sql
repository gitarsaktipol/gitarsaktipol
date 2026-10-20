-- Petunjuk latihan tambahan per video (tampil di bawah deskripsi di halaman belajar member).
alter table public.curriculum_videos add column if not exists tips text not null default '';

-- admin_save_curriculum ikut menyimpan "tips". Kalau item yang dikirim TIDAK punya kunci "tips"
-- (mis. form lama yang belum mengenal petunjuk), nilai lama dipertahankan — tidak dikosongkan.
create or replace function public.admin_save_curriculum(p_product_id bigint, p_items jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
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
        tips = case when v_is_section then '' when (v_item -> 'tips') is not null then coalesce(v_item->>'tips', '') else tips end,
        sort_order = v_idx
      where id = v_id;
    else
      insert into curriculum_videos (product_id, title, description, url, duration, tips, sort_order)
      values (p_product_id,
              coalesce(v_item->>'title', ''),
              case when v_is_section then '' else coalesce(v_item->>'desc', '') end,
              case when v_is_section then '' else coalesce(v_item->>'url', '') end,
              case when v_is_section then '__section__' else coalesce(v_item->>'duration', '') end,
              case when v_is_section then '' else coalesce(v_item->>'tips', '') end,
              v_idx)
      returning id into v_id;
    end if;
    v_keep := v_keep || v_id;
    v_idx := v_idx + 1;
  end loop;

  delete from curriculum_videos where product_id = p_product_id and not (id = any(v_keep));
end;
$function$;

revoke execute on function public.admin_save_curriculum(bigint, jsonb) from public, anon;
grant execute on function public.admin_save_curriculum(bigint, jsonb) to authenticated;
