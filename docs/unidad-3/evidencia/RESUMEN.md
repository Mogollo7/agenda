# Resumen de pruebas — Servidor REST de Inspecciones

**Fecha:** 2026-11-16  
**Imagen Docker:** `servidor-inspecciones-api:latest` — 244 MB (62.5 MB contenido)  
**Arranque:** `docker compose up -d --build` (Docker Desktop, contenedor `healthy`)  
**Contenedor:** `USER node`, `read_only: true`, `mem_limit: 128m`, `cpus: 0.5`, `cap_drop: ALL`, `no-new-privileges`  
**Memoria en uso:** ~14.8 MiB / 128 MiB (11.5 %)

## Resultados

| # | Prueba | Código esperado | Código obtenido | Estado |
|---|--------|:-:|:-:|:-:|
| 01 | Salud (`GET /salud`) | 200 | 200 | ✔ |
| 02 | Crear inspección (`POST`) | 201 | 201 | ✔ |
| 03 | Crear repetido (idempotencia `idLocal`) | 200 | 200 | ✔ |
| 04 | Crear inválido (descripción corta) | 400 | 400 | ✔ |
| 05 | Sin token (`POST` sin `Authorization`) | 401 | 401 | ✔ |
| 06 | Listar (`GET ?limit=5`) | 200 | 200 | ✔ |
| 07 | Consultar uno (`GET /:id`) | 200 | 200 | ✔ |
| 08 | Actualizar (`PATCH` estado → Resuelta) | 200 | 200 | ✔ |
| 09 | Conflicto (`PATCH` con `actualizada` antigua) | 409 | 409 | ✔ |
| 10 | Eliminar (`DELETE`) | 204 | 204 | ✔ |
| 11 | Eliminado (`GET` → no existe) | 404 | 404 | ✔ |
| 12 | Cuerpo grande (20 KB → límite 16 KB) | 413 | 413 | ✔ |
| 13 | Límite de peticiones (60/min) | 429 | 429 | ✔ |
| 14 | Imagen Docker (user, mem, stats) | — | `node`, 128 MiB | ✔ |

**14/14 pruebas superadas ✔**

## Notas
- El rate limit se disparó en la petición 46 (porque las pruebas anteriores ya habían consumido parte de la cuota del minuto).
- Cabeceras `Retry-After`, `X-Content-Type-Options: nosniff` y `Cache-Control: no-store` verificadas en todas las respuestas.
- El contenedor queda corriendo al finalizar.
