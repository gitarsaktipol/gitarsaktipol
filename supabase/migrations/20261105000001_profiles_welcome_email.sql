-- Email "Selamat Datang": dicatat kapan sudah dikirim supaya hanya sekali per akun.
-- Diisi HANYA oleh Edge Function send-order-email (service role). Klien tidak punya
-- izin kolom ini (izin UPDATE profiles per kolom: name, phone, address saja).
alter table public.profiles add column if not exists welcome_email_at timestamptz;
