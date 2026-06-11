-- Estado de pago y fecha límite para movimientos de caja (ej: compra de stock a crédito)
ALTER TABLE movimientos_caja ADD COLUMN IF NOT EXISTS pagado boolean NOT NULL DEFAULT true;
ALTER TABLE movimientos_caja ADD COLUMN IF NOT EXISTS fecha_limite_pago date;
