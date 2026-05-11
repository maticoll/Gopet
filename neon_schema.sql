-- ============================================================
-- PetStock — Schema completo para Neon
-- Ejecutar en el SQL Editor de neon.tech (en orden)
-- ============================================================

-- ── ENUMs ────────────────────────────────────────────────────
CREATE TYPE especie_enum AS ENUM ('perro', 'gato');
CREATE TYPE tipo_perro_enum AS ENUM ('adulto', 'senior', 'cachorro', 'raza_pequeña');

-- ── Clientes ─────────────────────────────────────────────────
CREATE TABLE clientes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  direccion  text,
  telefono   text,
  activo     boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── Mascotas ─────────────────────────────────────────────────
CREATE TABLE perros (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id            uuid REFERENCES clientes(id) ON DELETE CASCADE,
  nombre                text NOT NULL,
  especie               especie_enum NOT NULL,
  tipo                  tipo_perro_enum,
  peso_kg               decimal(5,2),
  intervalo_compra_dias integer,
  created_at            timestamptz DEFAULT now()
);

-- ── Ventas ───────────────────────────────────────────────────
CREATE TABLE ventas (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id         uuid REFERENCES clientes(id) ON DELETE CASCADE,
  perro_id           uuid REFERENCES perros(id) ON DELETE CASCADE,
  producto           text NOT NULL,
  tamaño_bolsa_kg    decimal(5,2) NOT NULL,
  precio             integer NOT NULL,
  cantidad           integer NOT NULL DEFAULT 1,
  pagado             boolean DEFAULT false,
  fecha_venta        date NOT NULL DEFAULT CURRENT_DATE,
  gramos_por_comida  integer,
  veces_al_dia       integer,
  fecha_estimada_fin date,
  alerta_enviada     boolean DEFAULT false,
  created_at         timestamptz DEFAULT now()
);

-- ── Tabla referencia gramos (perros) ─────────────────────────
CREATE TABLE tabla_gramos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_perro  tipo_perro_enum NOT NULL,
  peso_min_kg decimal(5,2) NOT NULL,
  peso_max_kg decimal(5,2) NOT NULL,
  gramos_min  integer NOT NULL,
  gramos_max  integer NOT NULL,
  subtipo     text
);

-- ── Estados conversacionales Telegram ────────────────────────
CREATE TABLE telegram_estados (
  chat_id    text PRIMARY KEY,
  estado     text NOT NULL,
  venta_id   uuid,
  payload    jsonb,
  updated_at timestamptz DEFAULT now()
);

-- ── Productos / Stock ─────────────────────────────────────────
CREATE TABLE productos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       text NOT NULL,
  marca        text NOT NULL,
  precio_venta integer NOT NULL DEFAULT 0,
  stock_actual integer NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- ── Usuarios (auth) ───────────────────────────────────────────
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz DEFAULT now()
);

-- ── Índices ───────────────────────────────────────────────────
CREATE INDEX idx_ventas_fecha_fin   ON ventas(fecha_estimada_fin) WHERE fecha_estimada_fin IS NOT NULL;
CREATE INDEX idx_ventas_alerta      ON ventas(alerta_enviada, fecha_estimada_fin);
CREATE INDEX idx_perros_cliente     ON perros(cliente_id);
CREATE INDEX idx_ventas_cliente     ON ventas(cliente_id);

-- ── Función registrar_venta (transacción atómica) ─────────────
CREATE OR REPLACE FUNCTION registrar_venta(
  p_cliente_id        uuid,
  p_perro_id          uuid,
  p_producto          text,
  p_tamaño_bolsa_kg   decimal,
  p_precio            integer,
  p_gramos_por_comida integer,
  p_veces_al_dia      integer,
  p_fecha_estimada_fin date,
  p_cantidad          integer,
  p_pagado            boolean
) RETURNS uuid AS $$
DECLARE
  v_venta_id uuid;
  v_producto_id uuid;
BEGIN
  -- Insertar venta
  INSERT INTO ventas (
    cliente_id, perro_id, producto, tamaño_bolsa_kg, precio,
    gramos_por_comida, veces_al_dia, fecha_estimada_fin,
    cantidad, pagado, alerta_enviada
  ) VALUES (
    p_cliente_id, p_perro_id, p_producto, p_tamaño_bolsa_kg, p_precio,
    p_gramos_por_comida, p_veces_al_dia, p_fecha_estimada_fin,
    p_cantidad, p_pagado, false
  ) RETURNING id INTO v_venta_id;

  -- Descontar stock si el producto existe
  SELECT id INTO v_producto_id
  FROM productos
  WHERE lower(nombre) = lower(p_producto)
  LIMIT 1;

  IF v_producto_id IS NOT NULL THEN
    UPDATE productos
    SET stock_actual = GREATEST(0, stock_actual - p_cantidad)
    WHERE id = v_producto_id;
  END IF;

  RETURN v_venta_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PASO FINAL: crear tu usuario en la tabla users
-- Reemplazá 'TU_EMAIL' y el hash con los valores reales.
-- Para generar el hash desde Node.js:
--   const bcrypt = require('bcryptjs')
--   console.log(await bcrypt.hash('tu_contraseña', 12))
-- ============================================================
-- INSERT INTO users (email, password_hash)
-- VALUES ('TU_EMAIL@gmail.com', '$2a$12$...');
