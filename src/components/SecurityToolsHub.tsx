import React from "react";
import {
  ShieldCheck,
  Bug,
  Activity,
  Globe,
  Eye,
  BarChart3,
  Network,
  Server,
  Radar,
} from "lucide-react";

import {
  SecurityTool,
  SecurityToolCard,
} from "./SecurityToolCard";

const securityTools: SecurityTool[] = [
  {
    id: "greenbone",
    name: "Greenbone / OpenVAS",
    category: "Vulnerability Management",
    description:
      "Enterprise-grade vulnerability assessment and security scanning platform for identifying weaknesses across hosts, services, and infrastructure.",
    url: "https://127.0.0.1:9392",
    status: "available",
    icon: <Bug className="h-6 w-6" />,
    accent: "emerald",
  },
  {
    id: "observium",
    name: "Observium",
    category: "Network Monitoring",
    description:
      "Network and infrastructure monitoring platform for observing devices, interfaces, traffic, performance metrics, and operational health.",
    url: "http://127.0.0.1/observium",
    status: "available",
    icon: <Activity className="h-6 w-6" />,
    accent: "blue",
  },
  {
    id: "burpsuite",
    name: "Burp Suite",
    category: "Web Application Security",
    description:
      "Professional web security testing platform for intercepting HTTP traffic, discovering vulnerabilities, and validating application security.",
    url: "http://127.0.0.1:8080",
    status: "available",
    icon: <Globe className="h-6 w-6" />,
    accent: "orange",
  },
  {
    id: "wireshark",
    name: "Wireshark",
    category: "Network Analysis",
    description:
      "Deep packet inspection and network protocol analysis platform for investigating traffic, anomalies, and communication behavior.",
    url: "#",
    status: "planned",
    icon: <Eye className="h-6 w-6" />,
    accent: "purple",
  },
  {
    id: "wazuh",
    name: "Wazuh",
    category: "SIEM / XDR",
    description:
      "Security monitoring and detection platform for endpoint telemetry, log analysis, threat detection, compliance, and incident investigation.",
    url: "#",
    status: "planned",
    icon: <ShieldCheck className="h-6 w-6" />,
    accent: "red",
  },
  {
    id: "grafana",
    name: "Grafana",
    category: "Security Analytics",
    description:
      "Interactive observability and visualization platform for transforming infrastructure and security telemetry into operational dashboards.",
    url: "#",
    status: "planned",
    icon: <BarChart3 className="h-6 w-6" />,
    accent: "yellow",
  },
  {
    id: "zabbix",
    name: "Zabbix",
    category: "Infrastructure Monitoring",
    description:
      "Infrastructure monitoring platform for servers, network devices, applications, availability, performance, and alerting.",
    url: "#",
    status: "planned",
    icon: <Server className="h-6 w-6" />,
    accent: "cyan",
  },
  {
    id: "thehive",
    name: "TheHive",
    category: "Incident Response",
    description:
      "Collaborative incident response and case management platform for organizing investigations, alerts, observables, and response activities.",
    url: "#",
    status: "planned",
    icon: <Radar className="h-6 w-6" />,
    accent: "violet",
  },
  {
    id: "misp",
    name: "MISP",
    category: "Threat Intelligence",
    description:
      "Threat intelligence platform for collecting, correlating, sharing, and managing indicators of compromise and security events.",
    url: "#",
    status: "planned",
    icon: <Network className="h-6 w-6" />,
    accent: "pink",
  },
];

export const SecurityToolsHub: React.FC = () => {
  const availableTools = securityTools.filter(
    (tool) => tool.status === "available"
  );

  const plannedTools = securityTools.filter(
    (tool) => tool.status === "planned"
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              CyberLab Security Ecosystem
            </div>

            <h1 className="mt-2 text-xl font-bold uppercase tracking-wider text-white">
              Security Tools & Integrations
            </h1>

            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
              Central access point for the external security, monitoring,
              vulnerability management, incident response, and analytics
              systems supporting the Kali CyberLab environment.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-center">
              <strong className="block text-lg text-emerald-400">
                {availableTools.length}
              </strong>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-600">
                Available
              </span>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-center">
              <strong className="block text-lg text-slate-300">
                {plannedTools.length}
              </strong>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-600">
                Planned
              </span>
            </div>

            <div className="col-span-2 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-center sm:col-span-1">
              <strong className="block text-lg text-white">
                {securityTools.length}
              </strong>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-600">
                Ecosystem
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Available integrations */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />

          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Active Security Systems
          </h2>

          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {availableTools.map((tool) => (
            <SecurityToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Planned integrations */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-600" />

          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Integration Roadmap
          </h2>

          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plannedTools.map((tool) => (
            <SecurityToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Architecture footer */}
      <section className="rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-500">
              Integration Architecture
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              Kali CyberLab acts as the central operational interface while
              specialized security systems operate as connected branches.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Central Hub
            <span className="mx-1 text-slate-700">→</span>
            External Security Ecosystem
          </div>
        </div>
      </section>
    </div>
  );
};
