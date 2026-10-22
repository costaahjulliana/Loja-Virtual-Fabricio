-- Execute este script no Supabase: SQL Editor > New query.
-- Cria catálogo público de leitura e permite alterações somente a usuários autenticados.
-- Não coloque a chave service_role no código do site.

create table if not exists public.products (
  id bigint primary key,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  category text not null,
  category_label text not null,
  description text not null default '',
  image_url text not null default '',
  available boolean not null default true
);

alter table public.products enable row level security;

drop policy if exists "Anyone can view products" on public.products;
create policy "Anyone can view products"
on public.products for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated admins can update products" on public.products;
create policy "Authenticated admins can update products"
on public.products for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

-- Importante: esta política permite atualizar qualquer linha para qualquer usuário autenticado.
-- Para uma loja com mais usuários, crie uma tabela de admins e restrinja a política por user ID.
-- Para uso pessoal, crie somente o seu usuário em Authentication > Users e não habilite cadastro público.
