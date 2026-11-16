# 03 · Referencia Completa de la API REST

## 1. Información General y Convenciones

- **URL Base:** `https://api.dominio/api/v1` (en desarrollo local: `http://127.0.0.1:3000/api/v1`).
- **Formato de intercambio:** `application/json; charset=utf-8`.
- **Cabeceras globales en todas las respuestas:**
  - `Content-Type: application/json` (excepto respuestas 204 No Content).
  - `X-Content-Type-Options: nosniff` (previene ataques de sniffing de tipo MIME).
  - `Cache-Control: no-store` (evita almacenamiento intermedio de datos confidenciales o transaccionales en proxies).
- **Esquema de Autenticación:**
  - Obligatoria para todas las operaciones mutables (`POST`, `PATCH`, `DELETE`).
  - Cabecera requerida: `Authorization: Bearer <API_TOKEN>`.
  - El servidor valida el token mediante comparación en tiempo constante (`crypto.timingSafeEqual`) para anular cualquier intento de ataque de temporización (*timing attacks*).
  - Si el token está ausente, malformado o no coincide, el servidor responde inmediatamente con código `401 Unauthorized`.

---

## 2. Catálogo Detallado de Endpoints

### 2.1. Comprobación de Salud (`Health Check`)
Permite a los orquestadores de contenedores (Docker compose, Kubernetes) verificar la disponibilidad operativa del proceso.

- **Método:** `GET`
- **Ruta:** `/salud`
- **Autenticación requerida:** No
- **Parámetros:** Ninguno
- **Cuerpo de solicitud:** Vacío
- **Respuesta exitosa (200 OK):**
  ```json
  {
    "ok": true
  }
  ```

---

### 2.2. Listar Inspecciones (Colección)
Recupera el listado paginado y filtrable de las inspecciones registradas centralmente.

- **Método:** `GET`
- **Ruta:** `/inspecciones`
- **Autenticación requerida:** No
- **Parámetros de consulta (Query Params):**
  - `estado` *(opcional, string)*: Filtra por situación de la inspección (`Pendiente` o `Resuelta`).
  - `espacio` *(opcional, string)*: Filtra por espacio físico (`Aula`, `Laboratorio`, `Sala`, `Zona común`).
  - `limit` *(opcional, entero)*: Cantidad de registros por página. Valor por defecto: `20`. Límite superior estricto: `50` (si el cliente envía un número mayor, el servidor lo trunca internamente a 50).
  - `offset` *(opcional, entero)*: Desplazamiento de registros para paginación. Valor por defecto: `0`.
- **Cuerpo de solicitud:** Vacío
- **Respuesta exitosa (200 OK):**
  ```json
  {
    "datos": [
      {
        "id": 4,
        "idLocal": null,
        "espacio": "Zona común",
        "tipo": "Seguridad",
        "descripcion": "Extintor del pasillo norte vencido desde octubre",
        "prioridad": "Alta",
        "estado": "Pendiente",
        "creada": "2026-11-16T21:12:21.365Z",
        "actualizada": "2026-11-16T21:12:21.365Z"
      },
      {
        "id": 3,
        "idLocal": null,
        "espacio": "Sala",
        "tipo": "Equipamiento",
        "descripcion": "Proyector de la sala de reuniones no enciende",
        "prioridad": "Baja",
        "estado": "Pendiente",
        "creada": "2026-11-16T21:12:21.350Z",
        "actualizada": "2026-11-16T21:12:21.350Z"
      }
    ],
    "total": 4,
    "limit": 5,
    "offset": 0
  }
  ```

---

### 2.3. Consultar una Inspección Específica
Obtiene los detalles completos de una inspección identificada por su ID único global.

- **Método:** `GET`
- **Ruta:** `/inspecciones/:id`
- **Autenticación requerida:** No
- **Parámetros de ruta:**
  - `:id` *(entero positivo)*: Identificador del recurso en el servidor.
- **Cuerpo de solicitud:** Vacío
- **Respuestas:**
  - **200 OK:** Devuelve el objeto JSON de la inspección.
  - **404 Not Found:** Si el registro con ese ID no existe o fue eliminado.
    ```json
    {
      "error": "No encontrado"
    }
    ```

