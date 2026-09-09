/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { 
  SystemHealth, 
  DiscoveredHost, 
  WebAuditResult, 
  VulnerabilityFinding, 
  ScanRunRecord, 
  RemediationReport,
  TerminalExecutionResponse
} from "./types";
import { Navbar } from "./components/Navbar";
import { SystemHealthBanner } from "./components/SystemHealthBanner";
import { NetworkScanner } from "./components/NetworkScanner";
import { WebAuditor } from "./components/WebAuditor";
import { TerminalRunner } from "./components/TerminalRunner";
import { VulnerabilityRemediation } from "./components/VulnerabilityRemediation";
import { ReportGenerator } from "./components/ReportGenerator";
import { KaliMigrationGuide } from "./components/KaliMigrationGuide";
import { PythonEngineViewer } from "./components/PythonEngineViewer";
import { ScanHistoryDrawer } from "./components/ScanHistoryDrawer";
import { SecurityToolsHub } from "./components/SecurityToolsHub";
import { SecurityArsenal } from "./components/SecurityArsenal";
import { ObserviumDashboard } from "./components/ObserviumDashboard";
import { ObserviumDashboard } from "./components/ObserviumDashboard";
export default function App() {
  const [activeTab, setActiveTab] = useState<string>("network");
  
  // Host Telemetry State
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState<boolean>(true);

  // Network Scanner State
  const [discoveredHosts, setDiscoveredHosts] = useState<DiscoveredHost[]>([]);
  const [isScanLoading, setIsScanLoading] = useState<boolean>(false);
  const [latestScanRecord, setLatestScanRecord] = useState<ScanRunRecord | null>(null);

  // Web Auditor State
  const [auditResult, setAuditResult] = useState<WebAuditResult | null>(null);
  const [isAuditLoading, setIsAuditLoading] = useState<boolean>(false);
  const [targetWebUrl, setTargetWebUrl] = useState<string>("https://localhost:3000");

  // Vulnerabilities State (populated solely by live scans)
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityFinding[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);

  // Reports State
  const [report, setReport] = useState<RemediationReport | null>(null);
  const [isReportLoading, setIsReportLoading] = useState<boolean>(false);

  // 5-Second Interval Background Monitoring State
  const [isContinuousActive, setIsContinuousActive] = useState<boolean>(false);
  const [continuousSeconds] = useState<number>(5);

  // Terminal Runner State
  const [isTerminalLoading, setIsTerminalLoading] = useState<boolean>(false);

  // History Drawer
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [scanHistory, setScanHistory] = useState<ScanRunRecord[]>([]);

  // 1. Fetch System Telemetry from Kali Server
  const fetchSystemHealth = useCallback(async () => {
    try {
      setIsHealthLoading(true);
      const res = await fetch("/api/system/health");
      if (!res.ok) throw new Error("Failed to fetch host health");
      const data: SystemHealth = await res.json();
      setSystemHealth(data);
    } catch (err) {
      console.error("System health error:", err);
    } finally {
      setIsHealthLoading(false);
    }
  }, []);

  // 2. Fetch History & 5s Interval Status
  const fetchHistory = useCallback(async () => {
    try {
      const [histRes, intervalRes] = await Promise.all([
        fetch("/api/scan/history"),
        fetch("/api/interval/status"),
      ]);
      if (histRes.ok) {
        const histData = await histRes.json();
        setScanHistory(histData);
        if (histData.length > 0 && !latestScanRecord) {
          setLatestScanRecord(histData[0]);
        }
      }
      if (intervalRes.ok) {
        const intervalData = await intervalRes.json();
        setIsContinuousActive(intervalData.active);
      }
    } catch (err) {
      console.error("Fetch history error:", err);
    }
  }, [latestScanRecord]);

  // Initial load
  useEffect(() => {
    fetchSystemHealth();
    fetchHistory();
  }, [fetchSystemHealth, fetchHistory]);

  // Periodic polling for history when 5s continuous scanner is active
  useEffect(() => {
    if (!isContinuousActive) return;
    const interval = setInterval(() => {
      fetchHistory();
      fetchSystemHealth();
    }, 5000);
    return () => clearInterval(interval);
  }, [isContinuousActive, fetchHistory, fetchSystemHealth]);

  // Toggle 5s Continuous Background Scanner
  const handleToggleContinuous = async () => {
    try {
      const nextActive = !isContinuousActive;
      const res = await fetch("/api/interval/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: nextActive,
          intervalSeconds: continuousSeconds,
          target: "127.0.0.1",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsContinuousActive(data.active);
        if (data.active) {
          fetchHistory();
        }
      }
    } catch (err) {
      console.error("Failed to toggle continuous scan:", err);
    }
  };

  // Run Network / Subnet Scan
  const handleRunNetworkScan = async (target: string, scanType: string, ports: number[]) => {
    try {
      setIsScanLoading(true);
      const res = await fetch("/api/scan/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, scanType, ports }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Network scan failed");
      }

      const data = await res.json();
      setDiscoveredHosts(data.hosts || []);
      setLatestScanRecord(data.record || null);

      // Merge newly discovered vulnerabilities
      if (data.vulnerabilities && data.vulnerabilities.length > 0) {
        setVulnerabilities((prev) => {
          const map = new Map<string, VulnerabilityFinding>();
          [...data.vulnerabilities, ...prev].forEach((v) => map.set(v.title, v));
          return Array.from(map.values());
        });
      }

      fetchHistory();
    } catch (err: any) {
      alert(`Scan error: ${err.message}`);
    } finally {
      setIsScanLoading(false);
    }
  };

  // Run Web Security Posture Audit
  const handleRunWebAudit = async (url: string) => {
    try {
      setIsAuditLoading(true);
      const res = await fetch("/api/scan/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Web audit failed");
      }

      const data: WebAuditResult = await res.json();
      setAuditResult(data);

      if (data.vulnerabilities && data.vulnerabilities.length > 0) {
        setVulnerabilities((prev) => {
          const map = new Map<string, VulnerabilityFinding>();
          [...data.vulnerabilities, ...prev].forEach((v) => map.set(v.title, v));
          return Array.from(map.values());
        });
      }

      fetchHistory();
    } catch (err: any) {
      alert(`Web audit error: ${err.message}`);
    } finally {
      setIsAuditLoading(false);
    }
  };

  // Execute Terminal Command
  const handleExecTerminalCommand = async (command: string): Promise<TerminalExecutionResponse | null> => {
    try {
      setIsTerminalLoading(true);
      const res = await fetch("/api/terminal/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Execution failed");
      }

      const data: TerminalExecutionResponse = await res.json();
      fetchHistory();
      return data;
    } catch (err: any) {
      alert(`Terminal command error: ${err.message}`);
      return null;
    } finally {
      setIsTerminalLoading(false);
    }
  };

  // Generate Report / AI Remediation Plan
  const handleGenerateReport = async (scopeTitle: string) => {
    try {
      setIsReportLoading(true);
      const totalPorts = discoveredHosts.reduce((acc, h) => acc + h.openPorts.length, 0);
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetScope: scopeTitle,
          findings: vulnerabilities,
          hostCount: Math.max(1, discoveredHosts.length),
          portCount: totalPorts,
        }),
      });

      if (!res.ok) throw new Error("Failed to compile report");
      const data: RemediationReport = await res.json();
      setReport(data);
      setActiveTab("reports");
    } catch (err: any) {
      alert(`Report compilation error: ${err.message}`);
    } finally {
      setIsReportLoading(false);
    }
  };
  const handleGenerateScanReport = async (scanId: string) => {
  try {
    setIsReportLoading(true);

    const res = await fetch("/api/report/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scanId,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);

      throw new Error(
        errorData?.error || "Failed to generate scan report"
      );
    }

    const data: RemediationReport = await res.json();

    setReport(data);
    setActiveTab("reports");

    // Close the history drawer after selecting the scan.
    setIsHistoryOpen(false);
  } catch (err: any) {
    alert(
      `Scan report generation error: ${
        err?.message || "Unknown error"
      }`
    );
  } finally {
    setIsReportLoading(false);
  }
};

  const handleGenerateAIPlan = async () => {
    setIsGeneratingPlan(true);
    await handleGenerateReport("Kali CyberLab AI Remediation & Hardening Plan");
    setIsGeneratingPlan(false);
  };

  // Clear history
  const handleClearHistory = async () => {
    try {
      await fetch("/api/scan/history", { method: "DELETE" });
      setScanHistory([]);
    } catch (err) {
      console.error("Clear history error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 flex flex-col font-mono selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isContinuousActive={isContinuousActive}
        onToggleContinuous={handleToggleContinuous}
        continuousSeconds={continuousSeconds}
        openHistory={() => setIsHistoryOpen(true)}
        historyCount={scanHistory.length}
        serverHostname={systemHealth?.hostname}
        osDistro={systemHealth?.osInfo.distro}
      />

      {/* Main Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 space-y-5">
        
        {/* Live Host Telemetry & Hardware Banner */}
        <SystemHealthBanner
          health={systemHealth}
          isLoading={isHealthLoading}
          onRefresh={fetchSystemHealth}
        />

        {/* Tab Views */}
            {activeTab === "network" && (
            <NetworkScanner
              onRunScan={handleRunNetworkScan}
              isLoading={isScanLoading}
              discoveredHosts={discoveredHosts}
              latestScanRecord={latestScanRecord}
              onGenerateReport={handleGenerateScanReport}
              isReportLoading={isReportLoading}
              onSelectHostForAudit={(ip) => {
                setTargetWebUrl(`http://${ip}`);
                setActiveTab("web");
              }}
            />
          )}

        {activeTab === "web" && (
          <WebAuditor
            onRunAudit={handleRunWebAudit}
            isLoading={isAuditLoading}
            auditResult={auditResult}
            targetUrl={targetWebUrl}
            setTargetUrl={setTargetWebUrl}
          />
        )}

        {activeTab === "terminal" && (
          <TerminalRunner
            onExecCommand={handleExecTerminalCommand}
            isLoading={isTerminalLoading}
          />
        )}

        {activeTab === "remediation" && (
          <VulnerabilityRemediation
            vulnerabilities={vulnerabilities}
            onGenerateAIPlan={handleGenerateAIPlan}
            isGeneratingPlan={isGeneratingPlan}
          />
        )}

        {activeTab === "reports" && (
          <ReportGenerator
            report={report}
            onGenerateReport={handleGenerateReport}
            isLoading={isReportLoading}
            activeFindingsCount={vulnerabilities.length}
          />
        )}

        {activeTab === "python" && (
          <PythonEngineViewer />
        )}

        {activeTab === "migration" && (
          <KaliMigrationGuide />
        )}

       {activeTab === "arsenal" && (
  <SecurityArsenal
    onLaunch={(url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    }}
    onOpenObservium={() => {
      setActiveTab("observium");
    }}
  />
)}

{activeTab === "observium" && (
  <ObserviumDashboard
    onBack={() => {
      setActiveTab("arsenal");
    }}
  />
)}
    
        {activeTab === "tools" && (
          <SecurityToolsHub />
        )}  


      </main>

      {/* Scan History Side Drawer */}
      <ScanHistoryDrawer
       isOpen={isHistoryOpen}
       onClose={() => setIsHistoryOpen(false)}
       history={scanHistory}
       onClearHistory={handleClearHistory}
       onGenerateReport={handleGenerateScanReport}
       isReportLoading={isReportLoading}
      />       

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-3 text-center text-[10px] uppercase font-bold text-slate-500 tracking-wider">
        KALI CYBERLAB OPERATIONS SUITE • LIVE LINUX COMMAND ENGINE & SOC AUDIT SUITE
      </footer>
    </div>
  );
}
