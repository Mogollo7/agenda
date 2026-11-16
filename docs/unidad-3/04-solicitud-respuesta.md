# 04 · Solicitud y Respuesta HTTP: Creación e Idempotencia

En este documento se analiza en profundidad una transacción completa de creación de un recurso en el servidor de **InspectApp**, basada en los datos obtenidos de la ejecución real de pruebas contenida en el archivo [`evidencia/02-crear.txt`](./evidencia/02-crear.txt), y su posterior reenvío idempotente registrado en [`evidencia/03-crear-repetido.txt`](./evidencia/03-crear-repetido.txt).

---

## 1. Transacción de Creación Exitosa (HTTP 201 Created)

Cuando el inspector completa el formulario en la aplicación móvil y dispone de enlace de datos, el cliente emite una petición `POST` al endpoint `/api/v1/inspecciones`.

### 1.1. Solicitud Emitida por el Cliente Móvil

```http
POST /api/v1/inspecciones HTTP/1.1
Host: 127.0.0.1:3000
User-Agent: curl/8.4.0 (InspectApp-Mobile/1.0)
Accept: */*
Content-Type: application/json
Authorization: Bearer <token>
Content-Length: 201

{
  "idLocal": "1763316000000",
  "espacio": "Laboratorio",
  "tipo": "Eléctrica",
  "descripcion": "Tomacorriente de la mesa 3 sin energía",
  "prioridad": "Alta",
  "creada": "2026-11-16T14:30:00.000Z"
}
```

#### Atributos enviados por el cliente:
- `idLocal`: Identificador temporal único originado en el dispositivo (`Date.now()`).
- `espacio`: Categoría del recinto (`Laboratorio`).
- `tipo`: Clasificación de la anomalía (`Eléctrica`).
- `descripcion`: Detalle textual de 39 caracteres (cumple con la cota de 10 a 300 caracteres).
- `prioridad`: Nivel de atención asignado por el usuario (`Alta`).
- `creada`: Fecha y hora UTC del momento en que se redactó la inspección en el teléfono.

---

### 1.2. Respuesta Entregada por el Servidor REST

```http
HTTP/1.1 201 Created
Location: /api/v1/inspecciones/1
Content-Type: application/json
X-Content-Type-Options: nosniff
Cache-Control: no-store
Date: Mon, 16 Nov 2026 21:12:21 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{
  "id": 1,
  "idLocal": "1763316000000",
  "espacio": "Laboratorio",
  "tipo": "Eléctrica",
  "descripcion": "Tomacorriente de la mesa 3 sin energía",
  "prioridad": "Alta",
  "estado": "Pendiente",
  "creada": "2026-11-16T14:30:00.000Z",
  "actualizada": "2026-11-16T21:12:21.259Z"
}
```

#### Elementos clave de la respuesta:
1. **Código `201 Created`:** Indica que el recurso fue creado satisfactoriamente en el almacenamiento central.
2. **Cabecera `Location: /api/v1/inspecciones/1`:** Comunica la URI canónica donde el cliente puede consultar el recurso en lo sucesivo.
3. **`id: 1`:** El servidor asignó el primer identificador entero autoincremental de la base de datos central.
4. **`estado: "Pendiente"`:** Inicializado automáticamente por las reglas del negocio en el backend.
5. **`actualizada: "2026-11-16T21:12:21.259Z"`:** Marca temporal precisa asignada por el reloj del servidor para el posterior control de versiones.
6. **Cabeceras de protección:** `X-Content-Type-Options: nosniff` y `Cache-Control: no-store`.

---

## 2. Reenvío Idempotente ante Fallos de Conexión (HTTP 200 OK)

### 2.1. El Problema del Corte de Red Asimétrico
En aplicaciones móviles sobre redes celulares (3G/4G/5G) o redes Wi-Fi institucionales con cobertura irregular, ocurre con frecuencia el siguiente escenario:

```text
Aplicación Móvil                        Servidor REST
       |                                      |
       |----- POST /inspecciones ------------>| (Petición llega al servidor)
       |                                      | (Servidor procesa e inserta: id=1)
       |                                      |
       |<- - - [CORTE DE SEÑAL / TIMEOUT] - - | (La respuesta 201 nunca llega al móvil)
       x                                      |
(La app no sabe si se guardó)                 |
```

Al reconectarse a la red, la cola de sincronización de la app móvil vuelve a intentar el envío de la misma inspección para evitar que la información se pierda.

Si el backend implementara un `POST` ingenuo sin control de idempotencia, se producirían dos problemas graves:
- Se insertaría un segundo registro idéntico con `id=2` (duplicación de datos).
- O la base de datos rechazaría con un error interno `500` por colisión de clave única, provocando pánico en el cliente móvil.

---

### 2.2. Solicitud de Reenvío con el Mismo `idLocal`

El cliente retransmite el payload manteniendo exactamente el mismo `idLocal`:

```http
POST /api/v1/inspecciones HTTP/1.1
Host: 127.0.0.1:3000
Content-Type: application/json
Authorization: Bearer <token>

{
  "idLocal": "1763316000000",
  "espacio": "Laboratorio",
  "tipo": "Eléctrica",
  "descripcion": "Tomacorriente de la mesa 3 sin energía",
  "prioridad": "Alta"
}
```

---

### 2.3. Respuesta Idempotente del Servidor (Evidencia 03)

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Content-Type-Options: nosniff
Cache-Control: no-store
Date: Mon, 16 Nov 2026 21:12:21 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{
  "id": 1,
  "idLocal": "1763316000000",
  "espacio": "Laboratorio",
  "tipo": "Eléctrica",
  "descripcion": "Tomacorriente de la mesa 3 sin energía",
  "prioridad": "Alta",
  "estado": "Pendiente",
  "creada": "2026-11-16T14:30:00.000Z",
  "actualizada": "2026-11-16T21:12:21.259Z"
}
```

### 2.4. Análisis del Mecanismo en el Servidor
En `server.js` (líneas 261-265):

```javascript
// Idempotencia por idLocal
if (body.idLocal) {
  const dup = stmts.byLocal.get(body.idLocal);
  if (dup) return send(res, 200, row2json(dup));
}
```

1. El servidor evalúa la presencia de `body.idLocal`.
2. Ejecuta una consulta indexada inmediata (`SELECT * FROM inspecciones WHERE id_local = ?`).
3. Si la fila ya existe, **no ejecuta el `INSERT`**.
4. Retorna el registro existente con **código `200 OK`** (en lugar de `201 Created`).
5. La aplicación móvil recibe el `id: 1` asignado por el servidor, marca el estado local como `sync: "confirmada"` y vacía dicho elemento de su cola de pendientes de forma transparente y segura.
