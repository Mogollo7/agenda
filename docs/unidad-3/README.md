# Unidad 3 · Back-End y Servicios Distribuidos
## InspectApp: De la aplicación local al consumo de servicios REST

Este directorio contiene la documentación técnica completa del paso de **InspectApp** desde una arquitectura móvil con persistencia exclusivamente local (desarrollada en la Unidad 2) hacia un **sistema distribuido cliente-servidor** basado en una API REST centralizada, desacoplada y empaquetada en contenedores Docker (Unidad 3).

---

## 1. Resumen de la Actividad

| Parámetro | Detalle |
|---|---|
| **Asignatura** | Desarrollo de Aplicaciones Móviles |
| **Institución** | Corporación Universitaria Lasallista |
| **Docente** | Ing. Neider Xavier Vergara Humánez |
| **Integrantes** | Juan Sebastián Martínez Galeano · Cesar Ocampo Raigosa · Samuel Usma Brand |
| **Unidad temática** | Unidad 3 · Back-End y servicios distribuidos |
| **Actividad** | Actividad de seguimiento – Unidad 3 |
| **Aplicación base** | InspectApp (Expo / React Native / AsyncStorage / NetInfo) |
| **Repositorio central** | [https://github.com/Mogollo7/agenda](https://github.com/Mogollo7/agenda) |
| **Servicio de backend** | Servidor REST en Node.js 24 Alpine (`servidor-inspecciones`) con persistencia SQLite y cero dependencias externas npm |
| **Fecha de verificación** | 16 de noviembre de 2026 |
| **Estado de pruebas** | 14 de 14 pruebas superadas satisfactoriamente (evidencia registrada en `./evidencia/`) |

---

## 2. Mapa de Contenidos (Enunciado → Sección)

La documentación se organiza de forma modular para abarcar exhaustivamente cada punto solicitado en la guía de la Unidad 3:

| Documento | Parte del enunciado | Descripción técnica |
|---|---|---|
| **[01-recurso.md](./01-recurso.md)** | **Parte 1** · Identificación del recurso | Definición del recurso `Inspección`, estructura JSON oficial, tabla de tipos y restricciones, y mapeo de correspondencia entre el modelo móvil (`App.js` / `src/store.js`) y el backend (`server.js`). |
| **[02-arquitectura.md](./02-arquitectura.md)** | **Parte 2** · De almacenamiento local a servicio remoto | Comparativa entre el escenario actual monolítico local y la arquitectura distribuida por capas propuesta. Diagramas de arquitectura, responsabilidades de cada capa, justificación de por qué capas y no microservicios, y estrategia de contenedorización en Docker. |
| **[03-api.md](./03-api.md)** | **Parte 3** · Diseño básico de la API REST | Especificación completa de la API bajo `/api/v1`: esquema de autenticación Bearer, tabla de endpoints, verbos HTTP, parámetros de paginación (`limit`, `offset`), control de concurrencia optimista (`actualizada`), códigos de estado HTTP y catálogo de validaciones. |
| **[04-solicitud-respuesta.md](./04-solicitud-respuesta.md)** | **Parte 4** · Solicitud y respuesta HTTP | Desglose paso a paso de una transacción de creación (`POST /inspecciones`) con datos reales de ejecución y análisis del mecanismo de reenvío idempotente mediante `idLocal`. |
| **[05-prueba-http.md](./05-prueba-http.md)** | **Parte 5** · Comprobación práctica | Guía de despliegue del contenedor Docker, ejecución de la suite de pruebas (`pruebas.sh`), tabla de las 13 pruebas HTTP + prueba del contenedor con enlaces a los archivos en `./evidencia/`, análisis de métricas de Docker y galería comentada de capturas de la aplicación móvil. |
| **[06-offline.md](./06-offline.md)** | **Parte 6** · Conectividad y funcionamiento offline | Estrategia de resiliencia ante desconexión: diagrama de flujo de decisión de red, separación estricta entre estado de negocio y estado de sincronización (`sync`), cola de sincronización, reintentos con backoff exponencial, resolución de conflictos 409 y políticas de almacenamiento local seguro. |
| **[07-seguridad.md](./07-seguridad.md)** | Consideraciones de seguridad y operación | Síntesis profunda de las directrices de seguridad del equipo: aislamiento por capas, imágenes mínimas Alpine, control de recursos (límites de memoria, CPU, tamaño de payload y tasa de peticiones), firmas criptográficas HMAC en webhooks, eliminación de vectores de ejecución remota (RCE) y trazabilidad con el código implementado en `server.js`. |
| **[08-preguntas.md](./08-preguntas.md)** | Cierre · Preguntas conceptuales | Respuestas técnicas detalladas y fundamentadas a las siete preguntas de consolidación de la Unidad 3. |

---

## 3. Cómo reproducir todo en 5 comandos

Para poner en marcha el servidor de inspecciones en un entorno local y verificar el 100% de los endpoints y reglas de negocio, ejecute la siguiente secuencia en su terminal:

```bash
# 1. Entrar al directorio del servidor
cd servidor

# 2. Configurar las variables de entorno para autenticación
node -e "console.log('API_TOKEN='+require('crypto').randomBytes(16).toString('hex'))" > .env   # token aleatorio

# 3. Construir y levantar el contenedor Docker con restricciones de seguridad
docker compose up -d --build

# 4. Ejecutar la suite completa de pruebas HTTP automatizadas
set -a; . ./.env; set +a; bash pruebas.sh

# 5. Comprobar el estado de salud del servicio REST
curl -sS http://127.0.0.1:3000/api/v1/salud
# Respuesta esperada: {"ok":true}
```

> [!NOTE]
> Para ejecutar en paralelo la aplicación móvil en modo web o para dispositivos móviles, abra otra terminal en la raíz del proyecto y ejecute:
> ```bash
> npm install
> npx expo start --web
> ```

---

## 4. Estructura de Directorios

```text
docs/unidad-3/
├── README.md                 # Este índice principal
├── 01-recurso.md             # Definición y modelado del recurso Inspección
├── 02-arquitectura.md        # Arquitectura por capas y despliegue Docker
├── 03-api.md                 # Especificación técnica de la API REST
├── 04-solicitud-respuesta.md # Trazas reales de creación e idempotencia
├── 05-prueba-http.md         # Ejecución de pruebas y reporte de contenedor
├── 06-offline.md             # Sincronización offline y resolución de conflictos
├── 07-seguridad.md           # Hardening, límites y mitigación de vulnerabilidades
├── 08-preguntas.md           # Respuestas a las 7 preguntas de cierre
├── img/                      # Diagramas arquitectónicos (SVG y PNG) y capturas de la app
│   ├── fig1-local.png / .svg
│   ├── fig2-capas.png / .svg
│   ├── fig3-offline.png / .svg
│   └── app-01-tutorial.png ... app-09-persistencia.png
└── evidencia/                # Registros crudos de salida de la suite de pruebas
    ├── 01-salud.txt ... 14-imagen.txt
    ├── app-asyncstorage.json
    └── RESUMEN.md
```
