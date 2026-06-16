-- Fecha del gasto/ingreso (la que indica el usuario), distinta del momento de registro (created_at)
ALTER TABLE movimientos_caja ADD COLUMN IF NOT EXISTS fecha date;
UPDATE movimientos_caja SET fecha = created_at::date WHERE fecha IS NULL;
