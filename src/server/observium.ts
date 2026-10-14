import {
  addObserviumDevice,
  discoverObserviumDevice,
  pollObserviumDevice,
  testObserviumDevice,
  validateObserviumDeviceInput,
} from "./observiumDeviceManagement";

import mysql, {
  Pool,
  RowDataPacket,
} from "mysql2/promise";

type DbRow = RowDataPacket & Record<string, unknown>;

let observiumDb: Pool | null = null;

function getObserviumDb(): Pool {
  if (!observiumDb) {
    observiumDb = mysql.createPool({
      host:
        process.env.OBSERVIUM_DB_HOST ||
        "127.0.0.1",

      port:
        Number(process.env.OBSERVIUM_DB_PORT) ||
        3306,

      database:
        process.env.OBSERVIUM_DB_NAME ||
        "observium",

      user:
        process.env.OBSERVIUM_DB_USER ||
        "observium",

      password:
        process.env.OBSERVIUM_DB_PASSWORD ||
        "",

      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }

  return observiumDb;
}

/*
 * Every table and every column below is an explicit allow-list.
 *
 * We never use SELECT *.
 *
 * The information_schema lookup lets the service tolerate a column
 * being absent on a particular Observium schema version without
 * exposing arbitrary database columns.
 */
const SAFE_COLUMNS: Record<string, string[]> = {
  devices: [
    "device_id",
    "hostname",
    "sysName",
    "label",
    "ip",
    "os",
    "vendor",
    "hardware",
    "location",
    "status",
    "status_type",
    "disabled",
    "last_polled",
    "last_discovered",
    "version",
    "features",
    "purpose",
    "type",
    "serial",
    "icon",
    "distro",
    "distro_ver",
    "kernel",
    "arch",
  ],

  ports: [
    "port_id",
    "device_id",
    "port_label",
    "ifDescr",
    "ifName",
    "ifIndex",
    "ifSpeed",
    "ifHighSpeed",
    "ifOperStatus",
    "ifAdminStatus",
    "ifDuplex",
    "ifMtu",
    "ifType",
    "ifAlias",
    "ifPhysAddress",
    "ifVlan",
    "ifTrunk",
    "ifVrf",
    "ifInOctets",
    "ifOutOctets",
    "ifInErrors",
    "ifOutErrors",
    "ifInErrors_rate",
    "ifOutErrors_rate",
    "ifInOctets_perc",
    "ifOutOctets_perc",
    "ifDiscards_rate",
    "ignore",
    "disabled",
    "deleted",
    "poll_time",
    "poll_period",
  ],

  processors: [
    "processor_id",
    "device_id",
    "processor_type",
    "processor_descr",
    "processor_oid",
    "processor_index",
    "processor_usage",
    "processor_usage_perc",
    "processor_value",
    "processor_limit",
    "processor_limit_warn",
    "processor_limit_low",
    "processor_limit_low_warn",
    "processor_polled",
    "processor_last_change",
    "processor_ignore",
  ],

  mempools: [
    "mempool_id",
    "device_id",
    "group_id",
    "mempool_descr",
    "mempool_mib",
    "mempool_index",
    "mempool_perc",
    "mempool_used",
    "mempool_free",
    "mempool_total",
    "mempool_limit",
    "mempool_limit_warn",
    "mempool_limit_low",
    "mempool_limit_low_warn",
    "mempool_polled",
    "mempool_ignore",
    "mempool_deleted",
  ],

  storage: [
    "storage_id",
    "device_id",
    "storage_type",
    "storage_descr",
    "storage_mib",
    "storage_index",
    "storage_units",
    "storage_size",
    "storage_used",
    "storage_free",
    "storage_perc",
    "storage_limit",
    "storage_limit_warn",
    "storage_limit_low",
    "storage_limit_low_warn",
    "storage_polled",
    "storage_ignore",
    "storage_deleted",
  ],

  sensors: [
    "sensor_id",
    "device_id",
    "poller_type",
    "sensor_class",
    "sensor_type",
    "sensor_descr",
    "sensor_oid",
    "sensor_mib",
    "sensor_object",
    "sensor_index",
    "sensor_unit",
    "sensor_limit",
    "sensor_limit_warn",
    "sensor_limit_low",
    "sensor_limit_low_warn",
    "sensor_value",
    "sensor_event",
    "sensor_status",
    "sensor_deleted",
    "sensor_polled",
    "sensor_last_change",
    "measured_port_id",
    "measured_port_group_id",
    "measured_printersupply_id",
    "measured_printersupply_group_id",
    "entPhysicalIndex_measured",
    "entPhysicalIndex",
  ],

  ipv4_addresses: [
    "ipv4_address_id",
    "device_id",
    "ipv4_address",
    "ipv4_prefixlen",
    "ipv4_type",
    "ipv4_network_id",
    "vrf_id",
    "port_id",
    "ifIndex",
  ],

  ipv6_addresses: [
    "ipv6_address_id",
    "device_id",
    "ipv6_address",
    "ipv6_compressed",
    "ipv6_prefixlen",
    "ipv6_type",
    "ipv6_origin",
    "ipv6_network_id",
    "vrf_id",
    "port_id",
    "ifIndex",
  ],

  vlans: [
    "vlan_id",
    "device_id",
    "ifIndex",
    "vlan_vlan",
    "vlan_domain",
    "vlan_name",
    "vlan_type",
    "vlan_mtu",
    "vlan_status",
    "vlan_context",
  ],

  vlans_fdb: [
    "fdb_id",
    "device_id",
    "vlan_id",
    "port_id",
    "mac_address",
    "fdb_status",
    "fdb_port",
    "fdb_last_change",
    "deleted",
  ],

  neighbours: [
    "neighbour_id",
    "device_id",
    "port_id",
    "remote_device_id",
    "remote_port_id",
    "active",
    "autodiscovery_id",
    "protocol",
    "remote_hostname",
    "remote_port",
    "remote_platform",
    "remote_version",
    "remote_address",
    "last_change",
  ],

  entPhysical: [
    "entPhysical_id",
    "device_id",
    "inventory_mib",
    "entPhysicalIndex",
    "entPhysicalDescr",
    "entPhysicalClass",
    "entPhysicalName",
    "entPhysicalHardwareRev",
    "entPhysicalFirmwareRev",
    "entPhysicalSoftwareRev",
    "entPhysicalAlias",
    "entPhysicalAssetID",
    "entPhysicalIsFRU",
    "entPhysicalModelName",
    "entPhysicalVendorType",
    "entPhysicalSerialNum",
    "entPhysicalContainedIn",
    "entPhysicalParentRelPos",
    "entPhysicalMfgName",
    "ifIndex",
    "deleted",
  ],

  entity_attribs: [
    "attrib_id",
    "device_id",
    "entity_type",
    "entity_id",
    "attrib_type",
    "attrib_value",
    "updated",
  ],

  counters: [
    "counter_id",
    "device_id",
    "poller_type",
    "counter_class",
    "counter_oid",
    "counter_mib",
    "counter_object",
    "counter_index",
    "counter_descr",
    "counter_unit",
    "counter_multiplier",
    "counter_limit",
    "counter_limit_warn",
    "counter_limit_low",
    "counter_limit_low_warn",
    "counter_limit_by",
    "counter_custom_limit",
    "entPhysicalIndex_measured",
    "measured_class",
    "measured_entity",
    "measured_entity_label",
    "entPhysicalIndex",
    "entPhysicalClass",
    "counter_ignore",
    "counter_disable",
    "counter_deleted",
    "counter_value",
    "counter_rate",
    "counter_rate_5min",
    "counter_rate_hour",
    "counter_event",
    "counter_status",
    "counter_polled",
    "counter_last_change",
  ],

  probes: [
    "probe_id",
    "device_id",
    "probe_descr",
    "probe_type",
    "probe_no_default",
    "probe_disabled",
    "probe_reset",
    "probe_status",
    "probe_msg",
    "probe_changed",
    "probe_checked",
  ],

  probe_metrics: [
    "metric_id",
    "probe_id",
    "metric_label",
    "metric_type",
    "metric_last_value",
    "metric_uom",
  ],

  groups: [
    "group_id",
    "entity_type",
    "group_name",
    "group_descr",
    "group_menu",
    "group_ignore",
    "group_ignore_until",
  ],

  groups_assoc: [
    "group_assoc_id",
    "group_id",
    "entity_type",
    "device_attribs",
    "entity_attribs",
  ],

  group_table: [
    "group_table_id",
    "group_id",
    "device_id",
    "entity_type",
    "entity_id",
    "group_assocs",
  ],

  alerts_maint: [
    "maint_id",
    "maint_name",
    "maint_descr",
    "maint_start",
    "maint_end",
    "maint_global",
    "maint_interval",
    "maint_interval_count",
  ],

  alerts_maint_assoc: [
    "maint_assoc_id",
    "maint_id",
    "entity_type",
    "entity_id",
  ],

  alert_tests: [
    "alert_test_id",
    "entity_type",
    "alert_name",
    "alert_message",
    "conditions",
    "conditions_warn",
    "and",
    "severity",
    "delay",
    "alerter",
    "enable",
    "show_frontpage",
    "suppress_recovery",
    "ignore_until",
  ],

  alert_assoc: [
    "alert_assoc_id",
    "alert_test_id",
    "entity_type",
    "device_attribs",
    "entity_attribs",
    "enable",
    "alerter",
    "severity",
    "count",
  ],

  alert_log: [
    "event_id",
    "alert_test_id",
    "device_id",
    "timestamp",
    "message",
    "entity_type",
    "entity_id",
    "log_type",
    "notified",
    "log_state",
  ],

  alert_table: [
    "alert_table_id",
    "alert_test_id",
    "device_id",
    "entity_type",
    "entity_id",
    "alert_assocs",
    "delay",
    "ignore_until",
    "ignore_until_ok",
    "last_checked",
    "last_changed",
    "has_alerted",
    "last_message",
    "alert_status",
    "state",
    "count",
  ],
};

const SAFE_TABLES = new Set(
  Object.keys(SAFE_COLUMNS)
);

const columnCache =
  new Map<string, Set<string>>();

async function getAvailableColumns(
  table: string
): Promise<Set<string>> {
  if (!SAFE_TABLES.has(table)) {
    throw new Error(
      `Observium table is not allow-listed: ${table}`
    );
  }

  const cached = columnCache.get(table);

  if (cached) {
    return cached;
  }

  const [rows] =
    await getObserviumDb().execute(
      `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
      `,
      [
        process.env.OBSERVIUM_DB_NAME ||
          "observium",
        table,
      ]
    );

  const columns = new Set(
    (rows as DbRow[]).map((row) =>
      String(row.COLUMN_NAME)
    )
  );

  columnCache.set(table, columns);

  return columns;
}

async function selectSafe(
  table: string,
  where = "",
  params: unknown[] = [],
  orderBy = "",
  limit?: number
): Promise<DbRow[]> {
  const available =
    await getAvailableColumns(table);

  const columns = SAFE_COLUMNS[table]
    .filter((column) =>
      available.has(column)
    );

  if (columns.length === 0) {
    throw new Error(
      `No approved columns are available for Observium table ${table}.`
    );
  }

  let sql = `
    SELECT
      ${columns.map((column) =>
        `\`${column}\``
      ).join(",\n      ")}
    FROM \`${table}\`
  `;

  if (where.trim()) {
    sql += ` WHERE ${where}`;
  }

  if (orderBy.trim()) {
    sql += ` ORDER BY ${orderBy}`;
  }

  if (
    Number.isInteger(limit) &&
    Number(limit) > 0
  ) {
    sql += ` LIMIT ${Math.min(
      Number(limit),
      1000
    )}`;
  }

  const [rows] =
    await getObserviumDb().execute(
      sql,
      params as any[]
    );

  return rows as DbRow[];
}

