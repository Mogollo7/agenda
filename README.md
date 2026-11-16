# InspectApp · Registro de Inspecciones Institucionales

> De la aplicación móvil local al consumo de servicios distribuidos REST: un registro de novedades físicas que hoy vive en el dispositivo y se comparte a través de una API centralizada.

**InspectApp** es una aplicación móvil desarrollada para la gestión, levantamiento y seguimiento de novedades físicas, anomalías de mantenimiento y riesgos de seguridad en recintos educativos e institucionales (aulas de clase, laboratorios de cómputo, salas de reuniones y zonas comunes).

---

**Equipo:** Juan Sebastián Martínez Galeano · Cesar Ocampo Raigosa · Samuel Usma Brand
**Curso:** Desarrollo de Aplicaciones Móviles · Corporación Universitaria Lasallista · Docente: Ing. Neider Xavier Vergara Humánez

## 1. Arquitectura General y Evolución

El proyecto ha transitado a través de dos fases de ingeniería clave en la asignatura **Aplicaciones Móviles**:

1. **Unidad 2 (Persistencia Local Aislada):**  
   Desarrollo de la interfaz de usuario móvil en React Native con Expo, validación semántica de formularios en tiempo real, catálogo de severidades y persistencia local asíncrona mediante `AsyncStorage` (clave `inspect.items.v1`) siguiendo el principio de persistir primero en disco antes de refrescar el estado en memoria.  
   Consulte la especificación completa en: **[`ESPECIFICACION.md`](./ESPECIFICACION.md)**.

2. **Unidad 3 (Arquitectura Distribuida y Servicios REST):**  
   Evolución hacia un sistema cliente-servidor desacoplado por capas. Se implementó un backend REST centralizado en Node.js 24 Alpine con base de datos SQLite montada en volumen Docker, autenticación mediante Bearer token, soporte de idempotencia por `idLocal`, control de concurrencia optimista contra conflictos (HTTP 409) y políticas defensivas de limitación de tasa (*rate limit*) y tamaño de carga.  
   Consulte la documentación técnica completa en: **[`docs/unidad-3/README.md`](./docs/unidad-3/README.md)**.

---

## 2. Puesta en Marcha de la Aplicación Móvil

### Requisitos previos
- Node.js (versión 20 o superior recomendada)
- Gestor de paquetes `npm` (o `bun`)
- Navegador web moderno o dispositivo móvil con la app **Expo Go** instalada

### Pasos de ejecución
```bash
# 1. Instalar las dependencias del proyecto
npm install

# 2. Iniciar el servidor de desarrollo de Expo para entorno web
npx expo start --web
```

Para probar en un dispositivo físico Android o iOS:
```bash
npx expo start
```
Escanee el código QR desplegado en la terminal utilizando la aplicación **Expo Go**.

---

## 3. Puesta en Marcha del Servidor REST (Backend)

El servicio backend reside en la carpeta **[`servidor/`](./servidor/)** y está preparado para desplegarse de manera inmediata mediante Docker Compose:

```bash
# 1. Ingresar al directorio del servidor
cd servidor

# 2. Configurar la clave de autenticación
node -e "console.log('API_TOKEN='+require('crypto').randomBytes(16).toString('hex'))" > .env   # token aleatorio

# 3. Construir y levantar el contenedor en segundo plano
docker compose up -d --build

# 4. Ejecutar la suite automatizada de pruebas HTTP
set -a; . ./.env; set +a; bash pruebas.sh

# 5. Verificar disponibilidad del servicio
curl http://127.0.0.1:3000/api/v1/salud
# Respuesta esperada: {"ok":true}
```

Para más detalles sobre la arquitectura del servidor, variables de entorno y ejecución sin Docker, consulte **[`servidor/LEEME.md`](./servidor/LEEME.md)**.

---

## 4. Mapa de Navegación del Repositorio

```text
agenda/
├── App.js                     # Punto de entrada principal y pantallas de la app móvil
├── app.json                   # Configuración del ecosistema Expo
├── ESPECIFICACION.md          # Especificación técnica y funcional de la Unidad 2
├── README.md                  # Este documento principal del proyecto
├── src/
│   ├── store.js               # Almacenamiento local, validación y hooks reactivos
│   ├── theme.js               # Tokens de diseño y paleta de colores
│   ├── ui.js                  # Componentes visuales reutilizables
│   ├── motion.js              # Efectos hápticos y animaciones
│   ├── Mascot.js              # Mascota interactiva Orbi
│   └── WakeSplash.js          # Pantalla de carga y rehidratación
├── servidor/                  # Código fuente y despliegue del backend REST
│   ├── server.js              # Servidor REST en Node.js 24 (cero dependencias externas)
│   ├── Dockerfile             # Imagen basada en node:24-alpine con usuario sin privilegios
│   ├── compose.yaml           # Despliegue seguro con límites de memoria y CPU
│   ├── pruebas.sh             # Suite de 14 pruebas de integración y seguridad
│   ├── LEEME.md               # Manual técnico del servidor
│   └── .env.example           # Plantilla de variables de entorno
└── docs/
    └── unidad-3/              # Documentación técnica exhaustiva de la Unidad 3
        ├── README.md          # Índice general y guía de reproducción rápida
        ├── 01-recurso.md      # Modelado de datos del recurso Inspección
        ├── 02-arquitectura.md # Arquitectura por capas y contenedorización
        ├── 03-api.md          # Especificación formal de la API REST
        ├── 04-solicitud-respuesta.md # Ejemplos reales de creación e idempotencia
        ├── 05-prueba-http.md  # Resultados de pruebas y métricas del contenedor
        ├── 06-offline.md      # Sincronización offline y resolución de conflictos
        ├── 07-seguridad.md    # Hardening, límites defensivos y webhooks seguros
        ├── 08-preguntas.md    # Respuestas a las 7 preguntas de consolidación
        ├── img/               # Diagramas de arquitectura y capturas de la app
        └── evidencia/         # Registros de salida crudos de la suite de pruebas
```

---

## 5. Enlaces de Documentación

- **[Documentación de la Unidad 2: Especificación y Persistencia Local](ESPECIFICACION.md)**
- **[Documentación de la Unidad 3: Arquitectura Distribuida y Servicios REST](docs/unidad-3/README.md)**
- **[Servidor REST y Entorno Docker](servidor/LEEME.md)**
- **[Repositorio en GitHub](https://github.com/Mogollo7/agenda)**