---

### 2.4. Registrar una Nueva Inspección (Creación e Idempotencia)
Crea una nueva inspección en la base de datos central o devuelve de forma transparente un registro preexistente si se detecta un reintento del mismo `idLocal`.

- **Método:** `POST`
- **Ruta:** `/inspecciones`
- **Autenticación requerida:** Sí (`Authorization: Bearer <API_TOKEN>`)
- **Cabeceras obligatorias:**
  - `Content-Type: application/json`
- **Cuerpo de solicitud (JSON):**
  ```json
  {
    "idLocal": "1763316000000",
    "espacio": "Laboratorio",
    "tipo": "Eléctrica",
    "descripcion": "Tomacorriente de la mesa 3 sin energía",
    "prioridad": "Alta",
    "creada": "2026-11-16T14:30:00.000Z"
  }
  ```
- **Lógica de Idempotencia mediante `idLocal`:**
  Antes de insertar, el servidor consulta si ya existe una fila con dicho `idLocal`. Si existe, no crea un duplicado ni arroja un error: devuelve código `200 OK` con el registro ya guardado previamente.
- **Respuestas:**
  - **201 Created (Inserción nueva exitosa):**
    - Cabecera: `Location: /api/v1/inspecciones/1`
    - Cuerpo: Objeto JSON con `id` asignado, `estado: "Pendiente"` y marca `actualizada`.
  - **200 OK (Reintento idempotente exitoso):** Devuelve el objeto existente sin duplicar.
  - **400 Bad Request:** Payload malformado o error en las validaciones de campos.
  - **401 Unauthorized:** Token ausente o incorrecto.
  - **413 Payload Too Large:** Cuerpo de la petición superior a 16 KB (16.384 bytes).
  - **415 Unsupported Media Type:** Falta o es incorrecto el `Content-Type: application/json`.

---

### 2.5. Actualización Parcial de una Inspección (Control de Concurrencia)
Modifica uno o más atributos específicos de una inspección sin sobreescribir la totalidad del documento.

> [!NOTE]
> **¿Por qué PATCH y no PUT?**  
> En la aplicación móvil, las acciones comunes del usuario consisten en actualizar una propiedad puntual (por ejemplo, oprimir el botón «Marcar resuelta»). Utilizar `PUT` obligaría al cliente a transmitir la totalidad del recurso (espacio, tipo, descripción, fecha de creación original), aumentando el consumo de datos móviles y generando riesgos de inconsistencia si otro inspector modificó la descripción mientras tanto. `PATCH` aplica únicamente los campos enviados en el cuerpo.

- **Método:** `PATCH`
- **Ruta:** `/inspecciones/:id`
- **Autenticación requerida:** Sí (`Authorization: Bearer <API_TOKEN>`)
- **Cuerpo de solicitud (JSON parcial):**
  ```json
  {
    "estado": "Resuelta",
    "actualizada": "2026-11-16T21:12:21.259Z"
  }
  ```
- **Control de Concurrencia Optimista con `actualizada`:**
  Si el cliente envía la propiedad `actualizada` correspondiente a la versión que tenía en su pantalla, el servidor compara:
  `clientDate < serverDate`
  Si la versión del cliente es anterior a la fecha de última modificación registrada en la base de datos central, el servidor **rechaza la actualización con código 409 Conflict** y entrega el registro vigente en el servidor para que el cliente resuelva la discrepancia.
- **Respuestas:**
  - **200 OK:** Objeto actualizado con nueva marca `actualizada`.
  - **400 Bad Request:** Campos inválidos o tipos erróneos.
  - **401 Unauthorized:** Token no provisto o inválido.
  - **404 Not Found:** Inspección no existe.
  - **409 Conflict:** Conflicto de versiones. Cuerpo retornado:
    ```json
    {
      "error": "conflicto",
      "servidor": {
        "id": 1,
        "idLocal": "1763316000000",
        "espacio": "Laboratorio",
        "tipo": "Eléctrica",
        "descripcion": "Tomacorriente de la mesa 3 sin energía",
        "prioridad": "Alta",
        "estado": "Resuelta",
        "creada": "2026-11-16T14:30:00.000Z",
        "actualizada": "2026-11-16T21:12:22.045Z"
      }
    }
    ```

