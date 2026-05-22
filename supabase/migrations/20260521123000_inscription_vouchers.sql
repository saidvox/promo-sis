begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inscription-vouchers',
  'inscription-vouchers',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can read inscription vouchers" on storage.objects;
drop policy if exists "Authenticated users can upload inscription vouchers" on storage.objects;
drop policy if exists "Authenticated users can update inscription vouchers" on storage.objects;
drop policy if exists "Authenticated users can delete inscription vouchers" on storage.objects;

create policy "Authenticated users can read inscription vouchers"
on storage.objects for select
to authenticated
using (bucket_id = 'inscription-vouchers');

create policy "Authenticated users can upload inscription vouchers"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'inscription-vouchers'
  and (select auth.uid()) is not null
);

create policy "Authenticated users can update inscription vouchers"
on storage.objects for update
to authenticated
using (
  bucket_id = 'inscription-vouchers'
  and (select auth.uid()) is not null
)
with check (
  bucket_id = 'inscription-vouchers'
  and (select auth.uid()) is not null
);

create policy "Authenticated users can delete inscription vouchers"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'inscription-vouchers'
  and (select auth.uid()) is not null
);

commit;
