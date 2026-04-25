-- Permite verificar códigos de familia antes de registrarse (sin datos sensibles)
create policy families_code_lookup on families
  for select to anon, authenticated
  using (true);

-- GRANTs explícitos para asegurar que anon/authenticated puedan operar
grant usage on schema public to anon, authenticated;
grant select, insert on families to anon, authenticated;
grant select, insert on profiles to anon, authenticated;
