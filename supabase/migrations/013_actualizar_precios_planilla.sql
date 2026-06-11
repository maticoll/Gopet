-- ──────────────────────────────────────────────────────────────────────────────
-- 013_actualizar_precios_planilla.sql
-- Actualiza precios, fechas, pagado y metodo_pago de todas las ventas
-- importadas en 012. Agrega clientes y ventas nuevas presentes en la
-- planilla de caja (junio 2026).
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_c  uuid;
  v_p  uuid;
BEGIN

  -- ── HELPER: actualiza una venta por cliente + fecha ─────────────────────────
  -- Se repite como UPDATE inline por claridad.

  -- 1. Javier Taro — fecha corregida 16/3 → 18/3, precio 2330 T
  UPDATE ventas SET
    fecha_venta = '2026-03-18', precio = 2330, cantidad = 1,
    pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-03-16'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'javier taro' LIMIT 1);

  -- 2. Nacho Merli 20/3 — 1150 T
  UPDATE ventas SET precio = 1150, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-03-20'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'nacho merli' LIMIT 1);

  -- 3. Selva Arias — fecha corregida 21/3 → 20/3, precio 1540 T
  UPDATE ventas SET
    fecha_venta = '2026-03-20', precio = 1540, cantidad = 1,
    pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-03-21'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'selva arias' LIMIT 1);

  -- 4. Delfi Patiño 23/3 — 1440 T
  UPDATE ventas SET precio = 1440, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-03-23'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'delfi pati%' LIMIT 1);

  -- 5. Vero Ferres — fecha corregida 26/3 → 1/4, precio 1190 T
  UPDATE ventas SET
    fecha_venta = '2026-04-01', precio = 1190, cantidad = 1,
    pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-03-26'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'vero ferres' LIMIT 1);

  -- 6-7. Gonzalo Fau 1/4 — dos gatos con precios distintos
  --   Gato 1 (tamaño 3, primero por ID): M C g = 2870 T
  --   Gato 2 (tamaño 3, segundo por ID): M G 3kg = 650 T
  UPDATE ventas SET precio = 2870, cantidad = 1, pagado = true, metodo_pago = 'transferencia',
    producto = 'Maxine Gato Cachorro'
  WHERE id = (
    SELECT v.id FROM ventas v
    WHERE v.fecha_venta = '2026-04-01'
      AND v.cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'gonzalo fau' LIMIT 1)
    ORDER BY v.id ASC LIMIT 1
  );
  UPDATE ventas SET precio = 650, cantidad = 1, pagado = true, metodo_pago = 'transferencia',
    producto = 'Maxine Gato 3kg', "tamaño_bolsa_kg" = 3
  WHERE id = (
    SELECT v.id FROM ventas v
    WHERE v.fecha_venta = '2026-04-01'
      AND v.cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'gonzalo fau' LIMIT 1)
    ORDER BY v.id DESC LIMIT 1
  );

  -- 8. Pelado Moreira 5/4 — 2330 T
  UPDATE ventas SET precio = 2330, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-04-05'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'pelado morei%' LIMIT 1);

  -- 9. Nico Cubro 6/4 — 2330 T
  UPDATE ventas SET precio = 2330, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-04-06'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'nico cubro' LIMIT 1);

  -- 10. Ale 8/4 — 1850 T
  UPDATE ventas SET precio = 1850, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-04-08'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'ale' LIMIT 1);

  -- 11. Diego Motovillo 9/4 — 1850 E
  UPDATE ventas SET precio = 1850, cantidad = 1, pagado = true, metodo_pago = 'efectivo'
  WHERE fecha_venta = '2026-04-09'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'diego motovillo' LIMIT 1);

  -- 12. Veterano Shangri 9/4 — 1850 E
  UPDATE ventas SET precio = 1850, cantidad = 1, pagado = true, metodo_pago = 'efectivo'
  WHERE fecha_venta = '2026-04-09'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'veterano shangri' LIMIT 1);

  -- 13. Ramiro Rodriguez 10/4 — 2330 T
  UPDATE ventas SET precio = 2330, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-04-10'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'ramiro rodriguez' LIMIT 1);

  -- 14. Fede Troncoso 16/4 — 1440 T
  UPDATE ventas SET precio = 1440, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-04-16'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'fede troncoso' LIMIT 1);

  -- 15. Negro Gonzales 16/4 — 2330 T
  UPDATE ventas SET precio = 2330, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-04-16'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'negro gonzales' LIMIT 1);

  -- 16. Virgina Kowalczy 17/4 — 2920 T
  UPDATE ventas SET precio = 2920, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-04-17'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'virgina kowalczy' LIMIT 1);

  -- 17. Javier Taro 17/4 — 2330 T
  UPDATE ventas SET precio = 2330, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-04-17'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'javier taro' LIMIT 1);

  -- 18. Pauli Arbelo 18/4 — 1540 T
  UPDATE ventas SET precio = 1540, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-04-18'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'pauli arbelo' LIMIT 1);

  -- 19. Selva Arias 23/4 — 1220 T
  UPDATE ventas SET precio = 1220, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-04-23'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'selva arias' LIMIT 1);

  -- 20. Nacho Merli 7/5 — 1150 T
  UPDATE ventas SET precio = 1150, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-05-07'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'nacho merli' LIMIT 1);

  -- 21. Pablo 14/5 — fecha corregida → 15/5, precio 1850 T
  UPDATE ventas SET
    fecha_venta = '2026-05-15', precio = 1850, cantidad = 1,
    pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-05-14'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre = 'Pablo' AND telefono = '+59895812876' LIMIT 1);

  -- 22. Vero Ferres 17/5 — 1190 T *** NO PAGADO ***
  UPDATE ventas SET precio = 1190, cantidad = 1, pagado = false, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-05-17'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'vero ferres' LIMIT 1);

  -- 23. Agustín Aguiar 12/5 — 1850 T
  UPDATE ventas SET precio = 1850, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-05-12'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'agust%n aguiar' LIMIT 1);

  -- 24. Loana 21/5 — 990 E (Maxine adulto cachorro/chico)
  UPDATE ventas SET precio = 990, cantidad = 1, pagado = true, metodo_pago = 'efectivo',
    producto = 'Maxine Adulto Chico'
  WHERE fecha_venta = '2026-05-21'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'loana' LIMIT 1);

  -- 25. Javier Taro 21/5 — 2330 T
  UPDATE ventas SET precio = 2330, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-05-21'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'javier taro' LIMIT 1);

  -- 26. Javier Veci Facu 23/5 — 2330 T
  UPDATE ventas SET precio = 2330, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-05-23'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'javier veci facu' LIMIT 1);

  -- 27. Madeleine Pool 23/5 — 2330 T
  UPDATE ventas SET precio = 2330, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-05-23'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'madeleine pool' LIMIT 1);

  -- 28. Jerónimo Codari 28/5 — 2330 T
  UPDATE ventas SET precio = 2330, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-05-28'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'jer%nimo codari' LIMIT 1);

  -- 29. Rocio 30/5 — 990 T (Maxine Adulto Chico)
  UPDATE ventas SET precio = 990, cantidad = 1, pagado = true, metodo_pago = 'transferencia',
    producto = 'Maxine Adulto Chico'
  WHERE fecha_venta = '2026-05-30'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'rocio' LIMIT 1);

  -- 30. Loana 2/6 — 3 bolsas, 6990 T
  UPDATE ventas SET precio = 6990, cantidad = 3, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-06-02'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'loana' LIMIT 1);

  -- 31. Maria Hustineli 4/6 — 1000 E
  UPDATE ventas SET precio = 1000, cantidad = 1, pagado = true, metodo_pago = 'efectivo',
    producto = 'Maxine Adulto Chico'
  WHERE fecha_venta = '2026-06-04'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'maria hustineli' LIMIT 1);

  -- 32. Pablo 4/6 — Promo Lager 2450 T
  UPDATE ventas SET precio = 2450, cantidad = 1, pagado = true, metodo_pago = 'transferencia',
    producto = 'Promo Lager Adulto'
  WHERE fecha_venta = '2026-06-04'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre = 'Pablo' AND telefono = '+59895812876' LIMIT 1);

  -- 33. Fernando 5/6 — 2000 E
  UPDATE ventas SET precio = 2000, cantidad = 1, pagado = true, metodo_pago = 'efectivo'
  WHERE fecha_venta = '2026-06-05'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'fernando' LIMIT 1);

  -- 34. Marcelo Malvin 8/6 — 2 bolsas 35kg, 2500 E
  UPDATE ventas SET precio = 2500, cantidad = 2, pagado = true, metodo_pago = 'efectivo',
    "tamaño_bolsa_kg" = 35
  WHERE fecha_venta = '2026-06-08'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'marcelo malvin' LIMIT 1);

  -- 35. Pelado Moreira 8/6 — 2330 T
  UPDATE ventas SET precio = 2330, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-06-08'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'pelado morei%' LIMIT 1);

  -- 36. Nico Estavillo 8/6 — 2330 T
  UPDATE ventas SET precio = 2330, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-06-08'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'nico estavillo' LIMIT 1);

  -- 37. Libertad 9/6 — 1220 E
  UPDATE ventas SET precio = 1220, cantidad = 1, pagado = true, metodo_pago = 'efectivo'
  WHERE fecha_venta = '2026-06-09'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'libertad' LIMIT 1);

  -- 38. Mar Shangri 9/6 — 2330 T
  UPDATE ventas SET precio = 2330, cantidad = 1, pagado = true, metodo_pago = 'transferencia'
  WHERE fecha_venta = '2026-06-09'
    AND cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'mar shangri' LIMIT 1);

  -- ────────────────────────────────────────────────────────────────────────────
  -- VENTAS NUEVAS para clientes que ya existen pero no tenían compra
  -- ────────────────────────────────────────────────────────────────────────────

  -- Felipe Taro 31/5 — Lager Senior 2140 T
  SELECT id INTO v_p FROM perros WHERE cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'felipe taro' LIMIT 1) LIMIT 1;
  SELECT id INTO v_c FROM clientes WHERE nombre ILIKE 'felipe taro' LIMIT 1;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado, metodo_pago)
  VALUES (v_c, v_p, 'Lager Senior', 15, 2140, 1, '2026-05-31', true, 'transferencia');

  -- Camila Taro 31/5 — Lager Adulto 1850 T
  SELECT id INTO v_p FROM perros WHERE cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'camila taro' LIMIT 1) LIMIT 1;
  SELECT id INTO v_c FROM clientes WHERE nombre ILIKE 'camila taro' LIMIT 1;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado, metodo_pago)
  VALUES (v_c, v_p, 'Lager Adulto', 15, 1850, 1, '2026-05-31', true, 'transferencia');

  -- Gabriela 31/5 — Lager Adulto 1850 T
  SELECT id INTO v_p FROM perros WHERE cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'gabriela' LIMIT 1) LIMIT 1;
  SELECT id INTO v_c FROM clientes WHERE nombre ILIKE 'gabriela' LIMIT 1;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado, metodo_pago)
  VALUES (v_c, v_p, 'Lager Adulto', 15, 1850, 1, '2026-05-31', true, 'transferencia');

  -- Azul 5/6 — Lager Adulto 1850 T
  SELECT id INTO v_p FROM perros WHERE cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'azul' LIMIT 1) LIMIT 1;
  SELECT id INTO v_c FROM clientes WHERE nombre ILIKE 'azul' LIMIT 1;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado, metodo_pago)
  VALUES (v_c, v_p, 'Lager Adulto', 15, 1850, 1, '2026-06-05', true, 'transferencia');

  -- Ricardo Cardozo 10/6 — Lager Adulto 1850 T
  SELECT id INTO v_p FROM perros WHERE cliente_id = (SELECT id FROM clientes WHERE nombre ILIKE 'ricardo cardozo' LIMIT 1) LIMIT 1;
  SELECT id INTO v_c FROM clientes WHERE nombre ILIKE 'ricardo cardozo' LIMIT 1;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado, metodo_pago)
  VALUES (v_c, v_p, 'Lager Adulto', 15, 1850, 1, '2026-06-10', true, 'transferencia');

  -- ────────────────────────────────────────────────────────────────────────────
  -- CLIENTES NUEVOS (aparecen en caja pero no en la planilla de clientes)
  -- ────────────────────────────────────────────────────────────────────────────

  -- Ana Moroni 23/4 — L rp 1150 T
  INSERT INTO clientes (nombre, activo)
  VALUES ('Ana Moroni', true) RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'raza_pequeña') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado, metodo_pago)
  VALUES (v_c, v_p, 'Lager Razas Pequeñas', 15, 1150, 1, '2026-04-23', true, 'transferencia');

  -- X Del Paso 16/4 — L A 1850 E
  INSERT INTO clientes (nombre, activo)
  VALUES ('X Del Paso', true) RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado, metodo_pago)
  VALUES (v_c, v_p, 'Lager Adulto', 15, 1850, 1, '2026-04-16', true, 'efectivo');

  -- Sergio Rico 2/6 — M a 2330 T
  INSERT INTO clientes (nombre, activo)
  VALUES ('Sergio Rico', true) RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado, metodo_pago)
  VALUES (v_c, v_p, 'Maxine Adulto', 15, 2330, 1, '2026-06-02', true, 'transferencia');

  -- Rodri tio Ale 8/6 — Wits adulto 20 unidades 20000 T
  INSERT INTO clientes (nombre, activo)
  VALUES ('Rodri tio Ale', true) RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado, metodo_pago)
  VALUES (v_c, v_p, 'Wits Adulto', 15, 20000, 20, '2026-06-08', true, 'transferencia');

END $$;
