# 08 · Preguntas de Cierre y Consolidación Conceptual

A continuación se presentan las respuestas fundamentadas a las siete preguntas de consolidación técnica formuladas en la guía de la Unidad 3, contextualizadas en el diseño e implementación de **InspectApp**.

---

### Pregunta 1
**¿Qué diferencia existe entre almacenar la información únicamente en el dispositivo móvil y gestionarla a través de un servicio de backend?**

**Respuesta:**  
En un modelo exclusivamente local (como el implementado en la Unidad 2 mediante `AsyncStorage`), los datos residen confinados dentro del espacio de almacenamiento aislado (*sandbox*) del teléfono del usuario. Esto significa que:
1. Ningún otro usuario, inspector ni sistema centralizado de la institución puede consultar, validar o dar trámite a las novedades físicas registradas.
2. La integridad de la información depende totalmente del dispositivo físico: si el teléfono se extravía, se daña o el usuario desinstala la aplicación o limpia los datos del navegador, los registros se destruyen de manera irreversible.
3. No es posible ejecutar procesos agregados, análisis estadísticos globales, ni disparar flujos de trabajo administrativos.

Por el contrario, al gestionar la información a través de un servicio de backend (como el servidor REST implementado en la Unidad 3):
1. Los registros se transfieren hacia una base de datos centralizada y compartida (SQLite montada en volumen Docker o PostgreSQL), convirtiéndose en la fuente canónica de verdad institucional.
2. Las reglas de negocio, validaciones y permisos se aplican de forma rigurosa y uniforme en el servidor, impidiendo la corrupción de datos por clientes defectuosos o manipulados.
3. Se habilita la interoperabilidad en tiempo real: múltiples inspectores pueden revisar y actualizar inspecciones simultáneamente, y sistemas externos de mantenimiento pueden consumir la API para programar reparaciones técnicas.

---

### Pregunta 2
**¿Qué papel cumple el formato JSON en la comunicación entre la aplicación móvil y el servicio de backend?**

**Respuesta:**  
JSON (*JavaScript Object Notation*) actúa como el **estándar universal de intercambio de datos estructurados** entre el cliente y el servidor. Sus roles fundamentales son:
1. **Interoperabilidad e independencia de plataforma:** JSON es texto plano legible tanto por humanos como por máquinas, totalmente independiente del lenguaje de programación. Permite que una aplicación desarrollada en React Native (JavaScript/TypeScript sobre Node/Hermes) se comunique de manera fluida y sin conversiones exóticas con un servidor backend escrito en Node.js, Go, Python o Java, e interactúe con bases de datos relacionales o NoSQL.
2. **Cohesión arquitectónica en InspectApp:** La aplicación móvil ya utilizaba internamente cadenas JSON para serializar y deserializar sus colecciones en `AsyncStorage` (`storage.load` y `storage.save` en `src/store.js`). Al migrar al servicio remoto, la misma estructura de datos básica viaja en el cuerpo (*payload*) de las peticiones HTTP (`POST`, `PATCH`) y en las respuestas del servidor (`200 OK`, `201 Created`, `400 Bad Request`), reduciendo la sobrecarga de transformación de datos (*marshalling* y *unmarshalling*).
3. **Eficiencia en redes móviles:** Frente a formatos más verbosos y pesados como XML, JSON presenta un consumo de bytes significativamente menor, lo cual es crítico en conexiones móviles celulares de campo con ancho de banda limitado y latencias elevadas.

---

### Pregunta 3
**¿Por qué el uso de una API permite que múltiples dispositivos compartan información de manera centralizada?**

**Respuesta:**  
Una API (*Application Programming Interface*) desacopla la capa de almacenamiento y procesamiento de la capa de presentación, estableciendo un **contrato formal, público y agnóstico** (definido por rutas, verbos HTTP, esquemas JSON y códigos de estado estandarizados):
1. **Punto único de verdad e intermediación:** Todos los dispositivos móviles (teléfonos Android, iPhones, clientes web de escritorio) se comunican exclusivamente a través de los endpoints de la API (`/api/v1/inspecciones`). Ningún cliente tiene acceso directo ni arbitrario a las tablas de la base de datos central.
2. **Serialización y ordenamiento de accesos:** El backend actúa como un árbitro centralizado: valida las credenciales (Bearer tokens), verifica las restricciones de integridad de los datos, gestiona la concurrencia entre peticiones simultáneas y persiste las modificaciones de manera atómica (ACID).
3. **Distribución simétrica:** Cuando un inspector en el laboratorio 3 registra una novedad mediante `POST`, el backend la almacena; de inmediato, cualquier otro inspector o supervisor que ejecute `GET /inspecciones` recibirá la información actualizada en su pantalla, logrando una visión compartida y sincronizada de la infraestructura física en toda la institución.

