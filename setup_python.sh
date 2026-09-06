#!/bin/bash
# Kali CyberLab Operations Suite - Python Engine Setup & Launcher
set -e

echo "========================================================="
echo "   KALI CYBERLAB - PYTHON FLASK & DJANGO INSTALLER"
echo "========================================================="

# 1. Update and install Python 3 & Networking Tools
echo "[+] Updating apt repositories & installing requirements..."
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv nmap curl traceroute iproute2

# 2. Setup Python Virtual Environment
echo "[+] Initializing Python Virtual Environment (.venv)..."
python3 -m venv .venv
source .venv/bin/activate

# 3. Install Python Dependencies
echo "[+] Installing Flask, Django, and utilities via pip..."
pip install --upgrade pip
pip install -r requirements.txt

# 4. Prompt for custom port or mode selection
echo ""
echo "Select execution mode:"
echo "1) Start Python Flask Engine (Custom Port or Auto 9090+)"
echo "2) Start Python Django Engine (Custom Port or Auto 9000+)"
echo "3) Run Standalone Real-Time Host Telemetry (CLI)"
echo ""
read -p "Enter choice [1-3] (Default: 1): " choice
choice=${choice:-1}

if [ "$choice" == "1" ]; then
    read -p "Enter desired port for Flask [Default 9090]: " FLASK_PORT
    FLASK_PORT=${FLASK_PORT:-9090}
    echo "[+] Launching Flask CyberLab Engine on port $FLASK_PORT..."
    PORT=$FLASK_PORT python3 app.py
elif [ "$choice" == "2" ]; then
    read -p "Enter desired port for Django [Default 9000]: " DJANGO_PORT
    DJANGO_PORT=${DJANGO_PORT:-9000}
    echo "[+] Launching Django CyberLab Engine on port $DJANGO_PORT..."
    python3 manage.py runserver 0.0.0.0:$DJANGO_PORT
else
    echo "[+] Running native Linux telemetry check via Python..."
    python3 telemetry.py
fi
