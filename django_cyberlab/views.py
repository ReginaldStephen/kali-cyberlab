"""
Kali Linux CyberLab Operations Suite - Django Views & Real System Diagnostics
Direct Linux Kernel reads via /proc, subprocess, and socket interfaces.
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
    from django.http import JsonResponse, HttpResponse
    from django.views.decorators.csrf import csrf_exempt
except ImportError:
    # Dummy decorator for standalone testing
    def csrf_exempt(f):
        return f

def get_system_telemetry():
    # 1, 5, 15 min load averages
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

    # RAM from /proc/meminfo
    total_mem = 0
    avail_mem = 0
    try:
        with open("/proc/meminfo", "r") as f:
            mem = {}
            for line in f:
                parts = line.split(":")
                if len(parts) == 2:
                    mem[parts[0].strip()] = int(parts[1].strip().split()[0]) * 1024
            total_mem = mem.get("MemTotal", 0)
            avail_mem = mem.get("MemAvailable", mem.get("MemFree", 0))
    except Exception:
        pass

    used_mem = total_mem - avail_mem
    mem_percent = round((used_mem / total_mem * 100), 1) if total_mem > 0 else 0

    # Root Disk (/) via statvfs
    st = os.statvfs("/")
    disk_total = st.f_blocks * st.f_frsize
    disk_free = st.f_bavail * st.f_frsize
    disk_used = disk_total - disk_free
    disk_percent = round((disk_used / disk_total * 100), 1) if disk_total > 0 else 0

    # Active Sockets via `ss -tuln`
    sockets = []
    try:
        res = subprocess.run(["ss", "-tuln"], capture_output=True, text=True, timeout=3)
        for line in res.stdout.strip().split("\n")[1:]:
            parts = line.split()
            if len(parts) >= 5:
                proto = parts[0]
                state = parts[1]
                local = parts[4]
                port = local.rsplit(":", 1)[-1] if ":" in local else ""
                sockets.append({"protocol": proto, "state": state, "localAddress": local, "port": port})
    except Exception:
        pass

    # Installed Kali security tools
    tools = ["nmap", "curl", "ss", "iptables", "ufw", "tcpdump", "traceroute", "python3"]
    installed_tools = {}
    for tool in tools:
        installed_tools[tool] = subprocess.run(["which", tool], capture_output=True).returncode == 0

    return {
        "status": "online",
        "engine": "Python Django (Kali CyberLab Engine)",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "hostname": socket.gethostname(),
        "platform": sys.platform,
        "pythonVersion": sys.version.split()[0],
        "cpu": {
            "loadPercent": load_percent,
            "loadAvg": [round(load1, 2), round(load5, 2), round(load15, 2)],
            "cores": cpu_count,
            "model": cpu_model
        },
        "memory": {
            "totalBytes": total_mem,
            "usedBytes": used_mem,
            "freeBytes": avail_mem,
            "usedPercent": mem_percent,
            "totalGB": round(total_mem / (1024**3), 2),
            "usedGB": round(used_mem / (1024**3), 2),
            "freeGB": round(avail_mem / (1024**3), 2)
        },
        "disk": {
            "totalGB": round(disk_total / (1024**3), 2),
            "usedGB": round(disk_used / (1024**3), 2),
            "freeGB": round(disk_free / (1024**3), 2),
            "usedPercent": disk_percent,
            "mountPoint": "/"
        },
        "sockets": sockets,
        "installedTools": installed_tools
    }

@csrf_exempt
def system_health_view(request):
    """Returns real-time host CPU, RAM, Disk, Sockets in JSON."""
    data = get_system_telemetry()
    return JsonResponse(data)

@csrf_exempt
def terminal_execute_view(request):
    """Executes a diagnostic Linux shell command on the host."""
    if request.method != "POST":
        return JsonResponse({"error": "POST method required"}, status=405)
    
    try:
        body = json.loads(request.body.decode("utf-8"))
    except Exception:
        body = {}
    
    cmd = body.get("command", "").strip()
    if not cmd:
        return JsonResponse({"error": "No command specified"}, status=400)

    start_time = time.time()
    try:
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15)
        elapsed_ms = int((time.time() - start_time) * 1000)
        return JsonResponse({
            "commandRun": cmd,
            "stdout": res.stdout,
            "stderr": res.stderr,
            "exitCode": res.returncode,
            "executionTimeMs": elapsed_ms,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
    except subprocess.TimeoutExpired:
        return JsonResponse({
            "commandRun": cmd,
            "stdout": "",
            "stderr": "Command timed out after 15 seconds.",
            "exitCode": 124,
            "executionTimeMs": 15000,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })

@csrf_exempt
def network_scan_view(request):
    """Performs live TCP port probes or nmap execution on the target."""
    if request.method != "POST":
        return JsonResponse({"error": "POST method required"}, status=405)
    
    try:
        body = json.loads(request.body.decode("utf-8"))
    except Exception:
        body = {}

    target = body.get("target", "127.0.0.1")
    ports = body.get("ports", [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3000, 3306, 5000, 8000, 8080])
    
    try:
        ip = socket.gethostbyname(target)
    except socket.gaierror:
        return JsonResponse({"error": f"Cannot resolve target: {target}"}, status=400)

    open_ports = []
    for port in ports:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.35)
        code = s.connect_ex((ip, port))
        if code == 0:
            service_name = socket.getservbyport(port, "tcp") if port < 1024 else "custom"
            open_ports.append({
                "port": port,
                "protocol": "tcp",
                "state": "open",
                "service": service_name
            })
        s.close()

    return JsonResponse({
        "target": target,
        "ip": ip,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "totalScanned": len(ports),
        "openCount": len(open_ports),
        "ports": open_ports
    })
