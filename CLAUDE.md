# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estructura del repositorio

```
gopet/
  site/        ← Aplicación Next.js (todo el código de la app vive aquí)
  supabase/    ← Migraciones SQL y seed de la base de datos
    migrations/
      001_initial_schema.sql   ← clientes, perros, ventas, tabla_gramos
      002_telegram_estados_payload.sql
      003_stock_caja.sql       ← stock de productos y módulo caja
      004_clientes_activo.sql
    seed.sql   ← Datos de referencia tabla_gramos (Maxiene)
```

Todos los comandos deben ejecutarse desde el directorio `site/`.

## Comandos

```bash
cd site
npm run dev          # servidor de desarrollo (http://localhost:3000)
npm run build        # build de producción
npm run lint         # ESLint
npm run test         # Jest (una vez)
npm run test:watch   # Jest en modo watch
```

Correr un solo test: `npm run test -- calculations`

## Qué es este proyecto

**PetStock** — App interna de gestión de ventas para una empresa que vende comida para mascotas (marca Maxiene, Uruguay). Gestiona clientes, predice cuándo se termina cada bolsa y envía alertas via Telegram.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth) · Vercel · Telegram Bot API · Claude API (Anthropic) · OpenAI Whisper · Google Sheets API

## Arquitectura

### Rutas de la app (en `site/src/app/`)
- `/` — Landing page (no modificar)
- `/login` — Auth con Supabase
- `/dashboard` — PieChart meta ventas + alertas + tabla CRM
- `/dashboard/clientes/new` — Nueva venta
- `/dashboard/clientes/[id]` — Historial cliente
- `/dashboard/caja` — Gestión de stock y caja
- `/ideas` — Grabación audio → transcripción Whisper
- `/agente-meta` — Integración Meta Ads (placeholder)
- `/creacion-contenido` — Chat Claude con system prompt editable

### APIs
- `POST /api/telegram-webhook` — Recibe mensajes del bot; parsea texto/audio con Claude/Whisper, registra ventas y stock en Supabase y Google Sheets
- `GET /api/cron/alertas` — Cron diario 09:00 Uruguay; envía alertas Telegram cuando `fecha_estimada_fin` se acerca (protegido con `CRON_SECRET`)
- `POST /api/ventas/sheets` — Sincroniza venta individual a Google Sheets
- `POST /api/auth/signout` — Logout

### Archivos clave (`site/src/`)
- `proxy.ts` — Protección de rutas (en Next.js 16 reemplaza a `middleware.ts`)
- `lib/claude-parser.ts` — Parsea mensajes de Telegram con Claude (claude-3-haiku); devuelve JSON estructurado con tipo `venta | compra_stock | actualizar_cliente`
- `lib/calculations.ts` — Lógica `fecha_estimada_fin` (perros y gatos); zona horaria siempre `America/Montevideo`
- `lib/telegram.ts` — Envío de mensajes/botones via Telegram HTTP API; transcripción audio con OpenAI Whisper
- `lib/google-sheets.ts` — Service Account; append filas a Google Sheets
- `lib/supabase/client.ts` / `server.ts` — Clientes Supabase para browser y server components

## Base de datos

Tablas principales: `clientes`, `perros` (también gatos), `ventas`, `tabla_gramos`
- `tabla_gramos` — Solo perros; datos de referencia Maxiene (gramos/día por tipo y peso)
- `perros.intervalo_compra_dias` — Solo gatos; se calcula en la 2da compra
- `ventas.alerta_enviada` — `true` después de enviar la alerta Telegram
- `ventas.fecha_estimada_fin` — Puede ser null (gatos en primera compra)
- `telegram_estados` — Estado conversacional del bot por `chat_id`

## Lógica de negocio clave

**Perros:** `gramos_por_dia = gramos_por_comida × veces_al_dia` → `dias = floor((kg×1000) / g_por_dia)` → `fecha_fin = fecha_venta + dias`

**Gatos primera compra:** `fecha_estimada_fin` es opcional (sin fecha = sin alerta).

**Gatos compras siguientes:** `intervalo = fecha_nueva - fecha_anterior`; se guarda en `perros.intervalo_compra_dias`.

**Meta de ventas:** `SUM(ventas.precio)` histórico acumulado; meta fija $102.000 UYU (no se reinicia por mes).

**Bot Telegram:** Single-turn. Si faltan datos, pide todo en un mensaje y espera reenvío completo.

## Convenciones Next.js 16

- `proxy.ts` en lugar de `middleware.ts` (renombrado en v16)
- `params` en Server Components es `Promise<{ id: string }>` → requiere `await params`
- Turbopack es el bundler por defecto

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_IDS          # Comma-separated chat IDs
ANTHROPIC_API_KEY
GOOGLE_SHEETS_CREDENTIALS  # JSON del Service Account (string escapado)
GOOGLE_SHEETS_ID
CRON_SECRET
```

Están en `site/.env.local` (no commitear).
