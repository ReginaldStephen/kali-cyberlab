export type CyberLabModule =
  | "home"
  | "network"
  | "web"
  | "terminal"
  | "remediation"
  | "reports"
  | "python"
  | "migration"
  | "activity"
  | "arsenal"
  | "observium"
  | "greenbone"
  | "tshark"
  | "tools";

export type CyberLabAIAction =
  | {
      type: "OPEN_MODULE";
      module: CyberLabModule;
    }
  | {
      type: "SELECT";
      target: "greenbone_report";
      id: string;
    }
  | {
      type: "HIGHLIGHT";
      target: "greenbone_finding";
      field: "severity" | "name" | "host" | "port" | "oid";
      value: string;
    }
  | {
      type: "SEND_REPORT_TELEGRAM";
      reportId: string;
    };


export interface CyberLabAIResponse {
  reply: string;
  actions: CyberLabAIAction[];
}
