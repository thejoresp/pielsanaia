#!/bin/bash
# Preparación inicial de una VPS Contabo (Ubuntu 22.04/24.04) para PielSana IA.
# Ejecutar UNA vez como root:
#   curl -fsSL https://raw.githubusercontent.com/thejoresp/PielSanaIA-MVP/main/deploy/setup-vps.sh | bash
#   (o copiarlo con scp y correr: sudo bash setup-vps.sh)
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/thejoresp/PielSanaIA-MVP.git}"
APP_USER="${APP_USER:-deploy}"
APP_DIR="/home/${APP_USER}/PielSanaIA-MVP"

if [ "$(id -u)" -ne 0 ]; then
  echo "Ejecutar como root (sudo bash setup-vps.sh)"; exit 1
fi

echo ">> Actualizando sistema..."
apt-get update -y && apt-get upgrade -y
apt-get install -y ca-certificates curl git ufw

echo ">> Instalando Docker + Compose..."
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

echo ">> Swap de 4G (TensorFlow consume bastante RAM al compilar/cargar modelos)..."
if ! swapon --show | grep -q .; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo ">> Usuario ${APP_USER}..."
if ! id "${APP_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "${APP_USER}"
fi
usermod -aG docker,sudo "${APP_USER}"
if [ -f /root/.ssh/authorized_keys ]; then
  mkdir -p "/home/${APP_USER}/.ssh"
  cp /root/.ssh/authorized_keys "/home/${APP_USER}/.ssh/"
  chown -R "${APP_USER}:${APP_USER}" "/home/${APP_USER}/.ssh"
  chmod 700 "/home/${APP_USER}/.ssh" && chmod 600 "/home/${APP_USER}/.ssh/authorized_keys"
fi

echo ">> Firewall (22, 80, 443)..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo ">> Clonando repositorio..."
if [ ! -d "${APP_DIR}" ]; then
  sudo -u "${APP_USER}" git clone "${REPO_URL}" "${APP_DIR}"
fi
sudo -u "${APP_USER}" mkdir -p "${APP_DIR}/backend/modelos/ham10000" "${APP_DIR}/backend/modelos/acne" "${APP_DIR}/backend/modelos/rosacea"
if [ ! -f "${APP_DIR}/.env" ]; then
  sudo -u "${APP_USER}" cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
fi

echo
echo "Listo. Próximos pasos:"
echo "  1) Completar ${APP_DIR}/.env (DOMAIN, DUCKDNS_*, OPENAI_API_KEY)"
echo "  2) Subir los modelos .keras a ${APP_DIR}/backend/modelos/{ham10000,acne,rosacea}/"
echo "  3) su - ${APP_USER} && cd PielSanaIA-MVP && docker compose up -d --build"
