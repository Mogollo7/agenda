# 07 · Seguridad y Operación en Producción

## 1. Principios de Seguridad del Equipo de Ingeniería

La seguridad en **InspectApp** no se concibe como un agregado posterior, sino como un principio de diseño transversal (*Security by Design*) aplicado tanto a nivel de arquitectura como de infraestructura y código. 

A continuación se desarrollan las directrices técnicas del equipo y su implementación concreta en el sistema.

---

## 2. Desarrollo Exhaustivo de las Consideraciones de Seguridad

### 2.1. Arquitectura en Capas frente a Microservicios
- **El riesgo de microservicios prematuros:** Distribuir una aplicación de un solo recurso en múltiples microservicios multiplica la superficie de ataque: requiere gestionar credenciales y certificados TLS entre servicios (*mTLS*), expone puertos internos adicionales y complica el registro de auditoría centralizado.
- **La ventaja de las capas:** Organizar la aplicación como un monolito modular por capas mantiene la lógica de negocio, validaciones y acceso a datos en un perímetro de seguridad unificado y cerrado, sin tráfico de red no autenticado entre componentes internos.

---

### 2.2. Contenedores con Imágenes Ligeras Alpine y Mínimo Privilegio
- **Reducción radical de superficie de ataque:** Se utiliza la imagen base `node:24-alpine` con un tamaño de 244 MB en disco (62.5 MB comprimida). Al prescindir de gestores de paquetes pesados, compiladores C/C++ y binarios auxiliares innecesarios presentes en distribuciones completas como Ubuntu o Debian, se elimina más del 80% de las vulnerabilidades comunes (CVEs) reportadas en la cadena base.
- **Ejecución como usuario no privilegiado (`USER node`):** El contenedor jamás ejecuta el proceso como `root`. De existir una vulnerabilidad en el intérprete, el atacante queda confinado al usuario `node` (UID 1000) sin privilegios de administración en el kernel del host.
- **Defensa en profundidad en el contenedor:**
  - `read_only: true`: Sistema de archivos inmutable; el atacante no puede inyectar scripts maliciosos en disco.
  - `security_opt: [no-new-privileges:true]`: Bloquea cualquier intento de escalada mediante binarios setuid/setgid.
  - `cap_drop: [ALL]`: Se retiran todas las capacidades especiales de Linux (como `CAP_NET_RAW` o `CAP_SYS_ADMIN`).
  - `tmpfs: [/tmp]`: Archivos temporales confinados estrictamente a memoria volátil.

---

### 2.3. Aislamiento y Subdominio Propio con TLS
- **Segmentación de dominio:** La API se publica bajo un subdominio dedicado (por ejemplo, `https://api.dominio`) y los servicios de identidad en `https://auth.dominio`.
- **Mitigación de riesgos web:** Aislar la API en su propio subdominio previene la filtración cruzada de cookies de sesión entre la interfaz web y la API REST, habilitando directivas `SameSite: Strict` y cabeceras estrictas de transporte HTTP (`Strict-Transport-Security` / HSTS).

---

### 2.4. Límites Estrictos en Endpoints: Riesgo de Agotamiento de Recursos (DoS)
Un servicio REST sin límites defensivos es vulnerable a colapsar por agotamiento de memoria, CPU o almacenamiento en disco:

1. **Límite de tamaño de cuerpo (16 KB):**
   - *Riesgo:* Un atacante que transmita una carga masiva (e.g. un JSON de 500 MB o varios terabytes) agotará el espacio de memoria heap de Node.js (*Heap Out of Memory*), provocando el bloqueo del *event loop* y el reinicio abrupto del proceso.
   - *Mitigación:* La función `readBody()` en `server.js` monitorea los fragmentos entrantes del stream HTTP; si el tamaño acumulado supera los 16 KB (`16 * 1024` bytes), aborta inmediatamente la lectura con `req.resume()` y responde con **HTTP 413 Payload Too Large**.
2. **Límite de frecuencia (*Rate Limiting* - 60 peticiones/minuto por IP):**
   - *Riesgo:* Ataques de fuerza bruta sobre el token o saturación masiva de sockets de red.
   - *Mitigación:* La función `rateOk(ip)` mantiene un control temporal en memoria por dirección IP. Al superar las 60 peticiones en una ventana de 60 segundos, responde con **HTTP 429 Too Many Requests** e inyecta la cabecera estándar `Retry-After: <segundos>`.
