-- Tipos ENUM
CREATE TYPE especie_enum AS ENUM ('perro', 'gato');
CREATE TYPE tipo_perro_enum AS ENUM ('adulto', 'senior', 'cachorro', 'raza_pequeña');

-- Clientes
CREATE TABLE clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  direccion text,
  telefono text,
  created_at timestamptz DEFAULT now()
);

-- Mascotas
CREATE TABLE perros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  especie especie_enum NOT NULL,
  tipo tipo_perro_enum,  -- null para gatos
  peso_kg decimal(5,2),
  intervalo_compra_dias integer,  -- solo gatos, null inicialmente
  created_at timestamptz DEFAULT now()
);

-- Ventas
CREATE TABLE ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE,
  perro_id uuid REFERENCES perros(id) ON DELETE CASCADE,
  producto text NOT NULL,
  tamaño_bolsa_kg decimal(5,2) NOT NULL,
  precio integer NOT NULL,
  fecha_venta date NOT NULL DEFAULT CURRENT_DATE,
  gramos_por_comida integer,   -- null para gatos
  veces_al_dia integer,        -- null para gatos
  fecha_estimada_fin date,     -- puede ser null (gatos primera compra)
  alerta_enviada boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Tabla de referencia gramos (solo perros)
CREATE TABLE tabla_gramos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_perro tipo_perro_enum NOT NULL,
  peso_min_kg decimal(5,2) NOT NULL,
  peso_max_kg decimal(5,2) NOT NULL,
  gramos_min integer NOT NULL,
  gramos_max integer NOT NULL,
  subtipo text  -- 'actividad_alta', 'actividad_baja', 'hasta_3_meses', etc.
);

-- Índices para queries frecuentes
CREATE INDEX idx_ventas_fecha_fin ON ventas(fecha_estimada_fin) WHERE fecha_estimada_fin IS NOT NULL;
CREATE INDEX idx_ventas_alerta ON ventas(alerta_enviada, fecha_estimada_fin);
CREATE INDEX idx_perros_cliente ON perros(cliente_id);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);

-- Row Level Security (permitir acceso solo a usuarios autenticados)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE perros ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabla_gramos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_only" ON clientes FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_only" ON perros FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_only" ON ventas FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_only" ON tabla_gramos FOR ALL TO authenticated USING (true);
