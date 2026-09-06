"""
Kali Linux CyberLab Operations Suite - Flask Backend
"""
import os
import sys
import json
import socket
import ssl
import time
import subprocess
from datetime import datetime
from urllib.parse import urlparse
import urllib.request

try:
    from flask import Flask, jsonify, request, render_template, render_template_string, send_from_directory
    from flask_cors import CORS
except ImportError:
    Flask = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
DIST_DIR = os.path.join(BASE_DIR, "dist")

if Flask:
    app = Flask(__name__, template_folder=TEMPLATES_DIR, static_folder=DIST_DIR if os.path.exists(DIST_DIR) else None)
    CORS(app)
else:
    app = None

def find_available_port(preferred_port=9090, max_attempts=50):
    for port in range(preferred_port, preferred_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('0.0.0.0', port))
                return port
            except OSError:
                continue
    return preferred_port

def get_system_telemetry():
    load1, load5, load15 = os.getloadavg()
    cpu_count = os.cpu_count() or 1
    load_percent = round((load1 / cpu_count) * 100, 1)

    cpu_model = "Linux Processor"
    try:
        with open("/proc/cpuinfo", "r") as f:
            for line in f:
                if line.startswith("model name"):
                    cpu_model = line.split(":", 1)[1].strip()
                    break
    except Exception:
        pass

    total_mem = 0
    free_mem = 0
    available_mem = 0
    try:
        with open("/proc/meminfo", "r") as f:
            for line in f:
                parts = line.split(":")
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = parts[1].strip().split()[0]
                    if key == "MemTotal":
                        total_mem = int(val) * 1024
                    elif key == "MemFree":
                        free_mem = int(val) * 1024
                    elif key == "MemAvailable":
                        available_mem = int(val) * 1024
    except Exception:
        total_mem = 4 * 1024 * 1024 * 1024
        available_mem = 3 * 1024 * 1024 * 1024

    actual_free = available_mem if available_mem > 0 else free_mem
    used_mem = max(0, total_mem - actual_free)
    used_mem_percent = round((used_mem / total_mem * 100), 1) if total_mem else 0

    total_disk, used_disk, free_disk, disk_percent = 0, 0, 0, 0
    try:
        stat = os.statvfs("/")
        total_disk = stat.f_blocks * stat.f_frsize
        free_disk = stat.f_bavail * stat.f_frsize
        used_disk = total_disk - free_disk
        disk_percent = round((used_disk / total_disk * 100), 1) if total_disk else 0
    except Exception:
        pass

    sockets = []
    try:
        res = subprocess.run(["ss", "-tulpn"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=2)
        if res.returncode == 0:
            for line in res.stdout.strip().split("\n")[1:]:
                parts = line.split()
                if len(parts) >= 5:
                    proto = parts[0].lower()
                    state = parts[1]
                    local = parts[4]
                    port = local.split(":")[-1] if ":" in local else "unknown"
                    sockets.append({
                        "protocol": proto,
                        "state": state,
                        "localAddress": local,
                        "port": port
                    })
    except Exception:
        pass

    installed_tools = {}
    for tool in ["nmap", "curl", "traceroute", "ss", "ufw", "iptables", "tcpdump", "python3"]:
        installed_tools[tool] = subprocess.run(["which", tool], stdout=subprocess.PIPE, stderr=subprocess.PIPE).returncode == 0

    return {
        "status": "online",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "hostname": socket.gethostname(),
        "platform": sys.platform,
        "pythonVersion": sys.version.split()[0],
        "engine": "Python Flask (Kali CyberLab Backend)",
        "cpu": {
            "loadPercent": load_percent,
            "loadAvg": [round(load1, 2), round(load5, 2), round(load15, 2)],
            "cores": cpu_count,
            "model": cpu_model
        },
        "memory": {
            "totalBytes": total_mem,
            "usedBytes": used_mem,
            "freeBytes": actual_free,
            "usedPercent": used_mem_percent,
            "totalGB": round(total_mem / (1024**3), 2),
            "usedGB": round(used_mem / (1024**3), 2),
            "freeGB": round(actual_free / (1024**3), 2)
        },
        "disk": {
            "totalGB": round(total_disk / (1024**3), 2),
            "usedGB": round(used_disk / (1024**3), 2),
            "freeGB": round(free_disk / (1024**3), 2),
            "usedPercent": disk_percent,
            "mountPoint": "/"
        },
        "installedTools": installed_tools,
        "sockets": sockets
    }

def scan_tcp_port(host, port, timeout=1.0):
    start = time.time()
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            res = s.connect_ex((host, port))
            latency = round((time.time() - start) * 1000, 2)
            if res == 0:
                service = "unknown"
                try:
                    service = socket.getservbyport(port, "tcp")
                except Exception:
                    pass
                return {"port": port, "state": "OPEN", "service": service, "latencyMs": latency}
            return {"port": port, "state": "CLOSED", "service": None, "latencyMs": latency}
    except Exception as e:
        return {"port": port, "state": "FILTERED/ERROR", "service": None, "latencyMs": 0, "error": str(e)}

if app:
    @app.route("/api/system/health", methods=["GET"])
    def api_health():
        return jsonify(get_system_telemetry())

    @app.route("/api/scan/network", methods=["POST"])
    def api_scan_network():
        data = request.get_json() or {}
        target = data.get("target", "127.0.0.1")
        ports = data.get("ports", [21, 22, 80, 443, 1883, 3389, 5432, 8000, 9090, 9091, 9392])
        results = [scan_tcp_port(target, p) for p in ports]
        return jsonify({
            "target": target,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "totalScanned": len(ports),
            "openPorts": [r["port"] for r in results if r["state"] == "OPEN"],
            "results": results
        })

    @app.route("/api/terminal/execute", methods=["POST"])
    def api_terminal_execute():
        data = request.get_json() or {}
        cmd = data.get("command", "").strip()
        if not cmd:
            return jsonify({"error": "No command provided"}), 400
        try:
            res = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=8)
            return jsonify({
                "command": cmd,
                "exitCode": res.returncode,
                "output": res.stdout if res.stdout else res.stderr,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            })
        except subprocess.TimeoutExpired:
            return jsonify({"command": cmd, "error": "Command execution timed out (8s limit)"}), 408

    @app.route("/api/scan/web", methods=["POST"])
    def api_scan_web():
        data = request.get_json() or {}
        url = data.get("url", "").strip()
        if not url:
            return jsonify({"error": "No URL provided"}), 400
        parsed = urlparse(url)
        headers_dict = {}
        status_code = 200
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "KaliCyberLab/1.0"})
            with urllib.request.urlopen(req, timeout=5) as response:
                status_code = response.getcode()
                headers_dict = dict(response.info())
        except Exception as e:
            return jsonify({"url": url, "error": str(e)}), 400

        return jsonify({
            "url": url,
            "statusCode": status_code,
            "headers": headers_dict,
            "securityMissing": [
                h for h in ["Content-Security-Policy", "X-Frame-Options", "Strict-Transport-Security", "X-Content-Type-Options"]
                if h.lower() not in [k.lower() for k in headers_dict.keys()]
            ]
        })

    # Serve Root UI
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path.startswith("api/"):
            return jsonify({"error": "Endpoint not found"}), 404
        
        template_file = os.path.join(TEMPLATES_DIR, "index.html")
        if os.path.exists(template_file):
            return render_template("index.html")
        
        if os.path.exists(DIST_DIR):
            file_path = os.path.join(DIST_DIR, path)
            if path != "" and os.path.exists(file_path):
                return send_from_directory(DIST_DIR, path)
            dist_index = os.path.join(DIST_DIR, "index.html")
            if os.path.exists(dist_index):
                return send_from_directory(DIST_DIR, "index.html")
        
        telemetry = get_system_telemetry()
        return jsonify(telemetry)

if __name__ == "__main__":
    if app:
        req_port = int(os.environ.get("PORT", "9090"))
        actual_port = find_available_port(req_port)
        app.run(host="0.0.0.0", port=actual_port, debug=False)
