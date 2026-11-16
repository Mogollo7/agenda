# InspectApp — especificación (según PROMPT_CLAUDE_ACTIVIDAD2.txt)

**Stack real:** Expo (React Native) en vez de Ionic/Angular/Capacitor: es lo más rápido de probar (Expo Go en Android, web en el navegador) y no necesita Android Studio para demostrarlo.
Equivalencias: `@capacitor/preferences` → `AsyncStorage`; `@capacitor/network` → `@react-native-community/netinfo`.

## Etapas
1. **Preparación:** `npm install` y `npx expo start --web` (navegador) o escanear el QR con Expo Go (Android).
2. **Formulario:** `Form` en `App.js`. Espacio y tipo con bottom sheet, descripción con `TextInput`, prioridad con selector segmentado. Todo es estado local (`useState`).
3. **Validación:** `validar()` en `src/store.js`: espacio y tipo obligatorios, descripción ≥ 10 caracteres. Los errores se muestran en texto bajo cada campo, con borde y resumen "Completa los N campos".
4. **Visualización:** `Lista` con `FlatList`; estados con datos, vacío, filtro sin resultados y error de lectura; `useMemo` para filtrar/ordenar.
5. **Persistencia:** `storage.load/save/remove` serializa la colección a JSON bajo la clave `inspect.items.v1`. Se guarda primero y luego se actualiza la memoria.
6. **Conectividad:** `useOnline()` escucha NetInfo; pill con `accessibilityLiveRegion="polite"` y aviso al cambiar. La falta de red no bloquea nada porque no hay llamadas remotas.
7. **Prueba en Android:** Expo Go o `npx expo run:android`. Guion: crear 2 inspecciones, cerrar la app, reabrir, comprobar, eliminar 1, reiniciar, comprobar que no reaparece; activar modo avión y ver el indicador.
8. **Checklist:** formulario ✔ · validaciones ✔ · colección en memoria ✔ · lista se actualiza ✔ · persiste tras reinicio ✔ (web) · eliminación persistente ✔ (web) · indicador ✔ · offline ✔ · Android: por probar en dispositivo.

## Preguntas de cierre
- **P1.** En memoria: el estado de React (lista, filtros, formulario en curso). Persistido: la lista de inspecciones y las preferencias (tamaño de texto, tutorial visto).
- **P2.** Al cerrar se pierde la memoria; al abrir, `load()` lee el JSON de AsyncStorage y rehidrata el estado (pantalla de carga 1.1).
- **P3.** Todo el flujo es local: no hay red de por medio, solo se escribe en el almacenamiento del dispositivo.
- **P4.** NetInfo informa del estado de la red (solo informativo). AsyncStorage guarda los datos.
- **P5.** Navegador: almacenamiento del navegador (puede borrarse) y sin APIs nativas. Android: almacenamiento de la app, NetInfo nativo, botón atrás del sistema.
- **P6.** Los datos viven en un solo dispositivo: no hay compartir, ni sincronizar, ni resolver conflictos, ni identificar autores.
- **P7.** Sincronización con un backend (con cola de pendientes), porque es la primera limitación real; después, fotos y autenticación.
