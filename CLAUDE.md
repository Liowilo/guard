@AGENTS.md

# Guard — Pacto Digital

Capa de protección digital para menores: detección on-device de patrones de grooming + dashboard familiar transparente.

**Principio rector:** el menor es aliado, no sospechoso. Romper el paradigma de vigilancia total.

## Arquitectura (dos frentes)

1. **Detección on-device** (`extension/` — extensión Chrome Manifest v3): content scripts inyectados en WhatsApp Web y Discord capturan mensajes, los clasifican localmente con ONNX Runtime Web (offscreen document), y envían únicamente señales categorizadas al dashboard vía `/api/signals`. **Ningún contenido sale del dispositivo.**
2. **Dashboard del Pacto Digital** (`app/` — Next.js 16 App Router): vista compartida tutor/menor con los mismos datos (transparencia total), más un canal SOS privado que contacta a un adulto de confianza distinto al tutor (porque a veces el riesgo está en casa).

## Stack

- **Dashboard:** Next.js 16.2.4 + React 19.2 + Tailwind 4 + Supabase (auth + RLS + Realtime)
- **Gráficos:** Recharts 3.8.1 (área chart de señales por día en dashboard tutor)
- **Extensión Chrome:** Manifest v3, esbuild, ONNX Runtime Web (WASM SIMD + threading)
- **Inferencia on-device / demo:** `@huggingface/transformers 4.2.0` (demo en `/demo`), ONNX Runtime Web (extensión)
- **Modelo:** XLM-RoBERTa-base cuantizado (Q8, ~113 MB), multi-label sigmoid, 5 etiquetas
- **Tipos:** TypeScript 5, tipos de BD generados por Supabase en `lib/database.types.ts`

## Estructura del repo

```
app/
  (app)/              # Rutas protegidas (requieren auth)
    dashboard/        # Redirige según rol (tutor → /tutor, menor → /menor, etc.)
    tutor/            # Dashboard tutor: stats, gráfico, tabla en vivo, PactCreate
    menor/            # Vista idéntica al tutor + SosButton + SignPactBanner
    confianza/        # Alertas SOS (tutor NO puede ver este canal)
    pacto/            # Pacto Digital: partes, categorías, garantías, estado
  login/              # Login + actions.ts (server action)
  register/           # Registro por rol + actions.ts
  demo/               # Demo ONNX en navegador (Classifier.tsx)
  api/signals/        # POST endpoint: recibe señales de la extensión
  layout.tsx          # Layout raíz
  page.tsx            # Landing page pública

extension/
  src/
    background.ts     # Service worker Manifest v3
    offscreen.ts      # ONNX Runtime Web (inferencia, aislado del DOM)
    content-whatsapp.ts
    content-discord.ts
    popup.ts
    config.ts         # SUPABASE_URL, ANON_KEY, DASHBOARD_URL
  manifest.json
  wasm/               # Binarios ONNX Runtime Web (no tocar)

lib/
  supabase/
    server.ts         # Cliente SSR (cookies)
    client.ts         # Cliente browser
    middleware.ts     # Middleware de sesión
  aggregation.ts      # aggregateRisk, countByLabel, countByPlatform, countByDay, detectCoFiringPatterns
  database.types.ts   # Tipos generados (NO editar a mano)

supabase/migrations/  # SQL aplicado en orden (001–005)
models/guardia/       # Artefacto canónico del modelo (NO se sirve desde Next.js)
public/models/guardia/# Copia del modelo servida para la demo en navegador
```

## Base de datos (Supabase)

### Enums
```sql
user_role:    'tutor' | 'menor' | 'adulto_confianza'
signal_label: 'love_bombing' | 'intimacy_escalation' | 'emotional_isolation'
              | 'deceptive_offer' | 'off_platform_request'
risk_level:   'bajo' | 'medio' | 'alto'
pact_status:  'pending' | 'signed' | 'paused' | 'revoked'
```

### Tablas clave
| Tabla | Para qué sirve |
|---|---|
| `families` | Unidad familiar; el tutor la crea al registrarse |
| `profiles` | Un perfil por usuario de `auth.users`; tiene `role` y `family_id` |
| `pacts` | Acuerdo 1:1 tutor↔menor; incluye `trusted_adult_id` y `monitored_categories[]` |
| `signals` | Señales detectadas por la extensión; **nunca contiene contenido de mensajes** |
| `sos_events` | Alertas SOS; el tutor no tiene acceso vía RLS |

### RLS (quién ve qué)
```
signals    → tutor ✅  menor ✅  adulto_confianza ✗
sos_events → tutor ✗   menor ✅  adulto_confianza ✅
```
`sos_events` es la bifurcación de privacidad crítica: el tutor **nunca** accede.

### Cálculo de risk_level
```
score >= 0.7  → 'alto'
score >= 0.45 → 'medio'
else          → 'bajo'
```
Definido en `app/api/signals/route.ts`.

