-- Lapisan pengaman kedua: pesanan hanya boleh diubah lewat fungsi SECURITY DEFINER
-- (admin_update_order_status, attach_payment_proof, cancel_my_order, dst), bukan UPDATE/DELETE langsung.
-- RLS sudah tidak punya policy UPDATE/DELETE untuk orders, ini mencabut hak tabelnya juga.
-- (Sudah diterapkan ke project Supabase produksi pada 2 Okt 2026.)
revoke update, delete on public.orders from anon, authenticated;
