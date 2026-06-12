-- ──────────────────────────────────────────────────────────────────────────────
-- 015_devolver_stock_al_eliminar.sql
-- Al eliminar una venta (o dar de baja un cliente), el stock vuelve a sumarse.
-- Para devolverlo a la casa correcta, guardamos en cada venta de qué casa se bajó.
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Columna casa en ventas (de qué casa se descontó el stock al vender)
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS casa text;

-- 2. registrar_venta ahora guarda la casa en la venta
CREATE OR REPLACE FUNCTION public.registrar_venta(
  p_cliente_id uuid, p_perro_id uuid, p_producto text, "p_tamaño_bolsa_kg" numeric,
  p_precio integer, p_gramos_por_comida integer, p_veces_al_dia integer,
  p_fecha_estimada_fin date, p_cantidad integer, p_pagado boolean,
  p_casa text DEFAULT 'shangrila'::text
)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  v_venta_id uuid;
BEGIN
  INSERT INTO ventas (
    cliente_id, perro_id, producto, tamaño_bolsa_kg, precio,
    gramos_por_comida, veces_al_dia, fecha_estimada_fin,
    cantidad, pagado, alerta_enviada, casa
  ) VALUES (
    p_cliente_id, p_perro_id, p_producto, p_tamaño_bolsa_kg, p_precio,
    p_gramos_por_comida, p_veces_al_dia, p_fecha_estimada_fin,
    p_cantidad, p_pagado, false, p_casa
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

  UPDATE productos
    SET stock_actual = stock_shangrila + stock_departamento
  WHERE lower(nombre) = lower(p_producto);

  RETURN v_venta_id;
END;
$function$;

-- 3. Función que devuelve al stock las bolsas de una venta (a su casa, o Shangrila si null)
CREATE OR REPLACE FUNCTION public.devolver_stock_venta(p_venta_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_producto text;
  v_cantidad integer;
  v_casa text;
BEGIN
  SELECT producto, COALESCE(cantidad, 1), COALESCE(casa, 'shangrila')
    INTO v_producto, v_cantidad, v_casa
  FROM ventas WHERE id = p_venta_id;

  IF v_producto IS NULL THEN RETURN; END IF;

  IF v_casa = 'departamento' THEN
    UPDATE productos SET stock_departamento = stock_departamento + v_cantidad
    WHERE lower(nombre) = lower(v_producto);
  ELSE
    UPDATE productos SET stock_shangrila = stock_shangrila + v_cantidad
    WHERE lower(nombre) = lower(v_producto);
  END IF;

  UPDATE productos SET stock_actual = stock_shangrila + stock_departamento
  WHERE lower(nombre) = lower(v_producto);
END;
$function$;
