import logger from '../config/logger';

let snmp: any;
try {
  snmp = require('net-snmp');
} catch {
  logger.warn('net-snmp module not available — SNMP polling disabled');
}

// Standard SNMP OIDs
const OIDs = {
  sysUptime: '1.3.6.1.2.1.1.3.0',
  sysDescr: '1.3.6.1.2.1.1.1.0',
  // HOST-RESOURCES-MIB
  hrProcessorLoad: '1.3.6.1.2.1.25.3.3.1.2',
  hrStorageDescr: '1.3.6.1.2.1.25.2.3.1.3',
  hrStorageSize: '1.3.6.1.2.1.25.2.3.1.5',
  hrStorageUsed: '1.3.6.1.2.1.25.2.3.1.6',
  hrStorageAllocationUnits: '1.3.6.1.2.1.25.2.3.1.4',
  // IF-MIB
  ifDescr: '1.3.6.1.2.1.2.2.1.2',
  ifOperStatus: '1.3.6.1.2.1.2.2.1.8',
  ifHCInOctets: '1.3.6.1.2.1.31.1.1.1.6',
  ifHCOutOctets: '1.3.6.1.2.1.31.1.1.1.10',
};

export interface DeviceMetricData {
  metricType: string;
  value: number;
  unit?: string;
  interfaceName?: string;
}

const createSession = (host: string, community: string, version: number = 2): any => {
  if (!snmp) return null;
  const snmpVersion = version === 1 ? snmp.Version1 : snmp.Version2c;
  return snmp.createSession(host, community, {
    version: snmpVersion,
    timeout: 10000,
    retries: 1,
  });
};

const getScalarValues = (session: any, oids: string[]): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    session.get(oids, (error: any, varbinds: any[]) => {
      if (error) return reject(error);
      resolve(varbinds);
    });
  });
};

const walkOid = (session: any, oid: string): Promise<any[]> => {
  return new Promise((resolve) => {
    const results: any[] = [];
    session.subtree(oid, 20, (varbinds: any[]) => {
      varbinds.forEach(vb => results.push(vb));
    }, (error: any) => {
      if (error) logger.warn(`SNMP walk error for ${oid}: ${error.message}`);
      resolve(results);
    });
  });
};

const getCpuUsage = async (session: any): Promise<number> => {
  try {
    const varbinds = await walkOid(session, OIDs.hrProcessorLoad);
    if (varbinds.length === 0) return 0;
    const total = varbinds.reduce((sum: number, vb: any) => sum + (vb.value || 0), 0);
    return Math.round(total / varbinds.length);
  } catch (err) {
    logger.warn('Failed to get CPU usage via SNMP');
    return 0;
  }
};

const getMemoryUsage = async (session: any): Promise<number> => {
  try {
    const descrVarbinds = await walkOid(session, OIDs.hrStorageDescr);
    const sizeVarbinds = await walkOid(session, OIDs.hrStorageSize);
    const usedVarbinds = await walkOid(session, OIDs.hrStorageUsed);
    const allocVarbinds = await walkOid(session, OIDs.hrStorageAllocationUnits);

    // Find RAM entries (usually "Physical Memory" or "Real Memory")
    let totalSize = 0;
    let totalUsed = 0;
    for (let i = 0; i < descrVarbinds.length; i++) {
      const descr = String(descrVarbinds[i]?.value || '').toLowerCase();
      if (descr.includes('physical') || descr.includes('real') || descr.includes('ram')) {
        const allocUnit = Number(allocVarbinds[i]?.value || 1);
        totalSize += Number(sizeVarbinds[i]?.value || 0) * allocUnit;
        totalUsed += Number(usedVarbinds[i]?.value || 0) * allocUnit;
      }
    }
    return totalSize > 0 ? Math.round((totalUsed / totalSize) * 100) : 0;
  } catch (err) {
    logger.warn('Failed to get memory usage via SNMP');
    return 0;
  }
};

const getUptime = async (session: any): Promise<number> => {
  try {
    const varbinds = await getScalarValues(session, [OIDs.sysUptime]);
    // sysUptime is in hundredths of a second
    return Math.floor(Number(varbinds[0]?.value || 0) / 100);
  } catch {
    return 0;
  }
};

interface InterfaceMetric {
  name: string;
  status: number; // 1=up, 2=down
  inBytes: number;
  outBytes: number;
}

const getInterfaceMetrics = async (session: any): Promise<InterfaceMetric[]> => {
  try {
    const descrVarbinds = await walkOid(session, OIDs.ifDescr);
    const statusVarbinds = await walkOid(session, OIDs.ifOperStatus);
    const inVarbinds = await walkOid(session, OIDs.ifHCInOctets);
    const outVarbinds = await walkOid(session, OIDs.ifHCOutOctets);

    const interfaces: InterfaceMetric[] = [];
    for (let i = 0; i < descrVarbinds.length; i++) {
      const name = String(descrVarbinds[i]?.value || `eth${i}`);
      // Skip loopback
      if (name.toLowerCase().includes('loopback') || name.toLowerCase() === 'lo') continue;

      interfaces.push({
        name,
        status: Number(statusVarbinds[i]?.value || 2),
        inBytes: Number(inVarbinds[i]?.value || 0),
        outBytes: Number(outVarbinds[i]?.value || 0),
      });
    }
    return interfaces;
  } catch (err) {
    logger.warn('Failed to get interface metrics via SNMP');
    return [];
  }
};

const pollDevice = async (device: {
  id: string;
  host: string;
  snmpCommunity: string;
  snmpVersion?: number;
  deviceType: string;
}): Promise<DeviceMetricData[]> => {
  const session = createSession(device.host, device.snmpCommunity, device.snmpVersion || 2);
  const metrics: DeviceMetricData[] = [];

  if (!session) return metrics;

  try {
    const [cpu, memory, uptime, interfaces] = await Promise.all([
      getCpuUsage(session),
      getMemoryUsage(session),
      getUptime(session),
      getInterfaceMetrics(session),
    ]);

    metrics.push({ metricType: 'CPU_USAGE', value: cpu, unit: '%' });
    metrics.push({ metricType: 'MEMORY_USAGE', value: memory, unit: '%' });
    metrics.push({ metricType: 'UPTIME', value: uptime, unit: 'seconds' });

    interfaces.forEach(iface => {
      metrics.push({ metricType: 'INTERFACE_IN_BYTES', value: iface.inBytes, unit: 'bytes', interfaceName: iface.name });
      metrics.push({ metricType: 'INTERFACE_OUT_BYTES', value: iface.outBytes, unit: 'bytes', interfaceName: iface.name });
      metrics.push({ metricType: 'INTERFACE_STATUS', value: iface.status === 1 ? 1 : 0, interfaceName: iface.name });
    });
  } catch (err: any) {
    logger.error(`SNMP poll failed for device ${device.id}: ${err.message}`);
  } finally {
    session.close();
  }

  return metrics;
};

export default { createSession, pollDevice, getCpuUsage, getMemoryUsage, getUptime, getInterfaceMetrics };