### Función helper
```sql
auth_family_id() returns uuid  -- family_id del usuario autenticado
```

## Server actions implementadas

| Action | Archivo | Descripción |
|---|---|---|
| `loginAction` / `logoutAction` | `app/login/actions.ts` | Auth con email/password |
| `registerAction` | `app/register/actions.ts` | Crea auth user + familia (si tutor) + profile |
| `createPactAction` | `app/(app)/tutor/actions.ts` | Tutor crea pacto (estado = pending) |
| `signPactAction` | `app/(app)/menor/actions.ts` | Menor firma el pacto (estado → signed) |
| `triggerSosAction` | `app/(app)/menor/actions.ts` | Crea evento en `sos_events` |
| `acknowledgeSOSAction` | `app/(app)/confianza/actions.ts` | Adulto marca SOS como atendido |

## Modelo entrenado: `models/guardia/`

Artefacto canónico. **No se sirve desde Next.js** — se distribuye a la extensión y app móvil por separado. La demo en `/demo` usa la copia en `public/models/guardia/`.

| Archivo | Detalle |
|---|---|
| `model_quantized.onnx` | XLM-RoBERTa-base, 12 capas, hidden 384, QInt8/QUInt8. 113 MB. |
| `tokenizer.json` + `tokenizer_config.json` | Tokenizer rápido, vocab 250037, max length 512. |
| `config.json` | Arquitectura `BertForSequenceClassification`, `multi_label_classification`. |
| `ort_config.json` | Configuración de cuantización ONNX Runtime. |

Los `.onnx` y `tokenizer.json` están en `.gitignore` por tamaño (~129 MB). Distribuir vía release artifacts o Git LFS.

**5 etiquetas (multi-label, sigmoid):**

| id | label | Patrón lingüístico |
|---|---|---|
| 0 | `love_bombing` | Halagos excesivos, afecto desproporcionado al tiempo de relación. |
| 1 | `intimacy_escalation` | Empuje a temas íntimos/sexuales. |
| 2 | `emotional_isolation` | "Solo yo te entiendo", aislamiento de familia/amigos. |
| 3 | `deceptive_offer` | Regalos, dinero, oportunidades demasiado buenas. |
| 4 | `off_platform_request` | Pedir mover la conversación a un canal privado/efímero. |

## API endpoint: `POST /api/signals`

Usado exclusivamente por la extensión. Valida:
1. Bearer JWT del menor (rol = `menor`)
2. Pacto firmado (`status = 'signed'`)
3. `label` es un valor de `signal_label` enum
4. `score` ∈ [0, 1]
5. `label` está en `monitored_categories` del pacto

Responde `201 { id, risk_level }`. CORS habilitado para `*` en `next.config.ts`.

## Restricciones de privacidad (no negociables)

- El contenido de mensajes **nunca** abandona el dispositivo del menor.
- El dashboard recibe únicamente: timestamp, plataforma, etiqueta detectada, nivel de riesgo.
- El SOS contacta a un adulto **distinto** al tutor; el tutor no tiene acceso a `sos_events`.
- Cualquier feature nueva debe respetar estas tres reglas. Si una feature requiere subir contenido, está fuera de scope.

## Flujo de usuario (happy path)

```
1. Tutor se registra → crea familia automáticamente (UUID para compartir)
2. Menor y adulto de confianza se registran con ese UUID → se unen a la familia
3. Tutor crea Pacto Digital → elige menor + adulto de confianza + categorías (estado: pending)
4. Menor firma el pacto (estado → signed) → RLS habilita inserciones en signals
5. Extensión Chrome detecta patrones → clasifica on-device → POST /api/signals
6. Tutor ve dashboard en vivo (Realtime subscription, dot pulsante)
7. Menor ve EXACTAMENTE lo mismo → transparencia total
8. Si menor presiona SOS → sos_events → adulto de confianza recibe alerta → tutor no ve nada
```

## Estado del proyecto (2026-04-25)

- ✅ Auth + registro por rol + protección de rutas
- ✅ Dashboard tutor (gráfico área, tabla en vivo Realtime, co-firing patterns, breakdown por label/plataforma)
- ✅ Dashboard menor (idéntico al tutor + SOS + firma de pacto)
- ✅ Adulto de confianza (alertas SOS + acknowledgment)
- ✅ Pacto Digital (creación, firma, visualización para todos los roles)
- ✅ API `/api/signals` validada y funcional
- ✅ Demo ONNX en navegador (`/demo`)
- ✅ Extensión Chrome (Manifest v3, WhatsApp Web, Discord, offscreen ONNX)
- ✅ BD con 5 migraciones aplicadas y RLS configurado
- ❌ Archivos `.onnx` no en git (`.gitignore`, ~113 MB)
- ❓ Testing end-to-end extensión↔dashboard en Chrome real pendiente
