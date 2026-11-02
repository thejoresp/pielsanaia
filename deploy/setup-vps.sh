#!/bin/bash
# Preparación inicial de una VPS Contabo (Ubuntu 22.04/24.04) para PielSana IA.
# Ejecutar UNA vez como root:
#   curl -fsSL https://raw.githubusercontent.com/thejoresp/pielsanaia/main/deploy/setup-vps.sh | bash
#   (o copiarlo con scp y correr: sudo bash setup-vps.sh)
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/thejoresp/pielsanaia.git}"
APP_USER="${APP_USER:-deploy}"
APP_DIR="/home/${APP_USER}/pielsanaia"

if [ "$(id -u)" -ne 0 ]; then
  echo "Ejecutar como root (sudo bash setup-vps.sh)"; exit 1
fi

# El usuario de deploy hereda la clave SSH de root (no tiene contraseña).
# Sin clave, no se podría entrar como ${APP_USER}: cortar antes de tocar nada.
if [ ! -s /root/.ssh/authorized_keys ]; then
  echo "ERROR: /root/.ssh/authorized_keys no existe o está vacío."
  echo "Desde tu PC, copiá tu clave pública y volvé a correr este script:"
  echo "  ssh-copy-id root@IP_DE_LA_VPS"
  exit 1
fi

# Evita prompts interactivos de apt (con curl | bash no hay terminal para responder)
export DEBIAN_FRONTEND=noninteractive

echo ">> Actualizando sistema..."
apt-get update -y && apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
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
mkdir -p "/home/${APP_USER}/.ssh"
cp /root/.ssh/authorized_keys "/home/${APP_USER}/.ssh/"
chown -R "${APP_USER}:${APP_USER}" "/home/${APP_USER}/.ssh"
chmod 700 "/home/${APP_USER}/.ssh" && chmod 600 "/home/${APP_USER}/.ssh/authorized_keys"

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
echo "  1) Completar ${APP_DIR}/.env (DOMAIN, DUCKDNS_*, DEEPSEEK_API_KEY)"
echo "  2) Subir los modelos .keras a ${APP_DIR}/backend/modelos/{ham10000,acne,rosacea}/"
echo "  3) su - ${APP_USER} && cd pielsanaia && docker compose up -d --build"