---

### Pregunta 4
**¿Qué diferencia existe entre un método GET y un método POST en un servicio REST, y cuándo debe utilizarse cada uno?**

**Respuesta:**  
La distinción entre `GET` y `POST` radica en su **semántica operativa**, sus propiedades de **seguridad e idempotencia** y la forma en que transmiten los parámetros:

| Propiedad / Comportamiento | Método `GET` | Método `POST` |
|---|---|---|
| **Propósito principal** | Recuperar o consultar información existente sin alterar el estado del servidor. | Crear un nuevo recurso subordinado o procesar datos que producen efectos secundarios en el servidor. |
| **Seguridad HTTP** (*Safe*) | **Sí.** Una petición `GET` no debe mutar datos en el backend (solo lee). | **No.** Modifica el estado del sistema (inserta registros, dispara procesos). |
| **Idempotencia intrínseca** | **Sí.** Ejecutar `GET` diez veces seguidas produce el mismo resultado y el mismo estado en el servidor. | **No por defecto.** Ejecutar `POST` repetidamente crearía múltiples registros duplicados (a menos que se apliquen mecanismos de idempotencia como `idLocal`). |
| **Transmisión de parámetros** | Se transmiten en la URL a través de la cadena de consulta (*query string*): `/inspecciones?limit=5&estado=Pendiente`. | Se transmiten en el cuerpo estructurado de la petición (*body*) bajo `Content-Type: application/json`. |
| **Almacenamiento en caché** | Altamente almacenable en caché por navegadores, CDNs y proxies intermedios. | Por regla general, no se almacena en caché. |

#### ¿Cuándo debe utilizarse cada uno en InspectApp?
- Se utiliza **`GET`** al listar inspecciones (`GET /inspecciones`), filtrar por espacio o estado, o consultar el detalle individual de una avería (`GET /inspecciones/27`).
- Se utiliza **`POST`** exclusivamente cuando el usuario diligencia el formulario y confirma el levantamiento de una nueva inspección (`POST /inspecciones`). Para modificaciones puntuales de inspecciones ya existentes (como marcar una novedad como resuelta), se emplea **`PATCH`**.

---

### Pregunta 5
**¿Qué datos deberían permanecer almacenados localmente en el dispositivo para garantizar que la aplicación funcione sin conexión?**

**Respuesta:**  
Para brindar una experiencia *Offline-First* sólida sin saturar el almacenamiento del dispositivo ni generar vulnerabilidades de seguridad, la información local debe clasificarse estrictamente:

#### Datos que SÍ deben persistir localmente:
1. **La cola de sincronización de mutaciones pendientes:** Todas las inspecciones creadas o editadas mientras el dispositivo carecía de conectividad (`sync = "pendiente"`), preservando sus identificadores locales (`idLocal`) y marcas temporales originales (`creada`). Esta cola es vital para asegurar que ningún registro se pierda al reiniciar la aplicación o apagar el teléfono.
2. **Caché local de lectura:** Una réplica local de las inspecciones más recientes consultadas o asignadas al inspector, permitiéndole navegar por la lista, ver el historial y consultar detalles aun en sótanos o zonas sin cobertura.
3. **Preferencias de usuario y estado de la interfaz:** Configuraciones visuales guardadas en `AsyncStorage` (clave `inspect.prefs.v1`), como la escala de tamaño de fuente (`escala`) o la bandera de tutorial completado (`visto`).
4. **Archivos multimedia temporales en cola (futuro):** Fotografías tomadas como evidencia en el sistema de archivos local (`FileSystem.cacheDirectory`) hasta que se complete su subida hacia el almacén de objetos.

