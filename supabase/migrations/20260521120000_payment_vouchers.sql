begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-vouchers',
  'payment-vouchers',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.pago_movimientos
  add column if not exists voucher_path text,
  add column if not exists voucher_filename text,
  add column if not exists voucher_mime_type text,
  add column if not exists voucher_size integer,
  add column if not exists voucher_uploaded_at timestamptz;

create index if not exists pago_movimientos_voucher_path_idx
  on public.pago_movimientos(voucher_path)
  where voucher_path is not null;

drop policy if exists "Authenticated users can read payment vouchers" on storage.objects;
drop policy if exists "Authenticated users can upload payment vouchers" on storage.objects;
drop policy if exists "Authenticated users can update payment vouchers" on storage.objects;
drop policy if exists "Authenticated users can delete payment vouchers" on storage.objects;

create policy "Authenticated users can read payment vouchers"
on storage.objects for select
to authenticated
using (bucket_id = 'payment-vouchers');

create policy "Authenticated users can upload payment vouchers"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'payment-vouchers'
  and (select auth.uid()) is not null
);

create policy "Authenticated users can update payment vouchers"
on storage.objects for update
to authenticated
using (
  bucket_id = 'payment-vouchers'
  and (select auth.uid()) is not null
)
with check (
  bucket_id = 'payment-vouchers'
  and (select auth.uid()) is not null
);

create policy "Authenticated users can delete payment vouchers"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'payment-vouchers'
  and (select auth.uid()) is not null
);

commit;