3. **Límite forzado en consultas paginadas (Máximo 50 registros):**
   - *Riesgo:* Si un cliente ejecuta `GET /inspecciones?limit=1000000`, la base de datos cargaría cientos de miles de filas en memoria de golpe, degradando severamente el rendimiento del servidor.
   - *Mitigación:* El endpoint de listado aplica un truncamiento determinista: `Math.min(limit, 50)`, impidiendo lecturas masivas no autorizadas.

---

### 2.5. Carga de Archivos Controlada (Fotos de Evidencia)
Para la futura fase en la que los inspectores adjunten evidencias fotográficas de las averías:
- **Límite de peso:** Máximo 5 MB por archivo.
- **Validación por Magic Bytes:** Prohibido confiar en la extensión del archivo (`.jpg`, `.png`) o en la cabecera `Content-Type` enviada por el cliente. El backend inspeccionará los primeros bytes binarios en memoria para validar la firma real del formato gráfico (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`).
- **Sanitización de metadatos EXIF:** Las fotografías tomadas con teléfonos móviles contienen coordenadas GPS precisas y números de serie del dispositivo. El backend debe despojar los metadatos EXIF antes del almacenamiento para proteger la privacidad del inspector y la seguridad física de los recintos.
- **Almacenamiento en Object Storage:** Las fotos nunca se guardarán en el sistema de archivos del servidor web; se transferirán directamente a un almacén de objetos (S3 / MinIO) con acceso privado mediante URLs prefirmadas.

---

### 2.6. Erradicación de Shells y Ejecución Remota de Código (RCE)
- **Cero comandos de sistema:** El backend no contiene ni contendrá llamadas a funciones de ejecución de procesos como `child_process.exec()`, `execSync()`, `spawn()` ni intérpretes dinámicos como `eval()` o `new Function()`.
- **Prevención de RCE:** La ejecución remota de comandos es la vulnerabilidad más crítica en aplicaciones web (permite a un atacante tomar control del servidor host). Al no existir llamadas a shell y combinarse con un contenedor en modo `read_only`, la posibilidad de inyección de comandos queda completamente anulada.

---

### 2.7. Webhooks Firmados Criptográficamente (HMAC + Timestamp)
Cuando el servidor deba notificar en tiempo real a sistemas externos (por ejemplo, abrir una orden de trabajo en el ERP institucional cuando se crea una inspección con `prioridad: "Alta"`):

- **El riesgo:** Un endpoint de webhook sin verificación permite a un atacante falsificar solicitudes simulando ser InspectApp y detonar acciones no autorizadas en sistemas de terceros.
- **El mecanismo de defensa:** Cada despacho de webhook debe incluir:
  - Cabecera `X-Webhook-Timestamp`: Marca temporal UTC de la emisión.
  - Cabecera `X-Webhook-Signature`: Firma criptográfica HMAC-SHA256 computada a partir del timestamp y el cuerpo exacto del mensaje, utilizando una clave secreta compartida.

#### Ejemplo de implementación y verificación de Webhook en Node.js:
```javascript
const crypto = require('node:crypto');

/**
 * Valida la firma HMAC y la ventana de frescura temporal de un webhook entrante.
 * @param {string} payload - Cuerpo crudo de la petición en texto plano.
 * @param {string} signatureHeader - Contenido de X-Webhook-Signature (formato "sha256=...").
 * @param {string} timestampHeader - Contenido de X-Webhook-Timestamp (epoch en milisegundos o ISO).
 * @param {string} secret - Clave secreta compartida entre ambos sistemas.
 * @returns {boolean} - true si el webhook es legítimo y vigente; false en caso contrario.
 */
function verificarFirmaWebhook(payload, signatureHeader, timestampHeader, secret) {
  if (!signatureHeader || !timestampHeader || !secret) return false;

  // 1. Mitigación de Ataques de Repetición (Replay Attacks):
  // Rechazar mensajes con más de 5 minutos (300.000 ms) de antigüedad o en el futuro.
  const ahora = Date.now();
  const timestampMensaje = parseInt(timestampHeader, 10);
  if (isNaN(timestampMensaje) || Math.abs(ahora - timestampMensaje) > 300_000) {
    return false; // El mensaje expiró o es un intento de repetición
  }

  // 2. Computar el HMAC esperado sobre la concatenación: timestamp + "." + payload
  const datosParaFirmar = `${timestampHeader}.${payload}`;
  const hmacCalculado = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(datosParaFirmar, 'utf8')
    .digest('hex');

  // 3. Comparación en tiempo constante para evitar ataques de timing
  const bufCalculado = Buffer.from(hmacCalculado, 'utf8');
  const bufRecibido = Buffer.from(signatureHeader, 'utf8');

  if (bufCalculado.length !== bufRecibido.length) return false;
  return crypto.timingSafeEqual(bufCalculado, bufRecibido);
}
```

---

### 2.8. Gestión de Dependencias y Cadena de Suministro
- **El problema:** La mayoría de incidentes de seguridad modernos se originan en librerías de terceros desactualizadas o comprometidas en el registro npm (*supply chain attacks*).
- **La solución de InspectApp:**
  - El servidor `server.js` fue concebido con **CERO dependencias externas npm**.
  - Se aprovechan las APIs nativas introducidas en **Node.js 24**:
    - `node:sqlite` para la base de datos transaccional integrada.
    - `node:crypto` para tokens, HMAC y comparaciones en tiempo constante.
    - `node:http` para el servidor HTTP de alto rendimiento.
    - `node:fs` y `node:path` para la gestión de volúmenes.
  - Al no existir `node_modules` de terceros en el servidor, no hay dependencias transitivas vulnerables, reduciendo a cero el tiempo de remediación de auditorías `npm audit`.

---

## 3. Matriz de Trazabilidad: Qué Aplica el Servidor `server.js`

A continuación se detalla la correspondencia exacta entre las políticas de seguridad y las líneas de código implementadas en el proyecto:

| Política de Seguridad | Componente | Ubicación en el código | Detalle de la implementación técnica |
|---|---|---|---|
| **Autenticación Bearer** | `server.js` | Líneas 107–116 (`checkAuth`) | Exige prefijo `Bearer ` y compara el token con `crypto.timingSafeEqual` para anular ataques de temporización. |
| **Límite de tamaño de cuerpo (16 KB)** | `server.js` | Líneas 15, 87–105 (`readBody`) | `MAX_BODY = 16 * 1024`. Drena el stream con `req.resume()` y aborta con código 413 si se supera el tope. |
| **Control de tasa (*Rate Limit* - 60/min)** | `server.js` | Líneas 16–17, 43–56 (`rateOk`) | Registro en memoria por IP. Retorna 429 con cabecera `Retry-After: <segundos>` calculada dinámicamente. |
| **Paginación defensiva (Máx. 50)** | `server.js` | Líneas 176–177 | `Math.min(parseInt(limit), 50)`. Trunca automáticamente cualquier valor excesivo para no saturar memoria. |
| **Prevención de MIME-Sniffing** | `server.js` | Líneas 73, 81 (`send`, `send204`) | Inyecta obligatoriamente la cabecera `X-Content-Type-Options: nosniff` en todas las respuestas. |
| **Control de almacenamiento en caché** | `server.js` | Líneas 74, 82 (`send`, `send204`) | Inyecta la cabecera `Cache-Control: no-store` para impedir que datos confidenciales queden en proxies intermedios. |
| **Validación de tipos y rangos** | `server.js` | Líneas 118–138 (`validar`) | Valida contra listas cerradas (`ESPACIOS`, `TIPOS`, `PRIORIDADES`) y acota descripción entre 10 y 300 caracteres. |
| **Control de concurrencia optimista** | `server.js` | Líneas 213–219 | Compara `clientDate < serverDate`. Si la versión enviada en `PATCH` es obsoleta, rechaza con HTTP 409 Conflict. |
| **Usuario sin privilegios en Docker** | `Dockerfile` | Línea 5 | `USER node`. Impide la ejecución del proceso Node bajo privilegios de `root`. |
| **Sistema de archivos de solo lectura** | `compose.yaml` | Líneas 10–12 | `read_only: true` con almacenamiento volátil en `tmpfs: /tmp`. |
| **Aislamiento de capacidades Linux** | `compose.yaml` | Líneas 15–18 | `security_opt: [no-new-privileges:true]` y `cap_drop: [ALL]`. |
| **Acotamiento de CPU y Memoria** | `compose.yaml` | Líneas 13–14 | `mem_limit: 128m` y `cpus: 0.5`. Garantiza que el proceso no degrade el rendimiento del servidor host. |
| **Cero dependencias npm** | `server.js` | Líneas 5–9 | Utiliza exclusivamente módulos nativos de Node 24 (`node:http`, `node:sqlite`, `node:crypto`). |
