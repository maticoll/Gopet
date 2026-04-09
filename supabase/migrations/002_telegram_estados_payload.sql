-- Create telegram_estados if it doesn't exist yet (may have been created manually)
CREATE TABLE IF NOT EXISTS telegram_estados (
  chat_id text PRIMARY KEY,
  estado text NOT NULL,
  venta_id uuid,
  payload jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Add payload column if the table already existed without it
ALTER TABLE telegram_estados ADD COLUMN IF NOT EXISTS payload jsonb;
