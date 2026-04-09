-- Agregar columna activo a clientes con default true
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;

-- Marcar todos los clientes existentes como activos (excepto los que ya estén marcados)
UPDATE clientes SET activo = true WHERE activo IS NULL;
