# Servidor REST de Inspecciones — InspectApp U3

Servidor central REST para la gestión de inspecciones de la aplicación InspectApp (Unidad 3).

## Requisitos

- Node.js 24+ (usa `node:sqlite`, `node:http`, `node:crypto` — cero dependencias externas)
- Docker + Docker Compose (recomendado) o ejecución directa con Node

## Arranque rápido

### Con Docker (recomendado)

```bash
# 1. Copiar el archivo de entorno y poner un token
node -e "console.log('API_TOKEN='+require('crypto').randomBytes(16).toString('hex'))" > .env   # token aleatorio
# Editar .env y poner API_TOKEN=<token de 32 hex>

# 2. Construir y arrancar
docker compose up -d --build

# 3. Verificar salud
curl http://127.0.0.1:3000/api/v1/salud
# → {"ok":true}
```

### Sin Docker (Node directo)

```bash
export DATA_DIR=./data
export API_TOKEN=tu_token_aqui
node server.js
```

## API

Prefijo: `/api/v1`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/salud` | No | Health check |
| GET | `/inspecciones` | No | Listar (query: `estado`, `espacio`, `limit`, `offset`) |
| GET | `/inspecciones/:id` | No | Consultar una |
| POST | `/inspecciones` | Sí | Crear (idempotente por `idLocal`) |
| PATCH | `/inspecciones/:id` | Sí | Actualizar parcial (versión optimista) |
| DELETE | `/inspecciones/:id` | Sí | Eliminar |

### Autenticación

Las escrituras (POST/PATCH/DELETE) requieren:
```
Authorization: Bearer <API_TOKEN>
```

### Seguridad

- Límite de cuerpo: 16 KB (→ 413)
- Rate limit: 60 req/min por IP (→ 429 + `Retry-After`)
- Cabeceras: `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`
- Contenedor: `read_only`, `no-new-privileges`, `cap_drop: ALL`, 128 MB RAM, 0.5 CPU

## Pruebas

```bash
set -a; . ./.env; set +a; bash pruebas.sh
```

Genera archivos de evidencia en la carpeta `evidencia/`.

## Estructura

```
servidor-inspecciones/
├── server.js        # Servidor (≤250 líneas)
├── Dockerfile       # Node 24 Alpine, user node
├── compose.yaml     # Producción con restricciones de seguridad
├── pruebas.sh       # Suite de pruebas con curl
├── .env             # Token real (no se commitea)
├── .env.example     # Plantilla
├── LEEME.md         # Este archivo
└── data/            # SQLite (volumen en Docker)
```
