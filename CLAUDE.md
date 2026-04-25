@AGENTS.md

# Guard — Pacto Digital

Capa de protección digital para menores: detección on-device de patrones de grooming + dashboard familiar transparente.

## Arquitectura (dos frentes)

1. **Detección on-device** (extensión de navegador + app Android, fuera de este repo): un modelo ligero analiza en tiempo real mensajes de redes sociales y videojuegos. **Ningún contenido sale del dispositivo** — solo señales categorizadas se envían al dashboard.
2. **Dashboard del Pacto Digital** (este repo, Next.js 16 + Supabase): vista compartida tutor/menor donde el adolescente ve qué se monitorea y el tutor recibe únicamente señales agregadas. Incluye botón **SOS** que contacta a un adulto de confianza distinto a los padres (porque a veces el riesgo está en casa).

**Principio rector:** el menor es aliado, no sospechoso. Romper el paradigma de vigilancia total.

## Stack

- **Dashboard:** Next.js 16.2.4 + React 19.2 + Tailwind 4 + Supabase (Row Level Security para separar vistas tutor/menor).
- **Modelo on-device:** XLM-RoBERTa-base cuantizado (Q8) en ONNX, servido vía ONNX Runtime Web (extensión) y ONNX Runtime Mobile / TF Lite (Android).
- **Datos de entrenamiento:** PAN Sexual Predator Identification adaptado a español mexicano.

## Modelo entrenado: `models/guardia/`

Artefacto canónico del clasificador. **No se sirve desde Next.js** — se distribuye a la extensión y la app móvil por separado (release artifacts / CDN).

| Archivo | Detalle |
|---|---|
| `model_quantized.onnx` | BERT/XLM-R, 12 capas, hidden 384, cuantizado QInt8 (pesos) / QUInt8 (activaciones). 113 MB. |
| `tokenizer.json` + `tokenizer_config.json` | Tokenizer rápido, vocab 250037, max length 512. |
| `config.json` | Arquitectura `BertForSequenceClassification`, `multi_label_classification`. |
| `ort_config.json` | Configuración de cuantización ONNX Runtime. |

**5 etiquetas (multi-label, sigmoid):**

| id | label | Patrón lingüístico |
|---|---|---|
| 0 | `love_bombing` | Halagos excesivos, afecto desproporcionado al tiempo de relación. |
| 1 | `intimacy_escalation` | Empuje a temas íntimos/sexuales. |
| 2 | `emotional_isolation` | "Solo yo te entiendo", aislamiento de familia/amigos. |
| 3 | `deceptive_offer` | Regalos, dinero, oportunidades demasiado buenas. |
| 4 | `off_platform_request` | Pedir mover la conversación a un canal privado/efímero. |

Los `.onnx` y `tokenizer.json` están en `.gitignore` por tamaño (~129 MB). Distribuir vía release artifacts o Git LFS si se versiona en el repo.

## Restricciones de privacidad (no negociables)

- El contenido de mensajes **nunca** abandona el dispositivo del menor.
- El dashboard recibe únicamente: timestamp, plataforma, etiqueta(s) detectada(s), nivel de riesgo agregado.
- El SOS rompe la cadena tutor → menor: contacta a un adulto **distinto** designado por el menor.
- Cualquier feature nueva debe respetar estas tres reglas. Si una feature requiere subir contenido, está fuera de scope.

## Estructura del repo

```
app/                  # Next.js 16 App Router (dashboard)
public/               # Assets estáticos del dashboard (NO el modelo)
models/guardia/       # Artefacto del clasificador (no se sirve)
```
