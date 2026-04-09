-- IMPORTANTE: Reemplazar con los datos reales de la tabla Maxiene
-- Formato: (tipo_perro, peso_min_kg, peso_max_kg, gramos_min, gramos_max, subtipo)
-- IMPORTANTE: Este seed debe ser aplicado manualmente en Supabase Studio SQL Editor
-- después de ejecutar la migración 001_initial_schema.sql

INSERT INTO tabla_gramos (tipo_perro, peso_min_kg, peso_max_kg, gramos_min, gramos_max, subtipo) VALUES
-- Adulto
('adulto', 8, 25, 116, 250, null),
('adulto', 25, 35, 250, 330, null),
('adulto', 35, 50, 330, 440, null),
-- Senior
('senior', 5, 10, 100, 140, null),
('senior', 10, 20, 140, 260, null),
('senior', 20, 35, 260, 430, null),
-- Razas pequeñas
('raza_pequeña', 1, 5, 50, 140, 'actividad_alta'),
('raza_pequeña', 1, 5, 30, 100, 'actividad_baja'),
('raza_pequeña', 5, 10, 125, 200, 'actividad_alta'),
('raza_pequeña', 5, 10, 100, 180, 'actividad_baja'),
-- Cachorros
('cachorro', 1, 7, 30, 200, 'hasta_3_meses'),
('cachorro', 1, 7, 28, 140, '3_7_meses'),
('cachorro', 1, 7, 25, 120, '7_12_meses'),
('cachorro', 7, 20, 180, 380, 'hasta_3_meses'),
('cachorro', 7, 20, 140, 300, '3_7_meses'),
('cachorro', 7, 20, 120, 250, '7_12_meses'),
('cachorro', 20, 40, 380, 530, 'hasta_3_meses'),
('cachorro', 20, 40, 300, 450, '3_7_meses'),
('cachorro', 20, 40, 250, 400, '7_12_meses');
