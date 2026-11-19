#!/usr/bin/env bash
# Compara dos contratos OpenAPI con oasdiff y falla si el nuevo rompe a quien
# consume el anterior (endpoint borrado, campo requerido nuevo, tipo cambiado...).
#   uso: comparar.sh <contrato-base.json> <contrato-pr.json>
# Los dos archivos deben estar en la misma carpeta. Si existe
# $GITHUB_STEP_SUMMARY, escribe ahí la lista de cambios.
set -euo pipefail

# Imagen fijada por digest: oasdiff v1.34.1 (linux/amd64 y arm64).
OASDIFF="tufin/oasdiff@sha256:67a23cfea7d251e2ae34ee703ac8733c5d96bc2e7b90fd0f4d475ec99367b85f"

# En Git Bash (Windows), Docker necesita la ruta como C:/...: `pwd -W` la da.
# En Linux `pwd -W` no existe y se usa `pwd`.
ruta() { (cd "$1" && { pwd -W 2>/dev/null || pwd; }); }
dir="$(ruta "$(dirname "$1")")"
base="$(basename "$1")"
pr="$(basename "$2")"
if [ "$(ruta "$(dirname "$2")")" != "$dir" ]; then
  echo "Los dos contratos deben estar en la misma carpeta"
  exit 2
fi

# MSYS_NO_PATHCONV evita que Git Bash convierta /specs/... en una ruta de
# Windows. En Linux no tiene efecto.
oasdiff() {
  MSYS_NO_PATHCONV=1 docker run --rm -v "$dir:/specs:ro" "$OASDIFF" "$@"
}

resumen="${GITHUB_STEP_SUMMARY:-/dev/null}"
{
  echo "### Contrato de la API"
  echo
  oasdiff changelog "/specs/$base" "/specs/$pr" --format markdown
} >> "$resumen"

# Solo los cambios que rompen (nivel ERR) ponen el job en rojo. Los avisos
# (WARN) aparecen en el resumen, pero no bloquean.
if oasdiff breaking "/specs/$base" "/specs/$pr" --fail-on ERR; then
  echo "Sin cambios que rompan el contrato."
else
  echo "::error::El PR rompe el contrato de la API. Hazlo compatible o avisa antes a los frontends."
  exit 1
fi
