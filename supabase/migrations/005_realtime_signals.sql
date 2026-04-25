-- Habilitar Supabase Realtime para la tabla signals.
-- Necesario para que los tutores vean señales en tiempo real en el dashboard.
alter publication supabase_realtime add table signals;
