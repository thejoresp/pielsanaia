#!/bin/bash
# Preparación inicial de una VPS (Ubuntu 22.04/24.04) para PielSana IA.
# Se ejecuta UNA vez, como root:
#   curl -fsSL https://raw.githubusercontent.com/thejoresp/pielsanaia/main/deploy/setup-vps.sh | bash
#   (o copiarlo con scp y correr: sudo bash setup-vps.sh)
# Es idempotente: volver a correrlo no duplica nada.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/thejoresp/pielsanaia.git}"
APP_USER="${APP_USER:-deploy}"
APP_HOME="/home/${APP_USER}"
APP_DIR="${APP_HOME}/pielsanaia"

paso() { echo; echo ">> $*"; }

# --- Controles previos (antes de tocar nada) ---
if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: ejecutar como root (sudo bash setup-vps.sh)" >&2
  exit 1
fi

# El usuario de deploy entra con la clave SSH de root (no tiene contraseña).
if [ ! -s /root/.ssh/authorized_keys ]; then
  echo "ERROR: /root/.ssh/authorized_keys no existe o está vacío." >&2
  echo "Desde tu PC copiá tu clave pública y volvé a correr el script:" >&2
  echo "  ssh-copy-id root@IP_DE_LA_VPS" >&2
  exit 1
fi

# Sin prompts de apt (con curl | bash no hay terminal para responder)
export DEBIAN_FRONTEND=noninteractive

paso "Actualizando el sistema"
apt-get update -y
apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
apt-get install -y ca-certificates curl git ufw

paso "Docker + Compose"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

paso "Swap de 4G (TensorFlow usa bastante RAM al cargar los modelos)"
if ! swapon --show | grep -q .; then
  [ -f /swapfile ] || fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

paso "Usuario ${APP_USER}"
if ! id "${APP_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "${APP_USER}"
fi
usermod -aG docker,sudo "${APP_USER}"
install -d -m 700 -o "${APP_USER}" -g "${APP_USER}" "${APP_HOME}/.ssh"
install -m 600 -o "${APP_USER}" -g "${APP_USER}" /root/.ssh/authorized_keys "${APP_HOME}/.ssh/authorized_keys"

paso "Firewall (SSH, 80, 443 y 443/udp para HTTP/3)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

paso "Repositorio en ${APP_DIR}"
if [ ! -d "${APP_DIR}/.git" ]; then
  sudo -u "${APP_USER}" git clone "${REPO_URL}" "${APP_DIR}"
fi
for modelo in ham10000 acne rosacea; do
  sudo -u "${APP_USER}" mkdir -p "${APP_DIR}/backend/modelos/${modelo}"
done
if [ ! -f "${APP_DIR}/.env" ]; then
  # .env con secretos: solo lo lee el usuario de deploy
  install -m 600 -o "${APP_USER}" -g "${APP_USER}" "${APP_DIR}/.env.example" "${APP_DIR}/.env"
fi

cat <<EOF

Listo. Próximos pasos:
  1) Completar ${APP_DIR}/.env (DOMAIN, DUCKDNS_SUBDOMAIN, DUCKDNS_TOKEN, DEEPSEEK_API_KEY)
  2) Desde tu PC, subir los modelos .keras:
       scp lunares.keras ${APP_USER}@IP_VPS:~/pielsanaia/backend/modelos/ham10000/
       scp acne.keras    ${APP_USER}@IP_VPS:~/pielsanaia/backend/modelos/acne/
       scp rosacea.keras ${APP_USER}@IP_VPS:~/pielsanaia/backend/modelos/rosacea/
  3) ssh ${APP_USER}@IP_VPS
     cd pielsanaia && docker compose up -d --build
EOF
