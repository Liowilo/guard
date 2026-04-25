-- Permite al menor insertar señales solo para su pacto firmado.
-- Las inserts antes requerían service role; esta política habilita
-- que la extensión del navegador use el JWT del menor directamente.
create policy signals_menor_insert on signals
  for insert with check (
    menor_id = auth.uid()
    and exists (
      select 1 from pacts p
      where p.id = pact_id
        and p.menor_id = auth.uid()
        and p.status = 'signed'
    )
  );
