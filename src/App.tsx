/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { ShieldAlert, CheckCircle2, XCircle, LockKeyhole } from "lucide-react";
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
import { NetworkScanner } from "./components/NetworkScanner";
import { WebAuditor } from "./components/WebAuditor";
import { TerminalRunner } from "./components/TerminalRunner";
import { VulnerabilityRemediation } from "./components/VulnerabilityRemediation";
import { ReportGenerator } from "./components/ReportGenerator";
import { ReportAILibrary } from "./components/ReportAILibrary";
import { KaliMigrationGuide } from "./components/KaliMigrationGuide";
import { PythonEngineViewer } from "./components/PythonEngineViewer";
import { ScanHistoryDrawer } from "./components/ScanHistoryDrawer";
import { SecurityToolsHub } from "./components/SecurityToolsHub";
import { SecurityArsenal } from "./components/SecurityArsenal";
import { ObserviumDashboard } from "./components/ObserviumDashboard";
import { GreenboneDashboard } from "./components/GreenboneDashboard";
import { TSharkDashboard } from "./components/TSharkDashboard";
import { AISecurityBuddy } from "./components/AISecurityBuddy";
import { ActivityCenter } from "./components/ActivityCenter";
import { Login } from "./components/Login";
import { CyberLabHome } from "./components/CyberLabHome";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [showReportAILibrary, setShowReportAILibrary] = useState<boolean>(false);

  // CyberLab Authentication
  const [authUser, setAuthUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

    // ============================================================
  // 15-MINUTE SECURITY RE-AUTHENTICATION
  // ============================================================
  const REAUTH_INTERVAL_MS = 15 * 60 * 1000;

  const [isSecurityLocked, setIsSecurityLocked] =
    useState<boolean>(false);

  const [reauthPassword, setReauthPassword] =
    useState<string>("");

  const [reauthLoading, setReauthLoading] =
    useState<boolean>(false);

  const [reauthError, setReauthError] =
    useState<string>("");

  const [reauthSuccess, setReauthSuccess] =
    useState<boolean>(false);

  const [reauthResetKey, setReauthResetKey] =
    useState<number>(0);
  
  // Check whether a valid CyberLab session already exists.
  useEffect(() => {
    let mounted = true;

    const checkAuthentication = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!mounted) return;

        if (response.ok) {
          const data = await response.json();
          setAuthUser(data.user || null);
        } else {
          setAuthUser(null);
        }
      } catch (error) {
        console.error("Authentication check failed:", error);

        if (mounted) {
          setAuthUser(null);
        }
      } finally {
        if (mounted) {
          setAuthChecking(false);
        }
      }
    };

    checkAuthentication();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // SECURITY TIMER
  //
  // Every 15 minutes the CyberLab interface becomes locked.
  // This only locks the browser interface. It does NOT stop
  // Greenbone, Observium, scanners, or server-side operations.
  // ============================================================
  useEffect(() => {
    if (!authUser) {
      setIsSecurityLocked(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsSecurityLocked(true);
      setReauthPassword("");
      setReauthError("");
      setReauthSuccess(false);
    }, REAUTH_INTERVAL_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [authUser, reauthResetKey]);

  // ============================================================
  // LOGOUT
  //
  // This only destroys the user's web session.
  // It does NOT stop any CyberLab server-side operations.
  // ============================================================
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      setAuthUser(null);
      setIsSecurityLocked(false);
      setReauthPassword("");
      setReauthError("");
      setReauthSuccess(false);
      setReauthResetKey((key) => key + 1);
    }
  };

  // ============================================================
  // 15-MINUTE PASSWORD RE-AUTHENTICATION
  // ============================================================
  const handleReauthenticate = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!reauthPassword || reauthLoading) {
      return;
    }

    try {
      setReauthLoading(true);
      setReauthError("");
      setReauthSuccess(false);

      const response = await fetch(
        "/api/auth/reauthenticate",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password: reauthPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.verified) {
        // Any invalid re-authentication immediately ends the
        // current web session and returns the user to Login.
        if (response.status === 401) {
          await handleLogout();
          return;
        }

        setReauthError(
          data.error || "Security verification failed."
        );
        return;
      }

      // Password was successfully verified.
      setReauthSuccess(true);

      // Give the success animation time to play.
      window.setTimeout(() => {
        setReauthPassword("");
        setReauthError("");
        setReauthSuccess(false);
        setIsSecurityLocked(false);

        // Restart the complete 15-minute security period.
        setReauthResetKey((key) => key + 1);
      }, 900);

    } catch (error) {
      console.error(
        "Re-authentication request failed:",
        error
      );

      setReauthError(
        "Unable to contact the CyberLab security service."
      );
    } finally {
      setReauthLoading(false);
    }
  };


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
    if (!authUser) return;

    fetchSystemHealth();
    fetchHistory();
  }, [authUser, fetchSystemHealth, fetchHistory]);

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
  // Show a loading screen while the existing session is being checked.
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center font-mono">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-slate-700 border-t-red-500 animate-spin" />
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Initializing CyberLab
          </p>
        </div>
      </div>
    );
  }

  // No authenticated session: show the CyberLab login page.
  if (!authUser) {
    return <Login onLogin={setAuthUser} />;
  }
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
        onLogout={handleLogout}
        serverHostname={systemHealth?.hostname}
        osDistro={systemHealth?.osInfo.distro}
      />

      {/* Main Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 space-y-5">
        
        {/* Tab Views */}
            {activeTab === "home" && (
        <CyberLabHome
          systemHealth={systemHealth}
          isHealthLoading={isHealthLoading}
          scanHistory={scanHistory}
          onNavigate={setActiveTab}
        />
      )}

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
          <>
            {showReportAILibrary ? (
              <ReportAILibrary
                onBack={() =>
                  setShowReportAILibrary(false)
                }
              />
            ) : (
              <ReportGenerator
                report={report}
                onGenerateReport={handleGenerateReport}
                isLoading={isReportLoading}
                activeFindingsCount={vulnerabilities.length}
                onOpenReportAILibrary={() =>
                  setShowReportAILibrary(true)
                }
              />
            )}
          </>
        )}

        {activeTab === "python" && (
          <PythonEngineViewer />
        )}

        {activeTab === "migration" && (
          <KaliMigrationGuide />
        )}
      {activeTab === "activity" && (
        <ActivityCenter />
      )}

      {activeTab === "arsenal" && (
  <SecurityArsenal
    onLaunch={(url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    }}
    onOpenObservium={() => {
      setActiveTab("observium");
    }}
    onOpenGreenbone={() => {
      setActiveTab("greenbone");
    }}
    onOpenTShark={() => {
      setActiveTab("tshark");
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


{activeTab === "greenbone" && (
  <GreenboneDashboard
    onBack={() => {
      setActiveTab("arsenal");
    }}
  />
)}

{activeTab === "tshark" && (
  <TSharkDashboard
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
        KALI CYBERLAB OPERATIONS SUITE • LIVE LINUX COMMAND ENGINE & SOC AUDIT SUITE Powered by Kali Linux • © 2026 Reggie Lee • All Rights Reserved
           </footer>

        {/* ============================================================
          AI SECURITY BUDDY
          Floating assistant available across CyberLab
          ============================================================ */}
      <AISecurityBuddy />

      {/* ============================================================
          15-MINUTE SECURITY LOCK SCREEN
          ============================================================ */}
      {isSecurityLocked && (
        <>
          <style>{`
            @keyframes cyberlabLockIn {
              0% {
                opacity: 0;
                transform: scale(1.04);
              }
              100% {
                opacity: 1;
                transform: scale(1);
              }
            }

            @keyframes cyberlabPanelIn {
              0% {
                opacity: 0;
                transform: translateY(24px) scale(0.96);
              }
              100% {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            @keyframes cyberlabScan {
              0% {
                transform: translateY(-100%);
              }
              100% {
                transform: translateY(100vh);
              }
            }

            @keyframes cyberlabGlow {
              0%, 100% {
                opacity: 0.25;
                transform: scale(0.95);
              }
              50% {
                opacity: 0.55;
                transform: scale(1.05);
              }
            }

            @keyframes cyberlabShake {
              0%, 100% {
                transform: translateX(0);
              }
              20% {
                transform: translateX(-8px);
              }
              40% {
                transform: translateX(8px);
              }
              60% {
                transform: translateX(-6px);
              }
              80% {
                transform: translateX(6px);
              }
            }

            @keyframes cyberlabSuccess {
              0% {
                opacity: 0;
                transform: scale(0.7);
              }
              70% {
                opacity: 1;
                transform: scale(1.08);
              }
              100% {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>

          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden"
            style={{
              animation: "cyberlabLockIn 0.45s ease-out",
            }}
          >
            {/* Blur and disable the entire CyberLab interface behind the lock */}
            <div
              className="pointer-events-auto absolute inset-0 z-0 bg-slate-950/45 backdrop-blur-md"
              aria-hidden="true"
            />

            {/* Animated red security glow */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-900/20 blur-3xl"
              style={{
                animation: "cyberlabGlow 3s ease-in-out infinite",
              }}
            />

            {/* Cyber grid */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
                backgroundSize: "42px 42px",
              }}
            />

            {/* Moving scan line */}
            <div
              className="pointer-events-none absolute left-0 right-0 h-px bg-cyan-500/40 shadow-[0_0_20px_rgba(239,68,68,0.8)]"
              style={{
                animation: "cyberlabScan 4s linear infinite",
              }}
            />

            {/* Security panel */}
            <div
              className="relative z-10 w-[92%] max-w-md overflow-hidden rounded-2xl border border-cyan-900/60 bg-slate-950/95 shadow-[0_0_80px_rgba(8,145,178,0.30)]"
              style={{
                animation: "cyberlabPanelIn 0.55s ease-out",
              }}
            >
              {/* Top security strip */}
              <div className="h-1 w-full bg-gradient-to-r from-cyan-950 via-cyan-500 to-cyan-950" />

              <div className="p-7">
                {/* Security icon */}
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/20" />

                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-950/40 shadow-[0_0_35px_rgba(34,211,238,0.22)]">
                      {reauthSuccess ? (
                        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                      ) : (
                        <LockKeyhole className="h-10 w-10 text-cyan-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Heading */}
                <div className="text-center">
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        reauthSuccess
                          ? "bg-emerald-400"
                          : "bg-cyan-400 animate-pulse"
                      }`}
                    />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                      {reauthSuccess
                        ? "Identity Verified"
                        : "Security Protocol Active"}
                    </span>
                  </div>

                  <h2
                    className={`text-2xl font-black uppercase tracking-widest ${
                      reauthSuccess
                        ? "text-emerald-400"
                        : "text-cyan-400"
                    }`}
                  >
                    {reauthSuccess
                      ? "Access Restored"
                      : "Session Locked"}
                  </h2>

                  <p className="mt-2 font-mono text-xs uppercase tracking-wider text-cyan-400">
                    15-Minute Re-Authentication Required
                  </p>

                  <p className="mt-3 text-xs leading-relaxed text-slate-500">
                    CyberLab operations remain active, but this interface
                    is temporarily restricted. Confirm your password to
                    continue.
                  </p>
                </div>

                {reauthSuccess ? (
                  <div
                    className="mt-7 rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-4 py-4 text-center"
                    style={{
                      animation: "cyberlabSuccess 0.45s ease-out",
                    }}
                  >
                    <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-400" />
                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
                      Security Verification Successful
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Restoring CyberLab access...
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={handleReauthenticate}
                    className="mt-7"
                  >
                    <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Confirm Password
                    </label>

                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />

                      <input
                        type="password"
                        value={reauthPassword}
                        onChange={(event) =>
                          setReauthPassword(event.target.value)
                        }
                        autoFocus
                        autoComplete="current-password"
                        placeholder="Enter your CyberLab password"
                        disabled={reauthLoading}
                        className={`w-full rounded-lg border bg-slate-900/80 py-3 pl-10 pr-4 font-mono text-sm text-white outline-none transition-all placeholder:text-slate-700 ${
                          reauthError
                            ? "border-cyan-500/70 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                            : "border-slate-700 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30"
                        }`}
                      />
                    </div>

                    {/* Error message */}
                    {reauthError && (
                      <div
                        className="mt-3 flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2.5"
                        style={{
                          animation: "cyberlabShake 0.45s ease-in-out",
                        }}
                      >
                        <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-red-400">
                          {reauthError}
                        </span>
                      </div>
                    )}

                    {/* Verify button */}
                    <button
                      type="submit"
                      disabled={
                        reauthLoading || !reauthPassword
                      }
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-700/60 bg-cyan-950/50 px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-cyan-300 transition-all duration-300 hover:border-cyan-400 hover:bg-cyan-600 hover:text-white hover:shadow-[0_0_30px_rgba(34,211,238,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {reauthLoading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
                          Verifying Identity...
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-4 w-4" />
                          Verify & Continue
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Security status */}
                <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-slate-600">
                      Interface Status
                    </p>
                    <p className="mt-1 font-mono text-[10px] font-bold uppercase text-cyan-400">
                      Access Restricted
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:border-cyan-700/60 hover:bg-cyan-950/40 hover:text-cyan-400"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
