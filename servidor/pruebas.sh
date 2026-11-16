#!/usr/bin/env bash
# pruebas.sh — Pruebas HTTP del servidor de inspecciones
set -euo pipefail

BASE="http://127.0.0.1:3000/api/v1"
: "${API_TOKEN:?Define API_TOKEN (ver .env)}"
EVIDENCIA="${EVIDENCIA:-./evidencia}"

mkdir -p "$EVIDENCIA"

echo "=== 01-salud ==="
{
  echo "curl -i -sS $BASE/salud"
  echo ""
  curl -i -sS "$BASE/salud"
} > "$EVIDENCIA/01-salud.txt"
cat "$EVIDENCIA/01-salud.txt"
echo -e "\n"

echo "=== 02-crear ==="
{
  echo 'curl -i -sS -X POST $BASE/inspecciones -H "Content-Type: application/json" -H "Authorization: Bearer $API_TOKEN" -d ...'
  echo ""
  curl -i -sS -X POST "$BASE/inspecciones" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_TOKEN" \
    --data-binary @- <<< '{"idLocal":"1763316000000","espacio":"Laboratorio","tipo":"Eléctrica","descripcion":"Tomacorriente de la mesa 3 sin energía","prioridad":"Alta","creada":"2026-11-16T14:30:00.000Z"}'
} > "$EVIDENCIA/02-crear.txt"
cat "$EVIDENCIA/02-crear.txt"
echo -e "\n"

echo "=== 03-crear-repetido ==="
{
  echo 'curl -i -sS -X POST $BASE/inspecciones -H "Content-Type: application/json" -H "Authorization: Bearer $API_TOKEN" -d ...(mismo idLocal)'
  echo ""
  curl -i -sS -X POST "$BASE/inspecciones" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_TOKEN" \
    --data-binary @- <<< '{"idLocal":"1763316000000","espacio":"Laboratorio","tipo":"Eléctrica","descripcion":"Tomacorriente de la mesa 3 sin energía","prioridad":"Alta"}'
} > "$EVIDENCIA/03-crear-repetido.txt"
cat "$EVIDENCIA/03-crear-repetido.txt"
echo -e "\n"

echo "=== 04-crear-invalido ==="
{
  echo 'curl -i -sS -X POST $BASE/inspecciones -H "Content-Type: application/json" -H "Authorization: Bearer $API_TOKEN" -d ...(descripcion corta)'
  echo ""
  curl -i -sS -X POST "$BASE/inspecciones" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_TOKEN" \
    --data-binary @- <<< '{"espacio":"Aula","tipo":"Limpieza","descripcion":"corta","prioridad":"Baja"}'
} > "$EVIDENCIA/04-crear-invalido.txt"
cat "$EVIDENCIA/04-crear-invalido.txt"
echo -e "\n"

echo "=== 05-sin-token ==="
{
  echo 'curl -i -sS -X POST $BASE/inspecciones -H "Content-Type: application/json" -d ...(sin Authorization)'
  echo ""
  curl -i -sS -X POST "$BASE/inspecciones" \
    -H "Content-Type: application/json" \
    --data-binary @- <<< '{"espacio":"Aula","tipo":"Limpieza","descripcion":"Piso mojado en pasillo principal del aula","prioridad":"Baja"}'
} > "$EVIDENCIA/05-sin-token.txt"
cat "$EVIDENCIA/05-sin-token.txt"
echo -e "\n"

# Crear 3 inspecciones extra para que el listado tenga datos
echo "--- Creando 3 inspecciones extra ---"
curl -sS -X POST "$BASE/inspecciones" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{"espacio":"Aula","tipo":"Limpieza","descripcion":"Piso mojado en pasillo principal del aula","prioridad":"Media"}' > /dev/null

curl -sS -X POST "$BASE/inspecciones" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{"espacio":"Sala","tipo":"Equipamiento","descripcion":"Proyector de la sala de reuniones no enciende","prioridad":"Baja"}' > /dev/null

curl -sS -X POST "$BASE/inspecciones" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{"espacio":"Zona común","tipo":"Seguridad","descripcion":"Extintor del pasillo norte vencido desde octubre","prioridad":"Alta"}' > /dev/null

echo "3 inspecciones extras creadas."

echo "=== 06-listar ==="
{
  echo "curl -i -sS \"$BASE/inspecciones?limit=5\""
  echo ""
  curl -i -sS "$BASE/inspecciones?limit=5"
} > "$EVIDENCIA/06-listar.txt"
cat "$EVIDENCIA/06-listar.txt"
echo -e "\n"

