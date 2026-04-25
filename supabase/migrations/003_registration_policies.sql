-- Permite al usuario recién registrado crear su propio perfil
create policy profiles_self_insert on profiles
  for insert with check (id = auth.uid());

-- Permite crear una familia (solo necesaria al registrarse como tutor)
create policy families_anyone_insert on families
  for insert with check (true);