function deviceIdFrom(
  value: unknown
): number {
  const deviceId = Number(value);

  if (
    !Number.isInteger(deviceId) ||
    deviceId <= 0
  ) {
    throw new Error(
      "Invalid Observium device ID."
    );
  }

  return deviceId;
}

export const observiumService = {
  async getStatus() {
    try {
      const [versionRows] =
        await getObserviumDb().query(
          "SELECT VERSION() AS version"
        );

      const [deviceRows] =
        await getObserviumDb().query(
          "SELECT COUNT(*) AS device_count FROM devices"
        );

      const version =
        (versionRows as DbRow[])[0]?.version ||
        null;

      const deviceCount = Number(
        (deviceRows as DbRow[])[0]
          ?.device_count || 0
      );

      return {
        timestamp:
          new Date().toISOString(),

        configured: Boolean(
          process.env.OBSERVIUM_DB_NAME &&
          process.env.OBSERVIUM_DB_USER
        ),

        connected: true,

        source: "mysql",

        observiumUrl:
          process.env.OBSERVIUM_URL ||
          null,

        database: {
          host:
            process.env.OBSERVIUM_DB_HOST ||
            "127.0.0.1",

          port:
            Number(
              process.env.OBSERVIUM_DB_PORT
            ) || 3306,

          name:
            process.env.OBSERVIUM_DB_NAME ||
            "observium",
        },

        version,
        deviceCount,
      };
    } catch (error: any) {
      return {
        timestamp:
          new Date().toISOString(),

        configured: Boolean(
          process.env.OBSERVIUM_DB_NAME &&
          process.env.OBSERVIUM_DB_USER
        ),

        connected: false,

        source: "mysql",

        observiumUrl:
          process.env.OBSERVIUM_URL ||
          null,

        error:
          error?.message ||
          "Unable to connect to Observium MySQL.",
      };
    }
  },

  async getOverview() {
    const db = getObserviumDb();

    const [deviceRows] =
      await db.query(`
        SELECT
          COUNT(*) AS total_devices,

          SUM(
            CASE
              WHEN status = 1
                AND disabled = 0
              THEN 1
              ELSE 0
            END
          ) AS online_devices,

          SUM(
            CASE
              WHEN status = 0
                OR disabled = 1
              THEN 1
              ELSE 0
            END
          ) AS offline_devices

        FROM devices
      `);

    const [portRows] =
      await db.query(`
        SELECT
          COUNT(*) AS total_interfaces,

          SUM(
            CASE
              WHEN ifOperStatus = 'up'
              THEN 1
              ELSE 0
            END
          ) AS interfaces_up,

          SUM(
            CASE
              WHEN ifOperStatus <> 'up'
                OR ifOperStatus IS NULL
              THEN 1
              ELSE 0
            END
          ) AS interfaces_down,

          SUM(
            CASE
              WHEN ifInErrors_rate > 0
                OR ifOutErrors_rate > 0
              THEN 1
              ELSE 0
            END
          ) AS interfaces_with_errors,

          SUM(
            CASE
              WHEN ifInOctets_perc >= 80
                OR ifOutOctets_perc >= 80
              THEN 1
              ELSE 0
            END
          ) AS high_utilization_interfaces

        FROM ports

        WHERE deleted = 0
          AND disabled = 0
      `);

    const [alertRows] =
      await db.query(`
        SELECT
          COUNT(*) AS active_alerts
        FROM alert_table
        WHERE alert_status > 0
      `);

    const devices: Record<string, unknown> =
      (deviceRows as DbRow[])[0] || {};

    const ports: Record<string, unknown> =
      (portRows as DbRow[])[0] || {};

    const alerts: Record<string, unknown> =
      (alertRows as DbRow[])[0] || {};

    const totalDevices =
      Number(devices.total_devices || 0);

    const onlineDevices =
      Number(devices.online_devices || 0);

    const offlineDevices =
      Number(devices.offline_devices || 0);

    const totalInterfaces =
      Number(ports.total_interfaces || 0);

    const interfacesUp =
      Number(ports.interfaces_up || 0);

    const interfacesDown =
      Number(ports.interfaces_down || 0);

    const interfacesWithErrors =
      Number(
        ports.interfaces_with_errors || 0
      );

    const highUtilizationInterfaces =
      Number(
        ports.high_utilization_interfaces || 0
      );

    const activeAlerts =
      Number(alerts.active_alerts || 0);

    let health =
      "healthy";

    if (
      offlineDevices > 0 ||
      activeAlerts > 0 ||
      interfacesWithErrors > 0
    ) {
      health = "warning";
    }

    if (
      offlineDevices > 0 &&
      offlineDevices === totalDevices &&
      totalDevices > 0
    ) {
      health = "critical";
    }

    return {
      timestamp:
        new Date().toISOString(),

      health,

      devices: {
        total: totalDevices,
        online: onlineDevices,
        offline: offlineDevices,
      },

      interfaces: {
        total: totalInterfaces,
        up: interfacesUp,
        down: interfacesDown,
        withErrors:
          interfacesWithErrors,
        highUtilization:
          highUtilizationInterfaces,
      },

      alerts: {
        active: activeAlerts,
      },
    };
  },

  async testDevice(input: {
    hostname: string;
    version: string;
    port?: number;
    transport?: string;
    context?: string;
    community?: string;
    securityLevel?: string;
    username?: string;
    authPassword?: string;
    authAlgorithm?: string;
    privacyPassword?: string;
    privacyAlgorithm?: string;
  }) {
    const validated = validateObserviumDeviceInput(input);

    return testObserviumDevice(validated);
  },

  async addManagedDevice(input: {
    hostname: string;
    version: string;
    port?: number;
    transport?: string;
    context?: string;
    community?: string;
    securityLevel?: string;
    username?: string;
    authPassword?: string;
    authAlgorithm?: string;
    privacyPassword?: string;
    privacyAlgorithm?: string;
  }) {
    const validated = validateObserviumDeviceInput(input);
    const result = await addObserviumDevice(validated);

    const hostname = validated.hostname.toLowerCase();

    const devices = await selectSafe(
      "devices",
      "LOWER(hostname) = ?",
      [hostname],
      "device_id ASC",
      10,
    );

    return {
      ...result,
      device:
        devices.length > 0
          ? devices[0]
          : null,
    };
  },

  async discoverManagedDevice(
    deviceIdInput: unknown,
  ) {
    const deviceId = deviceIdFrom(deviceIdInput);

    const existing = await this.getDevice(deviceId);

    if (!existing) {
      throw new Error("Observium device not found.");
    }

    return {
      ...(await discoverObserviumDevice(deviceId)),
      device: await this.getDevice(deviceId),
    };
  },

  async pollManagedDevice(
    deviceIdInput: unknown,
  ) {
    const deviceId = deviceIdFrom(deviceIdInput);

    const existing = await this.getDevice(deviceId);

    if (!existing) {
      throw new Error("Observium device not found.");
    }

    return {
      ...(await pollObserviumDevice(deviceId)),
      device: await this.getDevice(deviceId),
    };
  },

  async getDevices() {
    const devices =
      await selectSafe(
        "devices",
        "",
        [],
        "device_id ASC",
        1000
      );

    return {
      timestamp:
        new Date().toISOString(),
      devices,
    };
  },

  async searchDevices(
    query: string
  ) {
    const rawQuery =
      String(query || "").trim();

    if (!rawQuery) {
      return {
        timestamp:
          new Date().toISOString(),
        query: "",
        devices: [],
      };
    }

    const searchTerm =
      `%${rawQuery}%`;

    const devices: DbRow[] =
      await selectSafe(
        "devices",
        `
          hostname LIKE ?
          OR sysName LIKE ?
          OR label LIKE ?
          OR ip LIKE ?
          OR os LIKE ?
          OR vendor LIKE ?
          OR hardware LIKE ?
          OR location LIKE ?
        `,
        [
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm,
        ],
        "device_id ASC",
        50
      );

    return {
      timestamp:
        new Date().toISOString(),
      query: rawQuery,
      devices,
    };
  },

  async getDevice(
    deviceIdInput: unknown
  ) {
    const deviceId =
      deviceIdFrom(deviceIdInput);

    const rows =
      await selectSafe(
        "devices",
        "device_id = ?",
        [deviceId],
        "device_id ASC",
        1
      );

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  },

  async getPorts(
    deviceIdInput: unknown
  ) {
    const deviceId =
      deviceIdFrom(deviceIdInput);

    return selectSafe(
      "ports",
      `
        device_id = ?
        AND (
          deleted = 0
          OR deleted IS NULL
        )
      `,
      [deviceId],
      "ifIndex ASC",
      1000
    );
  },

  async getProcessors(
    deviceIdInput: unknown
  ) {
    const deviceId =
      deviceIdFrom(deviceIdInput);

    return selectSafe(
      "processors",
      "device_id = ?",
      [deviceId],
      "processor_id ASC",
      500
    );
  },

  async getMemory(
    deviceIdInput: unknown
  ) {
    const deviceId =
      deviceIdFrom(deviceIdInput);

    return selectSafe(
      "mempools",
      `
        device_id = ?
        AND (
          mempool_deleted = 0
          OR mempool_deleted IS NULL
        )
      `,
      [deviceId],
      "mempool_id ASC",
      500
    );
  },

  async getStorage(
    deviceIdInput: unknown
  ) {
    const deviceId =
      deviceIdFrom(deviceIdInput);

    return selectSafe(
      "storage",
      `
        device_id = ?
        AND (
          storage_deleted = 0
          OR storage_deleted IS NULL
        )
      `,
      [deviceId],
      "storage_id ASC",
      500
    );
  },

  async getSensors(
    deviceIdInput: unknown
  ) {
    const deviceId =
      deviceIdFrom(deviceIdInput);

    return selectSafe(
      "sensors",
      `
        device_id = ?
        AND (
          sensor_deleted = 0
          OR sensor_deleted IS NULL
        )
      `,
      [deviceId],
      "sensor_id ASC",
      500
    );
  },

  async getAddresses(
    deviceIdInput: unknown
  ) {
    const deviceId =
      deviceIdFrom(deviceIdInput);

    const [
      ipv4,
      ipv6,
    ] = await Promise.all([
      selectSafe(
        "ipv4_addresses",
        "device_id = ?",
        [deviceId],
        "ipv4_address_id ASC",
        500
      ),

      selectSafe(
        "ipv6_addresses",
        "device_id = ?",
        [deviceId],
        "ipv6_address_id ASC",
        500
      ),
    ]);

    return {
      ipv4,
      ipv6,
    };
  },

  async getVlans(
    deviceIdInput: unknown
  ) {
    const deviceId =
      deviceIdFrom(deviceIdInput);

    const [
      vlans,
      fdb,
    ] = await Promise.all([
      selectSafe(
        "vlans",
        "device_id = ?",
        [deviceId],
        "vlan_id ASC",
        1000
      ),

      selectSafe(
        "vlans_fdb",
        `
          device_id = ?
          AND (
            deleted = 0
            OR deleted IS NULL
          )
        `,
        [deviceId],
        "fdb_id ASC",
        1000
      ),
    ]);

    return {
      vlans,
      fdb,
    };
  },

  async getNeighbours(
    deviceIdInput: unknown
  ) {
    const deviceId =
      deviceIdFrom(deviceIdInput);

    return selectSafe(
      "neighbours",
      "device_id = ?",
      [deviceId],
      "neighbour_id ASC",
      500
    );
  },

  async getInventory(
    deviceIdInput: unknown
  ) {
    const deviceId =
      deviceIdFrom(deviceIdInput);

    const [
      physical,
      attributes,
    ] = await Promise.all([
      selectSafe(
        "entPhysical",
        `
          device_id = ?
          AND (
            deleted IS NULL
            OR deleted = 0
          )
        `,
        [deviceId],
        "entPhysicalIndex ASC",
        1000
      ),

      selectSafe(
        "entity_attribs",
        "device_id = ?",
        [deviceId],
        "attrib_id ASC",
        1000
      ),
    ]);

    return {
      physical,
      attributes,
    };
  },

  async getCounters(
    deviceIdInput: unknown
  ) {
    const deviceId =
      deviceIdFrom(deviceIdInput);

    return selectSafe(
      "counters",
      `
        device_id = ?
        AND (
          counter_deleted = 0
          OR counter_deleted IS NULL
        )
        AND (
          counter_disable = 0
          OR counter_disable IS NULL
        )
      `,
      [deviceId],
      "counter_id ASC",
      500
    );
  },

  async getProbes(
    deviceIdInput: unknown
  ) {
    const deviceId =
      deviceIdFrom(deviceIdInput);

    const probes =
      await selectSafe(
        "probes",
        "device_id = ?",
        [deviceId],
        "probe_id ASC",
        500
      );

    const probeIds =
      probes
        .map((probe) =>
          Number(probe.probe_id)
        )
        .filter(
          (id) =>
            Number.isInteger(id) &&
            id > 0
        );

    if (probeIds.length === 0) {
      return {
        probes,
        metrics: [],
      };
    }

    const placeholders =
      probeIds.map(() => "?").join(",");

    const metrics =
      await selectSafe(
        "probe_metrics",
        `probe_id IN (${placeholders})`,
        probeIds,
        "metric_id ASC",
        1000
      );

    return {
      probes,
      metrics,
    };
  },

  async getAlerts(
    limitInput?: unknown
  ) {
    const limit = Math.min(
      Math.max(
        Number(limitInput) || 200,
        1
      ),
      1000
    );

    return selectSafe(
      "alert_table",
      "",
      [],
      "alert_table_id DESC",
      limit
    );
  },

  async getAlertLog(
    limitInput?: unknown
  ) {
    const limit = Math.min(
      Math.max(
        Number(limitInput) || 200,
        1
      ),
      1000
    );

    return selectSafe(
      "alert_log",
      "",
      [],
      "event_id DESC",
      limit
    );
  },

  async getAlertChecks() {
    const [
      tests,
      associations,
    ] = await Promise.all([
      selectSafe(
        "alert_tests",
        "",
        [],
        "alert_test_id ASC",
        500
      ),

      selectSafe(
        "alert_assoc",
        "",
        [],
        "alert_assoc_id ASC",
        1000
      ),
    ]);

    return {
      tests,
      associations,
    };
  },

  async getGroups() {
    const [
      groups,
      associations,
      members,
    ] = await Promise.all([
      selectSafe(
        "groups",
        "",
        [],
        "group_id ASC",
        500
      ),

      selectSafe(
        "groups_assoc",
        "",
        [],
        "group_assoc_id ASC",
        1000
      ),

      selectSafe(
        "group_table",
        "",
        [],
        "group_table_id ASC",
        2000
      ),
    ]);

    return {
      groups,
      associations,
      members,
    };
  },

  async getMaintenance() {
    const [
      maintenance,
      associations,
    ] = await Promise.all([
      selectSafe(
        "alerts_maint",
        "",
        [],
        "maint_id ASC",
        500
      ),

      selectSafe(
        "alerts_maint_assoc",
        "",
        [],
        "maint_assoc_id ASC",
        1000
      ),
    ]);

    return {
      maintenance,
      associations,
    };
  },

  async getTopology() {
    const { devices } = await this.getDevices();

    const links = [];
    const linkKeys = new Set();
    const vlans = [];
    const vlanKeys = new Set();
    const networks = [];

    for (const device of devices) {
      const neighbours = await this.getNeighbours(
        device.device_id
      );

      const [
        addresses,
        vlanData,
      ] = await Promise.all([
        this.getAddresses(device.device_id),
        this.getVlans(device.device_id),
      ]);

      for (const neighbour of neighbours) {
        if (
          neighbour.remote_device_id === null ||
          neighbour.remote_device_id === undefined
        ) {
          continue;
        }

        const source = String(device.device_id);
        const target = String(
          neighbour.remote_device_id
        );

        const localPort = String(
          neighbour.port_id ?? ""
        );

        const remotePort = String(
          neighbour.remote_port_id ?? ""
        );

        const a = `${source}:${localPort}`;
        const b = `${target}:${remotePort}`;

        const key =
          a < b ? `${a}|${b}` : `${b}|${a}`;

        if (linkKeys.has(key)) {
          continue;
        }

        linkKeys.add(key);

        links.push({
          id: `link-${links.length + 1}`,
          source,
          target,
          source_port_id:
            neighbour.port_id ?? null,
          target_port_id:
            neighbour.remote_port_id ?? null,
          protocol:
            neighbour.protocol ?? null,
          remote_hostname:
            neighbour.remote_hostname ?? null,
          remote_port:
            neighbour.remote_port ?? null,
          remote_address:
            neighbour.remote_address ?? null,
          remote_platform:
            neighbour.remote_platform ?? null,
          active:
            neighbour.active ?? null,
          last_change:
            neighbour.last_change ?? null,
        });
      }

      for (const vlan of vlanData.vlans) {
        const key =
          `${device.device_id}:${vlan.vlan_id ?? vlan.vlan_vlan ?? ""}`;

        if (vlanKeys.has(key)) {
          continue;
        }

        vlanKeys.add(key);

        vlans.push({
          id: key,
          device_id: device.device_id,
          vlan_id: vlan.vlan_id ?? null,
          vlan_vlan: vlan.vlan_vlan ?? null,
          vlan_name: vlan.vlan_name ?? null,
          vlan_domain: vlan.vlan_domain ?? null,
          vlan_type: vlan.vlan_type ?? null,
          vlan_mtu: vlan.vlan_mtu ?? null,
          vlan_status: vlan.vlan_status ?? null,
          vlan_context: vlan.vlan_context ?? null,
          ifIndex: vlan.ifIndex ?? null,
        });
      }

      for (const address of addresses.ipv4) {
        networks.push({
          id: `ipv4-${address.ipv4_address_id}`,
          family: "ipv4",
          address:
            address.ipv4_address ?? null,
          prefix_length:
            address.ipv4_prefixlen ?? null,
          address_id:
            address.ipv4_address_id ?? null,
          device_id:
            device.device_id,
          port_id:
            address.port_id ?? null,
        });
      }

      for (const address of addresses.ipv6) {
        networks.push({
          id: `ipv6-${address.ipv6_address_id}`,
          family: "ipv6",
          address:
            address.ipv6_address ?? null,
          prefix_length:
            address.ipv6_prefixlen ?? null,
          address_id:
            address.ipv6_address_id ?? null,
          device_id:
            device.device_id,
          port_id:
            address.port_id ?? null,
        });
      }
    }

    return {
      timestamp: new Date().toISOString(),
      nodes: devices.map((device) => ({
        id: String(device.device_id),
        type: "device",
        ...device,
      })),
      links,
      vlans,
      networks,
      stats: {
        devices: devices.length,
        links: links.length,
        vlans: vlans.length,
        networks: networks.length,
      },
    };
  },

  async getDeviceDetails(
    deviceIdInput: unknown
  ) {
    const deviceId =
      deviceIdFrom(deviceIdInput);

    const device =
      await this.getDevice(deviceId);

    if (!device) {
      return null;
    }

    const [
      ports,
      processors,
      memory,
      storage,
      sensors,
    ] = await Promise.all([
      this.getPorts(deviceId),
      this.getProcessors(deviceId),
      this.getMemory(deviceId),
      this.getStorage(deviceId),
      this.getSensors(deviceId),
    ]);

    return {
      timestamp:
        new Date().toISOString(),

      device,

      ports,
      processors,
      memory,
      storage,
      sensors,
    };
  },
};
