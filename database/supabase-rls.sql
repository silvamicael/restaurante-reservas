-- Somente para Supabase: o Supabase expõe as tabelas por uma API pública.
-- Ativar o RLS (sem políticas) bloqueia esse acesso público.
-- A API Express conecta com o usuário "postgres", que ignora o RLS, então continua funcionando.
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
