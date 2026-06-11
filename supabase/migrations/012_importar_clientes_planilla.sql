-- ──────────────────────────────────────────────────────────────────────────────
-- 012_importar_clientes_planilla.sql
-- Importación de clientes desde planilla Google Sheets (junio 2026)
-- precio = 0 porque no está en la planilla (actualizar luego)
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_c  uuid;  -- cliente id (reutilizable)
  v_p  uuid;  -- mascota id principal
  v_p2 uuid;  -- mascota id secundaria (clientes con 2 mascotas)
BEGIN

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 0. NACHO MERLI (ya existe) — agregar ventas de Rocky
  -- ─────────────────────────────────────────────────────────────────────────────
  SELECT c.id INTO v_c FROM clientes c WHERE c.nombre = 'Nacho Merli' LIMIT 1;
  SELECT p.id INTO v_p FROM perros p WHERE p.cliente_id = v_c AND lower(p.nombre) = 'rocky' LIMIT 1;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES
    (v_c, v_p, 'Lager Razas Pequeñas', 15, 0, 1, '2026-03-20', false),
    (v_c, v_p, 'Lager Razas Pequeñas', 15, 0, 1, '2026-05-07', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 1. SELVA ARIAS
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Selva Arias', '098748796', 'Cuba M21 S4', true, 'Perro mediano senior compro 23-4. Mensaje enviado.')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'senior') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES
    (v_c, v_p, 'Maxine Senior', 15, 0, 1, '2026-03-21', false),
    (v_c, v_p, 'Maxine Senior', 15, 0, 1, '2026-04-23', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 2. DELFI PATIÑO
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, activo, data_extra)
  VALUES ('Delfi Patiño', '92536350', true, 'Va a avisar')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'gato', null) RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Lager Gato', 15, 0, 1, '2026-03-23', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 3. VERO FERRES
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Vero Ferres', '98850264', 'Antonio Pena', true, 'Va a avisar')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Loli', 'perro', 'senior') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES
    (v_c, v_p, 'Lager Senior', 15, 0, 1, '2026-03-26', false),
    (v_c, v_p, 'Lager Senior', 15, 0, 1, '2026-05-17', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 4. GONZALO FAU (2 gatos, misma fecha)
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Gonzalo Fau', '99227090', 'Lieja 7279', true, 'Mensaje enviado')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Gato 1', 'gato', null) RETURNING id INTO v_p;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Gato 2', 'gato', null) RETURNING id INTO v_p2;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES
    (v_c, v_p,  'Maxine Gato', 3,  0, 1, '2026-04-01', false),
    (v_c, v_p2, 'Maxine Gato', 3,  0, 1, '2026-04-01', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 5. PELADO MOREIRA
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Pelado Moreira', '91060441', 'Atlántida 1208', true, 'Avisar 10/6')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Tina', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES
    (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-04-05', false),
    (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-06-08', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 6. NICO CUBRO
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Nico Cubro', '95908541', 'Uriarte esq coop', true, 'Avisar 1/6')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-04-06', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 7. ALE
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Ale', '98227762', 'Copacabana 140', true, 'Mensaje enviado')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Lager Adulto', 15, 0, 1, '2026-04-08', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 8. DIEGO MOTOVILLO (2 perros: Lola y Chimuelo)
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Diego Motovillo', '95576641', 'Chayos 5007', true, 'AVISAR 9/5. Mensaje enviado.')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Lola', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Chimuelo', 'perro', 'adulto') RETURNING id INTO v_p2;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Lager Adulto', 15, 0, 1, '2026-04-09', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 9. VETERANO SHANGRI (2 perros: Kimba y Loli)
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Veterano Shangri', '99361726', 'Cuba 2105', true, 'Dura 1 mes aprox un poco más. Llama el tarro mañana.')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Kimba', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Loli', 'perro', 'adulto') RETURNING id INTO v_p2;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Lager Adulto', 15, 0, 1, '2026-04-09', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 10. RAMIRO RODRIGUEZ
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Ramiro Rodriguez', '94564827', 'Chalchal 1459', true, 'Dura 1 mes. Priorita 15kg. Avisar 9/6.')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Ramona', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-04-10', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 11. FEDE TRONCOSO
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Fede Troncoso', '98930348', 'Biarritz 7186', true, 'Espero que avise')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'gato', null) RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Lager Gato', 15, 0, 1, '2026-04-16', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 12. RAQUEL FLEITAS
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Raquel Fleitas', '94512708', 'Franklin Delano', true, 'Avisar 1/6/2026')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Lager Adulto', 15, 0, 1, '2026-04-16', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 13. NEGRO GONZALES
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Negro Gonzales', '95000835', 'Liber Flaco 2174', true, 'Espero que avise')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-04-16', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 14. VIRGINA KOWALCZY
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Virgina Kowalczy', '99280676', 'Leyenda Patria 2', true, '330g por día. Avisar 10/6.')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'senior') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Maxine Senior', 15, 0, 1, '2026-04-17', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 15. JAVIER TARO (3 compras)
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, activo, data_extra)
  VALUES ('Javier Taro', '99274639', true, '1 mes dura')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES
    (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-03-16', false),
    (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-04-17', false),
    (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-05-21', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 16. PAULI ARBELO
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Pauli Arbelo', '97356028', '9 de Junio 4362', true, 'Espero que avise')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'gato', null) RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Maxine Gato', 15, 0, 1, '2026-04-18', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 17. AGUSTÍN AGUIAR
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Agustín Aguiar', '93380845', 'Real de Azua 41', true, 'Espero que avise')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Lager Adulto', 15, 0, 1, '2026-05-12', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 18. PABLO (nuevo — distinto al que ya existe)
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Pablo', '+59895812876', 'Ecuador 1809', true, 'Tiene como 3 perros. 2da compra promo Lager.')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES
    (v_c, v_p, 'Lager Adulto', 15, 0, 1, '2026-05-14', false),
    (v_c, v_p, 'Lager Adulto', 15, 0, 1, '2026-06-04', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 19. LOANA
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Loana', '59898138320', 'Los Dorados M1', true, '2 perros, uno gigante. Quiere comprar muchas.')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES
    (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-05-21', false),
    (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-06-02', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 20. JAVIER VECI FACU
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Javier Veci Facu', '59998245910', 'Nicaragua 3812', true, '2 perros medianos')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-05-23', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 21. MADELEINE POOL
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Madeleine Pool', '59898503920', 'Cielo Azul 5018', true, '2 perros medianos')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-05-23', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 22. JERÓNIMO CODARI
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Jerónimo Codari', '59895900751', 'Mones Roso y C', true, '1 pastor alemán')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Francia', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-05-28', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 23. ROCIO
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Rocio', '59891529135', 'Esq. Panamá y S', true, '1 pastor alemán casi seguro')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-05-30', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 24. FELIPE TARO (sin fecha de compra)
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, activo)
  VALUES ('Felipe Taro', '59898899382', true)
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'senior');

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 25. CAMILA TARO (sin fecha de compra)
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, activo)
  VALUES ('Camila Taro', '59898899382', true)
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto');

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 26. GABRIELA (sin fecha de compra)
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, activo)
  VALUES ('Gabriela', '59898899382', true)
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto');

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 27. GABRIEL RICO (sin fecha de compra)
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Gabriel Rico', '59899046652', 'Ecuador 1418', true, 'Perro mediano chico')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto');

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 28. MARIA HUSTINELI
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Maria Hustineli', '94623648', 'Alberto de Herrera', true, 'Avisar en 45 días. Quiere Maxine Senior próximamente.')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-06-04', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 29. FERNANDO
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo)
  VALUES ('Fernando', '59899124024', 'La Pinta 2109', true)
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Lager Adulto', 15, 0, 1, '2026-06-05', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 30. AZUL (sin fecha de compra)
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo)
  VALUES ('Azul', '59895669078', 'Nicaragua 2217', true)
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto');

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 31. MARCELO MALVIN
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Marcelo Malvin', '94776999', 'Rambla Euskal Erria', true, 'El nos avisa')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Lager Adulto', 35, 0, 1, '2026-06-08', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 32. NICO ESTAVILLO
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Nico Estavillo', '59899182902', 'Esq. Venezuela', true, 'Perro chico')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-06-08', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 33. MAR SHANGRI
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo, data_extra)
  VALUES ('Mar Shangri', '59899105502', 'Roque Sáenz Peña', true, 'Rescata y da perros')
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Maxine Adulto', 15, 0, 1, '2026-06-09', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 34. LIBERTAD
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo)
  VALUES ('Libertad', '99498455', 'Itacumbu 4033', true)
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'senior') RETURNING id INTO v_p;
  INSERT INTO ventas (cliente_id, perro_id, producto, "tamaño_bolsa_kg", precio, cantidad, fecha_venta, pagado)
  VALUES (v_c, v_p, 'Maxine Senior', 15, 0, 1, '2026-06-09', false);

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 35. RICARDO CARDOZO (sin fecha de compra)
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO clientes (nombre, telefono, direccion, activo)
  VALUES ('Ricardo Cardozo', '93751353', 'Godoy 4731', true)
  RETURNING id INTO v_c;
  INSERT INTO perros (cliente_id, nombre, especie, tipo)
  VALUES (v_c, 'Sin nombre', 'perro', 'adulto');

END $$;
