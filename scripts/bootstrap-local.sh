#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command -v pnpm >/dev/null 2>&1 || {
  echo "[error] pnpm no esta instalado" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || {
  echo "[error] docker no esta instalado o no esta en PATH" >&2
  exit 1
}

echo "[1/5] Instalando dependencias..."
pnpm install

echo "[2/5] Levantando infraestructura local (postgres, redis)..."
docker compose up -d

echo "[3/5] Preparando variables de entorno locales..."
if [[ ! -f apps/api/.env ]]; then
  cp apps/api/.env.example apps/api/.env
  echo "  - creado apps/api/.env"
fi

if [[ ! -f apps/web/.env.local ]]; then
  cp apps/web/.env.example apps/web/.env.local
  echo "  - creado apps/web/.env.local"
fi

if grep -q "localhost:5432/homly" apps/api/.env; then
  echo "  - actualizando DATABASE_URL a puerto local 55432 en apps/api/.env"
  tmp_file="$(mktemp)"
  sed "s|localhost:5432/homly|localhost:55432/homly|g" apps/api/.env > "$tmp_file"
  mv "$tmp_file" apps/api/.env
fi

echo "[4/5] Esperando PostgreSQL..."
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U homly -d homly >/dev/null 2>&1; then
    break
  fi
  if [[ "$i" -eq 30 ]]; then
    echo "[error] PostgreSQL no respondio a tiempo" >&2
    exit 1
  fi
  sleep 2
done

echo "[5/5] Aplicando schema Prisma..."
pnpm --filter @homly/api db:generate
pnpm --filter @homly/api db:deploy

echo ""
echo "Listo. Ejecuta en terminales separadas o en una sola:"
echo "  pnpm dev:api"
echo "  pnpm dev:web"
echo "  # o ambos"
echo "  pnpm dev"
