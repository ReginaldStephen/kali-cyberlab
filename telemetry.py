import os
import sys
import json
import subprocess
import socket
import ssl
import time
from datetime import datetime

def get_cpu_info():
    # 1, 5, 15 min load averages from os / proc
    load1, load5, load15 = os.getloadavg()
    cpu_count = os.cpu_count() or 1
    # Estimate percentage from 1-min load relative to cores
    load_percent = round((load1 / cpu_count) * 100, 1)
    
    # Read cpu model from /proc/cpuinfo if available
    cpu_model = "Generic Linux CPU"
    try:
        with open("/proc/cpuinfo", "r") as f:
            for line in f:
                if line.startswith("model name"):
                    cpu_model = line.split(":", 1)[1].strip()
                    break
    except Exception:
        pass

    return {
        "loadPercent": load_percent,
        "loadAvg": [round(load1, 2), round(load5, 2), round(load15, 2)],
        "cores": cpu_count,
        "model": cpu_model
    }

def get_memory_info():
    total_bytes = 0
    available_bytes = 0
    used_bytes = 0
    try:
        with open("/proc/meminfo", "r") as f:
            mem = {}
            for line in f:
                parts = line.split(":")
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = parts[1].strip().split()[0]
                    mem[key] = int(val) * 1024  # kB to bytes
            total_bytes = mem.get("MemTotal", 0)
            available_bytes = mem.get("MemAvailable", mem.get("MemFree", 0))
            used_bytes = total_bytes - available_bytes
    except Exception:
        pass

    used_percent = round((used_bytes / total_bytes * 100), 1) if total_bytes > 0 else 0
    return {
        "totalBytes": total_bytes,
        "usedBytes": used_bytes,
        "freeBytes": available_bytes,
        "usedPercent": used_percent,
        "totalGB": round(total_bytes / (1024**3), 2),
        "usedGB": round(used_bytes / (1024**3), 2),
        "freeGB": round(available_bytes / (1024**3), 2)
    }

def get_disk_info():
    try:
        st = os.statvfs("/")
        total_bytes = st.f_blocks * st.f_frsize
        free_bytes = st.f_bavail * st.f_frsize
        used_bytes = total_bytes - free_bytes
        used_percent = round((used_bytes / total_bytes * 100), 1) if total_bytes > 0 else 0
        return {
            "totalGB": round(total_bytes / (1024**3), 2),
            "usedGB": round(used_bytes / (1024**3), 2),
            "freeGB": round(free_bytes / (1024**3), 2),
            "usedPercent": used_percent,
            "mountPoint": "/"
        }
    except Exception:
        return {
            "totalGB": 0, "usedGB": 0, "freeGB": 0, "usedPercent": 0, "mountPoint": "/"
        }

def get_active_sockets():
    # Execute ss -tuln via subprocess
    sockets = []
    try:
        res = subprocess.run(["ss", "-tuln"], capture_output=True, text=True, timeout=3)
        lines = res.stdout.strip().split("\n")
        # Parse headers and lines
        for line in lines[1:]:
            parts = line.split()
            if len(parts) >= 5:
                proto = parts[0]
                state = parts[1]
                local_addr = parts[4]
                port = local_addr.rsplit(":", 1)[-1] if ":" in local_addr else ""
                sockets.append({
                    "protocol": proto,
                    "state": state,
                    "localAddress": local_addr,
                    "port": port
                })
    except Exception:
        pass
    return sockets

def get_system_telemetry():
    return {
        "status": "online",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "hostname": socket.gethostname(),
        "platform": sys.platform,
        "pythonVersion": sys.version.split()[0],
        "cpu": get_cpu_info(),
        "memory": get_memory_info(),
        "disk": get_disk_info(),
        "sockets": get_active_sockets(),
        "source": "Python 3 Native Kernel Engine"
    }

if __name__ == "__main__":
    data = get_system_telemetry()
    print(json.dumps(data, indent=2))