echo "=== 07-consultar-uno ==="
{
  echo "curl -i -sS $BASE/inspecciones/1"
  echo ""
  curl -i -sS "$BASE/inspecciones/1"
} > "$EVIDENCIA/07-consultar-uno.txt"
cat "$EVIDENCIA/07-consultar-uno.txt"
echo -e "\n"

echo "=== 08-actualizar ==="
{
  echo 'curl -i -sS -X PATCH $BASE/inspecciones/1 -H "Content-Type: application/json" -H "Authorization: Bearer $API_TOKEN" -d {"estado":"Resuelta"}'
  echo ""
  curl -i -sS -X PATCH "$BASE/inspecciones/1" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_TOKEN" \
    --data-binary @- <<< '{"estado":"Resuelta"}'
} > "$EVIDENCIA/08-actualizar.txt"
cat "$EVIDENCIA/08-actualizar.txt"
echo -e "\n"

echo "=== 09-conflicto ==="
{
  echo 'curl -i -sS -X PATCH $BASE/inspecciones/1 -H "Content-Type: application/json" -H "Authorization: Bearer $API_TOKEN" -d {"actualizada":"2020-01-01T00:00:00.000Z","prioridad":"Baja"}'
  echo ""
  curl -i -sS -X PATCH "$BASE/inspecciones/1" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_TOKEN" \
    --data-binary @- <<< '{"actualizada":"2020-01-01T00:00:00.000Z","prioridad":"Baja"}'
} > "$EVIDENCIA/09-conflicto.txt"
cat "$EVIDENCIA/09-conflicto.txt"
echo -e "\n"

echo "=== 10-eliminar ==="
{
  echo 'curl -i -sS -X DELETE $BASE/inspecciones/1 -H "Authorization: Bearer $API_TOKEN"'
  echo ""
  curl -i -sS -X DELETE "$BASE/inspecciones/1" \
    -H "Authorization: Bearer $API_TOKEN"
} > "$EVIDENCIA/10-eliminar.txt"
cat "$EVIDENCIA/10-eliminar.txt"
echo -e "\n"

echo "=== 11-eliminado ==="
{
  echo "curl -i -sS $BASE/inspecciones/1"
  echo ""
  curl -i -sS "$BASE/inspecciones/1"
} > "$EVIDENCIA/11-eliminado.txt"
cat "$EVIDENCIA/11-eliminado.txt"
echo -e "\n"

echo "=== 12-cuerpo-grande ==="
{
  echo 'curl -i -sS -X POST $BASE/inspecciones -H "Content-Type: application/json" -H "Authorization: Bearer $API_TOKEN" -d (20KB payload)'
  echo ""
  BIGBODY=$(python3 -c "import json; print(json.dumps({'espacio':'Aula','tipo':'Limpieza','descripcion':'A'*20000,'prioridad':'Baja'}))" 2>/dev/null || python -c "import json; print(json.dumps({'espacio':'Aula','tipo':'Limpieza','descripcion':'A'*20000,'prioridad':'Baja'}))")
  curl -i -sS -X POST "$BASE/inspecciones" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_TOKEN" \
    -d "$BIGBODY"
} > "$EVIDENCIA/12-cuerpo-grande.txt"
cat "$EVIDENCIA/12-cuerpo-grande.txt"
echo -e "\n"

echo "=== 13-limite ==="
{
  echo "# 65 peticiones GET rápidas para provocar 429"
  echo ""
  for i in $(seq 1 65); do
    RESP=$(curl -i -sS "$BASE/salud")
    if echo "$RESP" | head -1 | grep -q "429"; then
      echo "429 alcanzado en petición $i"
      echo "$RESP"
      break
    fi
  done
} > "$EVIDENCIA/13-limite.txt"
cat "$EVIDENCIA/13-limite.txt"
echo -e "\n"

echo "=== 14-imagen ==="
{
  echo "# docker images + docker inspect User + docker stats"
  echo ""
  echo "--- docker images ---"
  docker images | grep -i "servidor-inspecciones\|inspecciones" || docker images | head -5
  echo ""
  echo "--- docker inspect User ---"
  docker inspect --format '{{.Config.User}}' servidor-inspecciones-api-1 2>/dev/null || \
  docker inspect --format '{{.Config.User}}' $(docker ps -q --filter "ancestor=$(docker images -q | head -1)") 2>/dev/null || \
  echo "(no se pudo inspeccionar)"
  echo ""
  echo "--- docker stats ---"
  docker stats --no-stream 2>/dev/null || echo "(no disponible)"
} > "$EVIDENCIA/14-imagen.txt"
cat "$EVIDENCIA/14-imagen.txt"
echo -e "\n"

echo "✔ Todas las pruebas completadas. Evidencia en $EVIDENCIA"
