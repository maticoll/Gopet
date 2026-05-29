-- Movimientos de caja: gastos e ingresos por fuera de ventas de bolsas
CREATE TABLE movimientos_caja (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion text NOT NULL,
  monto       integer NOT NULL,
  categoria   text NOT NULL CHECK (categoria IN ('egreso', 'ingreso')),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_movimientos_caja_created ON movimientos_caja (created_at DESC);
