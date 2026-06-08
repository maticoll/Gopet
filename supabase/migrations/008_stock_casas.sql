-- Dividir stock en dos casas: Shangrila y Departamento
ALTER TABLE productos
  ADD COLUMN stock_shangrila    integer NOT NULL DEFAULT 0,
  ADD COLUMN stock_departamento integer NOT NULL DEFAULT 0;

-- Migrar stock existente a Shangrila por defecto
UPDATE productos SET stock_shangrila = GREATEST(stock_actual, 0);

-- Actualizar registrar_venta() para aceptar casa (con default 'shangrila' para no romper callers existentes)
CREATE OR REPLACE FUNCTION registrar_venta(
  p_cliente_id          uuid,
  p_perro_id            uuid,
  p_producto            text,
  p_tamaño_bolsa_kg     decimal(5,2),
  p_precio              integer,
  p_gramos_por_comida   integer,
  p_veces_al_dia        integer,
  p_fecha_estimada_fin  date,
  p_cantidad            integer,
  p_pagado              boolean,
  p_casa                text DEFAULT 'shangrila'
) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_venta_id uuid;
BEGIN
  INSERT INTO ventas (
    cliente_id, perro_id, producto, tamaño_bolsa_kg, precio,
    gramos_por_comida, veces_al_dia, fecha_estimada_fin,
    cantidad, pagado, alerta_enviada
  ) VALUES (
    p_cliente_id, p_perro_id, p_producto, p_tamaño_bolsa_kg, p_precio,
    p_gramos_por_comida, p_veces_al_dia, p_fecha_estimada_fin,
    p_cantidad, p_pagado, false
  ) RETURNING id INTO v_venta_id;

  IF p_casa = 'departamento' THEN
    UPDATE productos
      SET stock_departamento = GREATEST(0, stock_departamento - p_cantidad)
    WHERE lower(nombre) = lower(p_producto);
  ELSE
    UPDATE productos
      SET stock_shangrila = GREATEST(0, stock_shangrila - p_cantidad)
    WHERE lower(nombre) = lower(p_producto);
  END IF;

  -- Mantener stock_actual como suma de ambas casas
  UPDATE productos
    SET stock_actual = stock_shangrila + stock_departamento
  WHERE lower(nombre) = lower(p_producto);

  RETURN v_venta_id;
END;
$$;
