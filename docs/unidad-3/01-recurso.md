# 01 · Identificación y Modelado del Recurso: Inspección

## 1. Selección y Justificación del Recurso

En el desarrollo de **InspectApp**, el recurso central sobre el cual gira todo el dominio de la aplicación es la **Inspección**. 

Una inspección representa el levantamiento de una novedad, falla física, requerimiento de mantenimiento preventivo/correctivo o riesgo de seguridad detectado durante la revisión de un recinto físico dentro de una institución (por ejemplo: un aula de clases, un laboratorio de cómputo, una sala de juntas o una zona común).

### ¿Por qué Inspección y no un «reporte de mantenimiento» genérico?
En revisiones preliminares y borradores iniciales se consideró modelar una entidad genérica como `Reporte` con atributos vagos (`titulo`, `ubicacion`). Sin embargo, dicho enfoque presentaba serias deficiencias:
1. **Desacople con la interfaz:** La aplicación móvil desarrollada en la Unidad 2 (`App.js` y `src/store.js`) ya cuenta con controles especializados para seleccionar el espacio físico y la categoría técnica de la novedad.
2. **Validaciones existentes en cliente:** InspectApp ya valida que la descripción contenga al menos 10 caracteres y restringe las categorías a conjuntos cerrados de opciones (`ESPACIOS`, `TIPOS`, `PRIORIDADES`).
3. **Consistencia técnica:** Adoptar el recurso real `Inspección` permite que el contrato de la API REST refleje con precisión matemática el modelo de datos de la interfaz de usuario, minimizando capas innecesarias de transformación.

---

## 2. Representación JSON del Recurso

A continuación se presenta la estructura canónica en formato JSON con la que el servicio backend entrega el recurso tras su almacenamiento centralizado:

```json
{
  "id": 27,
  "idLocal": "1763316000000",
  "espacio": "Laboratorio",
  "tipo": "Eléctrica",
  "descripcion": "Tomacorriente de la mesa 3 sin energía",
  "prioridad": "Alta",
  "estado": "Pendiente",
  "creada": "2026-11-16T14:30:00.000Z",
  "actualizada": "2026-11-16T14:30:00.000Z"
}
```

---

## 3. Especificación de Atributos

| Atributo | Tipo de dato | Restricción / Formato | Descripción técnica y propósito |
|---|---|---|---|
| `id` | `INTEGER` | Clave primaria autoincremental (`PRIMARY KEY AUTOINCREMENT`) | Identificador único global asignado por la base de datos central del servidor. Es la referencia canónica en las rutas de la API (`/inspecciones/:id`). |
| `idLocal` | `TEXT` | Cadena única (`UNIQUE`), 13 dígitos numéricos | Identificador generado por el dispositivo móvil en el momento de crear el registro (`Date.now().toString()`). Permite identificar de forma unívoca un reenvío y evitar duplicados en la base de datos central ante reconexiones. |
| `espacio` | `TEXT` | `Aula` \| `Laboratorio` \| `Sala` \| `Zona común` | Ubicación o recinto físico donde se realizó la inspección. Corresponde a la constante `ESPACIOS` de la aplicación móvil. |
| `tipo` | `TEXT` | `Eléctrica` \| `Estructural` \| `Limpieza` \| `Equipamiento` \| `Seguridad` \| `Otra` | Clasificación técnica de la novedad observada. Corresponde a la constante `TIPOS` de la aplicación móvil. |
| `descripcion` | `TEXT` | Cadena de texto de 10 a 300 caracteres | Detalle descriptivo de la anomalía física observada. Respeta la regla de validación de negocio existente en el cliente móvil. |
| `prioridad` | `TEXT` | `Baja` \| `Media` \| `Alta` | Nivel de severidad o urgencia para la atención de la novedad. |
| `estado` | `TEXT` | `Pendiente` \| `Resuelta` (por defecto `Pendiente`) | Situación operativa de la novedad. Reemplaza el booleano `resuelta` de la aplicación local, permitiendo mayor claridad semántica en la API. |
| `creada` | `TEXT` | Estándar ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`) | Marca de tiempo que registra el momento exacto en que el inspector levantó la novedad en el dispositivo móvil. |
| `actualizada` | `TEXT` | Estándar ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`) | Marca de tiempo que registra la última modificación del registro en el servidor. Es la base del mecanismo de control de versiones optimista (detección de conflictos HTTP 409). |

---

## 4. Correspondencia entre la Aplicación Móvil y el Servidor

Durante la Unidad 2, la aplicación almacenaba sus objetos directamente en el almacenamiento local del dispositivo mediante la clave `inspect.items.v1` de `AsyncStorage`. Al evolucionar hacia una arquitectura orientada a servicios, se estableció un mapeo bidireccional riguroso:

| Elemento en la App Móvil (`src/store.js`) | Equivalente en la API REST (`server.js`) | Justificación técnica de la transformación |
|---|---|---|
| `id`: `"1794863380620"` (String) | `idLocal`: `"1794863380620"`<br>`id`: `1` (Integer autoincremental) | En una arquitectura distribuida, el cliente no puede dictar el identificador primario del servidor central, ya que múltiples dispositivos colisionarían. Por tanto, el ID temporal de la app se preserva como `idLocal` (garantía de idempotencia), y el servidor asigna un `id` secuencial global. |
| `creada`: `1794863380620` (Entero en milisegundos) | `creada`: `"2026-11-16T14:30:00.000Z"` (String ISO 8601) | Los milisegundos Unix son prácticos para ordenación en JavaScript, pero en APIs REST públicas se exige el estándar ISO 8601 con indicación explícita de huso horario (`Z` para UTC), facilitando la interoperabilidad con clientes en otros lenguajes o plataformas. |
| `resuelta`: `false` / `true` (Booleano) | `estado`: `"Pendiente"` / `"Resuelta"` (String) | Un booleano binario (`resuelta: false`) dificulta la extensión futura de estados intermedios (como `"En revisión"` o `"Descartada"`). Un atributo textual con validación controlada ofrece mayor expresividad en la API. |
| *(No existía en la app local)* | `actualizada`: `"2026-11-16T21:12:21.259Z"` | En local no existía el problema de concurrencia. En un entorno multiusuario distribuido, se requiere registrar el instante de última modificación para evitar que una edición desactualizada sobrescriba cambios más recientes de otro inspector. |

### Comparativa lado a lado de estructuras de datos

#### Registro real almacenado en el AsyncStorage del teléfono móvil (`app-asyncstorage.json`):
```json
{
  "id": "1794863370454",
  "creada": 1794863370454,
  "resuelta": true,
  "espacio": "Laboratorio",
  "tipo": "Eléctrica",
  "descripcion": "Tomacorriente de la mesa 3 sin energía",
  "prioridad": "Alta"
}
```

#### Registro equivalente expuesto por la API REST central (`GET /api/v1/inspecciones/1`):
```json
{
  "id": 1,
  "idLocal": "1794863370454",
  "espacio": "Laboratorio",
  "tipo": "Eléctrica",
  "descripcion": "Tomacorriente de la mesa 3 sin energía",
  "prioridad": "Alta",
  "estado": "Resuelta",
  "creada": "2026-11-16T14:30:00.000Z",
  "actualizada": "2026-11-16T21:12:22.045Z"
}
```
