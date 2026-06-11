-- Cómo llegó el cliente
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS origen text;
