#!/usr/bin/env bash
# Arranca una API ya compilada, descarga su contrato OpenAPI y la apaga.
#   uso: extraer.sh <raiz-del-backend> <puerto> <salida.json>
# Necesita las variables de entorno de la API (DATABASE_URL, JWT_SECRET...).
set -euo pipefail

raiz="$1"
puerto="$2"
salida="$3"
log="${salida%.json}.log"
mkdir -p "$(dirname "$salida")"

(cd "$raiz" && PORT="$puerto" exec node dist/main.js) > "$log" 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  if curl -sf "http://localhost:$puerto/api/docs-json" -o "$salida"; then
    echo "Contrato de $raiz guardado en $salida"
    exit 0
  fi
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "La API de $raiz se detuvo al arrancar"
    cat "$log"
    exit 1
  fi
  sleep 2
done
echo "La API de $raiz no respondió en 120 s"
cat "$log"
exit 1
