#!/bin/bash
# deploy-distributed.sh
# Script deploy untuk arsitektur distributed (Primary + Backup)
# Kelompok 5 | RPL-A Scalable System Design
#
# Jalankan di server Oracle Cloud:
#   bash deploy-distributed.sh

set -e

PROJECT_DIR="/home/ubuntu/MID-SSD-Web-Sekolah-Kelompok-5"
NGINX_CONF="/etc/nginx/sites-available/web-sekolah"

echo "=========================================="
echo "  Deploy Distributed Web Sekolah"
echo "  Primary (3000) + Backup (3001)"
echo "=========================================="

# 1. Pull kode terbaru
echo "[1/5] Git pull..."
cd "$PROJECT_DIR"
git pull origin master

# 2. Buat folder logs jika belum ada
echo "[2/5] Setup logs folder..."
mkdir -p logs

# 3. Stop instance lama (jika ada)
echo "[3/5] Stop instance lama..."
pm2 delete web-sekolah 2>/dev/null || true
pm2 delete web-sekolah-backup 2>/dev/null || true

# 4. Start kedua instance via ecosystem config
echo "[4/5] Start Primary + Backup server..."
pm2 start ecosystem.config.js
pm2 save

# 5. Update dan reload Nginx
echo "[5/5] Update Nginx config..."
sudo cp nginx-distributed.conf "$NGINX_CONF"
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=========================================="
echo "  SELESAI! Status server:"
echo "=========================================="
pm2 list
echo ""
echo "  Primary : http://localhost:3000"
echo "  Backup  : http://localhost:3001"
echo "  Public  : https://web-sekolah.duckdns.org"
echo ""
echo "  Test failover:"
echo "  pm2 stop web-sekolah    → backup aktif"
echo "  pm2 start web-sekolah   → primary kembali"
