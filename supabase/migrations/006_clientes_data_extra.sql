-- Agregar campo data_extra a clientes para notas libres
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS data_extra text;
