export interface SystemHealth {
  hostname: string;
  osInfo: {
    platform: string;
    distro: string;
    release: string;
    kernel: string;
    arch: string;
  };
  uptimeSeconds: number;
  uptimeFormatted: string;
  cpu: {
    model: string;
    cores: number;
    usagePercent: number;
    loadAverage: number[];
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usedPercent: number;
  };
  disk: {
    filesystem: string;
    size: string;
    used: string;
    avail: string;
    usePercent: string;
    mountedOn: string;
  }[];
  interfaces: {
    name: string;
    ip: string;
    mac: string;
    netmask?: string;
    family?: string;
    internal: boolean;
  }[];
  listeningSockets: {
    protocol: string;
    localAddress: string;
    localPort: number | string;
    peerAddress: string;
    process?: string;
    state?: string;
  }[];
  toolsInstalled: {
    name: string;
    command: string;
    available: boolean;
    version?: string;
    path?: string;
  }[];
  timestamp: string;
}

export interface DiscoveredHost {
  ip: string;
  hostname?: string;
  mac?: string;
  vendor?: string;
  status: 'up' | 'down' | 'unfiltered';
  latencyMs?: number;

  openPorts: DiscoveredPort[];

  osGuess?: string;

  machineType?: {
    type:
      | 'qemu'
      | 'vmware'
      | 'virtualbox'
      | 'hyper-v'
      | 'xen'
      | 'bare-metal'
      | 'container'
      | 'unknown';
    virtualization?: string;
    architecture?: string;
  };

  cpuLoadPercent?: number;

  memory?: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usedPercent: number;
  };

  rootDisk?: {
    filesystem: string;
    size: string;
    used: string;
    available: string;
    usePercent: string;
    mountedOn: string;
  };

  sockets?: {
    protocol: string;
    localAddress: string;
    localPort: number | string;
    peerAddress: string;
    process?: string;
    state?: string;
  }[];

  interfaces?: {
    name: string;
    ip: string;
    mac: string;
    netmask?: string;
    family?: string;
    internal: boolean;
  }[];
 
  cpu?: {
    model: string;
    cores: number;
    usagePercent: number;
    loadAverage: number[];
  };
  lastSeen: string;
}

export interface DiscoveredPort {
  port: number;
  protocol: 'tcp' | 'udp';
  service: string;
  state: 'open' | 'closed' | 'filtered';
  version?: string;
  banner?: string;
}

export interface WebAuditResult {
  url: string;
  resolvedIp?: string;
  statusCode?: number;
  statusText?: string;
  responseTimeMs?: number;
  protocol?: string;
  securityScore: number; // 0 - 100
  securityGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  ssl?: {
    valid: boolean;
    issuer?: string;
    validTo?: string;
    daysRemaining?: number;
    protocol?: string;
  };
  headers: Record<string, string>;
  securityHeaders: {
    name: string;
    present: boolean;
    value?: string;
    recommendation: string;
    severity: 'low' | 'medium' | 'high' | 'critical' | 'pass';
  }[];
  vulnerabilities: VulnerabilityFinding[];
  timestamp: string;
  rawOutput?: string;
}

export interface VulnerabilityFinding {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'info';
  category: 'network' | 'service' | 'web' | 'system' | 'configuration';
  target: string;
  port?: number | string;
  description: string;
  impact: string;
  cvssScore: number;
  remediationAdvice: string;
  kaliCommands: string[];
  references?: string[];
  detectedVia: string;
  detectedAt: string;
}

export interface ScanRunRecord {
  id: string;
  timestamp: string;
  type: 'network' | 'single-host' | 'web' | 'quick-5s' | 'terminal-command';
  target: string;
  commandExecuted: string;
  durationMs: number;
  status: 'success' | 'failed' | 'running';
  hostsFound: number;
  openPortsTotal: number;
  vulnerabilitiesCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  rawTerminalOutput: string;
  results?: {
    hosts?: DiscoveredHost[];
    webAudit?: WebAuditResult;
    systemSnapshot?: Partial<SystemHealth>;
    vulnerabilities?: VulnerabilityFinding[];
  };
}

export interface RemediationReport {
  id: string;
  title: string;
  generatedAt: string;
  overallRiskLevel: 'Critical' | 'High' | 'Medium' | 'Low' | 'Secure';
  riskScore: number; // 0-100 (100 = most critical risk)
  summaryText: string;
  totalHostsScanned: number;
  totalOpenPorts: number;
  findings: VulnerabilityFinding[];
  remediationRoadmap: {
    step: number;
    phase: string;
    priority: 'Immediate (0-24h)' | 'High (1-3 days)' | 'Medium (1 week)' | 'Standard Hygiene';
    action: string;
    commands: string[];
  }[];
  rawScannerContext: string;
}

export interface TerminalExecutionRequest {
  command: string;
  args?: string[];
  target?: string;
  timeoutMs?: number;
}

export interface TerminalExecutionResponse {
  commandRun: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  timestamp: string;
  success: boolean;
}

export interface IndividualScanReport {
  id: string;
  scanId?: string;

  reportType: 'network' | 'web' | 'system';

  title: string;
  generatedAt: string;

  target: string;
  methodology: string;
  commandExecuted?: string;

  durationMs?: number;

  overallRiskLevel:
    | 'Critical'
    | 'High'
    | 'Medium'
    | 'Low'
    | 'Secure';

  riskScore: number;

  executiveSummary: string;

  scope: {
    hostsScanned: number;
    openPorts: number;
    vulnerabilities: number;
  };

  assets: DiscoveredHost[];

  findings: VulnerabilityFinding[];

  recommendations: {
    priority:
      | 'Immediate (0-24h)'
      | 'High (1-3 days)'
      | 'Medium (1 week)'
      | 'Standard Hygiene';

    title: string;
    reason: string;
    action: string;
    commands: string[];
    verification?: string[];
  }[];

  conclusion: string;

  rawEvidence?: string;
}
