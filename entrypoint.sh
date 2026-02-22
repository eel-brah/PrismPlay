#!/bin/sh
set -eu

KEY_PATH="${SSL_KEY_PATH:-/ft_transcendence/config/key.pem}"
CERT_PATH="${SSL_CERT_PATH:-/ft_transcendence/config/cert.pem}"

KEY_DIR="$(dirname "$KEY_PATH")"
CERT_DIR="$(dirname "$CERT_PATH")"

mkdir -p "$KEY_DIR" "$CERT_DIR"

if [ ! -f "$KEY_PATH" ] || [ ! -f "$CERT_PATH" ]; then
  echo "[tls] Generating cert at:"
  echo "  key : $KEY_PATH"
  echo "  cert: $CERT_PATH"

  openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout "$KEY_PATH" \
    -out "$CERT_PATH" \
    -days 365 \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:ft_transcendence,IP:127.0.0.1,IP:0.0.0.0"

  chmod 600 "$KEY_PATH"
  chmod 644 "$CERT_PATH"
else
  echo "[tls] Using existing cert files"
fi

pnpm prisma migrate deploy
exec pnpm start