#### Datos que NUNCA deben residir en almacenamiento local sin cifrar:
- **Tokens de autenticación o secretos en texto plano:** Almacenar API tokens o contraseñas en `AsyncStorage` o `localStorage` es una práctica insegura susceptible a extracción por respaldos no protegidos o ataques en dispositivos con acceso root/jailbreak. Las credenciales deben custodiarse en el almacén seguro del sistema operativo (`expo-secure-store`, Keychain en iOS o Keystore en Android).

---

### Pregunta 6
**¿Qué problema podría presentarse si dos dispositivos intentan modificar el mismo registro de forma independiente y cómo podría mitigarse?**

**Respuesta:**  
El problema fundamental es la **condición de carrera por actualización concurrente** (*Lost Update Problem* o pérdida de actualización silenciosa):
- Supongamos que el Inspector A (en el Laboratorio 3) y el Inspector B (en la Oficina de Mantenimiento) descargan simultáneamente la inspección #1, la cual se encuentra en estado `Pendiente`.
- El Inspector B actualiza la prioridad a `Baja`.
- Minutos después, el Inspector A, quien aún tiene en su pantalla los datos desactualizados, pulsa el botón «Marcar resuelta» y envía su actualización.
- Si el backend aplica la modificación de A sin validar la versión que este tenía en pantalla, la edición del Inspector B se sobrescribe y desaparece silenciosamente del sistema sin que nadie sea alertado.

#### Mecanismo de Mitigación Implementado: Control de Concurrencia Optimista
Para mitigar este riesgo, InspectApp implementa un control de versiones basado en la marca temporal `actualizada`:
1. Cada vez que el servidor crea o modifica una inspección, estampa la fecha exacta en UTC dentro del campo `actualizada` (ejemplo: `"2026-11-16T21:12:21.259Z"`).
2. Cuando un cliente móvil desea aplicar un cambio parcial mediante `PATCH /inspecciones/1`, debe enviar en el cuerpo la marca `actualizada` que tenía el registro en su pantalla al momento de editarlo.
3. El backend compara las marcas: si la fecha enviada por el cliente es más antigua que la fecha almacenada en la base de datos central (`clientDate < serverDate`), el servidor **bloquea la operación y rechaza la petición con código HTTP 409 Conflict**.
4. En el cuerpo del error 409, el servidor adjunta el registro vigente actualizado. La aplicación móvil captura el conflicto y puede:
   - Aplicar automáticamente la regla «gana la más reciente» (*Last-Write-Wins*) para cambios de estado atómicos.
   - O desplegar una interfaz de conciliación visual permitiendo al inspector comparar ambas versiones y decidir qué información debe conservarse.

---

### Pregunta 7
**A partir de las necesidades de la aplicación del proyecto, ¿cuál debería ser la primera funcionalidad implementada en el backend y por qué?**

**Respuesta:**  
La primera funcionalidad indispensable que debió implementarse en el backend es el **registro y listado centralizado de inspecciones con soporte de cola de sincronización e idempotencia (`POST` y `GET /inspecciones`)**.

#### Justificación técnica y de negocio:
1. **Superación del límite crítico de la aplicación:** La persistencia local desarrollada en la Unidad 2 resolvió con éxito la experiencia de usuario y la validación en pantalla, pero presentaba un cuello de botella infranqueable: los datos no salían del teléfono. El objetivo primordial de InspectApp es consolidar las novedades físicas de la institución para que puedan ser atendidas; por tanto, permitir que las inspecciones viajen hacia una base compartida es la razón de ser del backend.
2. **Coherencia con la especificación de la Unidad 2:** Esta priorización coincide de manera exacta con lo consignado en la pregunta de cierre P7 del documento [`ESPECIFICACION.md`](../../ESPECIFICACION.md) de la Unidad 2: *«Sincronización con un backend (con cola de pendientes), porque es la primera limitación real; después, fotos y autenticación»*.
3. **Base para el resto de funcionalidades:** Sin un endpoint capaz de recibir inspecciones con garantía de no duplicidad (`idLocal`) y de listarlas con paginación, no es posible construir las siguientes fases del sistema, tales como la actualización de estados (`PATCH`), la asignación de responsables, la subida de fotografías adjuntas o la integración con sistemas institucionales de órdenes de trabajo.