---

### 2.6. Eliminar una Inspección
Elimina de forma permanente el registro del sistema central.

- **Método:** `DELETE`
- **Ruta:** `/inspecciones/:id`
- **Autenticación requerida:** Sí (`Authorization: Bearer <API_TOKEN>`)
- **Cuerpo de solicitud:** Vacío
- **Respuestas:**
  - **204 No Content:** Eliminación exitosa (sin cuerpo en la respuesta).
  - **401 Unauthorized:** Token ausente o inválido.
  - **404 Not Found:** La inspección a eliminar no existe en la base de datos.

---

## 3. Matriz Exhaustiva de Códigos de Estado HTTP

| Código | Significado semántico | Escenario en la API de InspectApp |
|---|---|---|
| **200 OK** | Operación exitosa con cuerpo | - `GET /salud`: Servicio operativo.<br>- `GET /inspecciones`: Retorno de listado o detalle.<br>- `POST /inspecciones`: Reenvío idempotente reconocido.<br>- `PATCH /inspecciones/:id`: Actualización parcial exitosa. |
| **201 Created** | Recurso creado exitosamente | Retornado tras un `POST` nuevo. Incluye cabecera `Location` con la URI canónica del nuevo recurso. |
| **204 No Content** | Acción exitosa sin contenido | Retornado tras un `DELETE` exitoso. |
| **400 Bad Request** | Solicitud malformada o inválida | JSON sintácticamente corrupto o campos que no superan las validaciones de negocio. |
| **401 Unauthorized** | Autenticación fallida o ausente | Falta de cabecera `Authorization` o token Bearer no coincidente en métodos de escritura. |
| **404 Not Found** | Recurso no encontrado | Consulta o modificación sobre un ID inexistente, o ruta de endpoint no registrada. |
| **405 Method Not Allowed** | Verbo HTTP no soportado | Intento de ejecutar un método no contemplado sobre un endpoint (e.g. `PUT /inspecciones/1`). |
| **409 Conflict** | Conflicto de versión concurrente | Detección de edición sobre una versión obsoleta en `PATCH` (versión cliente < versión servidor). |
| **413 Payload Too Large** | Carga útil excesiva | Cuerpo de solicitud que supera el límite de seguridad de 16 KB (16.384 bytes). |
| **415 Unsupported Media Type** | Formato de medios no soportado | Petición con cuerpo que no declara `Content-Type: application/json`. |
| **429 Too Many Requests** | Tasa de peticiones superada | Cliente que excede el umbral de 60 peticiones por minuto. Incluye cabecera `Retry-After`. |
| **500 Internal Server Error** | Error no controlado del servidor | Excepción no capturada en tiempo de ejecución (protegida por el manejador global del servidor). |

---

## 4. Catálogo de Validaciones de Negocio

El backend implementa validaciones estrictas en la función `validar(body, parcial)` de `server.js` (líneas 118 a 138), coincidiendo con las restricciones de la aplicación móvil:

| Atributo | Lista permitida / Restricción de valor | Mensaje de error retornado |
|---|---|---|
| `espacio` | `['Aula', 'Laboratorio', 'Sala', 'Zona común']` | `"Debe ser uno de: Aula, Laboratorio, Sala, Zona común"` |
| `tipo` | `['Eléctrica', 'Estructural', 'Limpieza', 'Equipamiento', 'Seguridad', 'Otra']` | `"Debe ser uno de: Eléctrica, Estructural, Limpieza, Equipamiento, Seguridad, Otra"` |
| `prioridad` | `['Baja', 'Media', 'Alta']` | `"Debe ser uno de: Baja, Media, Alta"` |
| `descripcion` | Tipo `string`, longitud mínima: **10**, máxima: **300** caracteres | `"Debe tener entre 10 y 300 caracteres"` |
| `estado` | `['Pendiente', 'Resuelta']` | `"Debe ser uno de: Pendiente, Resuelta"` |

Estructura canónica de respuesta ante fallos de validación (HTTP 400):
```json
{
  "error": "validacion",
  "campos": {
    "descripcion": "Debe tener entre 10 y 300 caracteres"
  }
}
```
