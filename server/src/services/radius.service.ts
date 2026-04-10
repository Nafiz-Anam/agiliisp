import * as dgram from 'dgram';
import prisma from '../client';
import logger from '../config/logger';
import radiusConfig from '../config/radius.config';
import complianceLogService from './complianceLog.service';

/**
 * RADIUS Accounting Service
 *
 * Listens for RADIUS Accounting-Request packets from NAS (MikroTik, FreeRADIUS proxy, etc.)
 * and logs events to the compliance system.
 *
 * Standard RADIUS Accounting attributes used:
 * - Acct-Status-Type (40): Start=1, Stop=2, Interim-Update=3
 * - User-Name (1)
 * - Framed-IP-Address (8)
 * - Calling-Station-Id (31): MAC address
 * - NAS-IP-Address (4): Router IP
 * - Acct-Session-Id (44)
 * - Acct-Session-Time (46): Session duration in seconds
 * - Acct-Input-Octets (42): Upload bytes
 * - Acct-Output-Octets (43): Download bytes
 * - Acct-Terminate-Cause (49): Disconnect reason
 *
 * Note: This is a simplified RADIUS accounting receiver. For production with
 * FreeRADIUS, consider using the `radius` npm package for full protocol support.
 * This implementation handles the most common accounting use case.
 */

// RADIUS attribute type IDs
const ATTR = {
  USER_NAME: 1,
  NAS_IP_ADDRESS: 4,
  FRAMED_IP_ADDRESS: 8,
  CALLING_STATION_ID: 31,
  ACCT_STATUS_TYPE: 40,
  ACCT_INPUT_OCTETS: 42,
  ACCT_OUTPUT_OCTETS: 43,
  ACCT_SESSION_ID: 44,
  ACCT_SESSION_TIME: 46,
  ACCT_TERMINATE_CAUSE: 49,
};

const ACCT_STATUS = { START: 1, STOP: 2, INTERIM_UPDATE: 3 };

const TERMINATE_CAUSES: Record<number, string> = {
  1: 'user-request', 2: 'lost-carrier', 3: 'lost-service', 4: 'idle-timeout',
  5: 'session-timeout', 6: 'admin-reset', 7: 'admin-reboot', 8: 'port-error',
  9: 'NAS-error', 10: 'NAS-request', 11: 'NAS-reboot', 12: 'port-unneeded',
  13: 'port-preempted', 14: 'port-suspended', 15: 'service-unavailable',
};

interface RadiusAttribute {
  type: number;
  value: Buffer;
}

/**
 * Parse RADIUS packet attributes (simplified — assumes standard format)
 */
function parseAttributes(data: Buffer, offset: number, length: number): Map<number, Buffer> {
  const attrs = new Map<number, Buffer>();
  let pos = offset;
  while (pos < offset + length - 1) {
    const type = data[pos];
    const len = data[pos + 1];
    if (len < 2 || pos + len > offset + length) break;
    attrs.set(type, data.subarray(pos + 2, pos + len));
    pos += len;
  }
  return attrs;
}

function attrString(attrs: Map<number, Buffer>, type: number): string | undefined {
  const buf = attrs.get(type);
  return buf ? buf.toString('utf8') : undefined;
}

function attrInt(attrs: Map<number, Buffer>, type: number): number | undefined {
  const buf = attrs.get(type);
  return buf && buf.length >= 4 ? buf.readUInt32BE(0) : undefined;
}

function attrIp(attrs: Map<number, Buffer>, type: number): string | undefined {
  const buf = attrs.get(type);
  return buf && buf.length >= 4 ? `${buf[0]}.${buf[1]}.${buf[2]}.${buf[3]}` : undefined;
}

/**
 * Build a minimal RADIUS Accounting-Response
 */
function buildResponse(requestId: number, authenticator: Buffer, secret: string): Buffer {
  const resp = Buffer.alloc(20);
  resp[0] = 5; // Accounting-Response
  resp[1] = requestId;
  resp.writeUInt16BE(20, 2); // length
  authenticator.copy(resp, 4); // copy request authenticator
  // In production, should MD5-hash with secret for proper auth
  return resp;
}

let server: dgram.Socket | null = null;

/**
 * Start RADIUS accounting listener
 */
const startServer = (): void => {
  if (!radiusConfig.enabled) {
    logger.info('RADIUS accounting: disabled');
    return;
  }

  server = dgram.createSocket('udp4');

  server.on('message', async (msg, rinfo) => {
    try {
      if (msg.length < 20) return; // Too short for RADIUS

      const code = msg[0]; // 4 = Accounting-Request
      if (code !== 4) return;

      const id = msg[1];
      const length = msg.readUInt16BE(2);
      const authenticator = msg.subarray(4, 20);

      const attrs = parseAttributes(msg, 20, length - 20);

      const statusType = attrInt(attrs, ATTR.ACCT_STATUS_TYPE);
      const username = attrString(attrs, ATTR.USER_NAME);
      const framedIp = attrIp(attrs, ATTR.FRAMED_IP_ADDRESS);
      const nasIp = attrIp(attrs, ATTR.NAS_IP_ADDRESS);
      const callingStationId = attrString(attrs, ATTR.CALLING_STATION_ID);
      const sessionId = attrString(attrs, ATTR.ACCT_SESSION_ID);
      const sessionTime = attrInt(attrs, ATTR.ACCT_SESSION_TIME);
      const inputOctets = attrInt(attrs, ATTR.ACCT_INPUT_OCTETS);
      const outputOctets = attrInt(attrs, ATTR.ACCT_OUTPUT_OCTETS);
      const terminateCause = attrInt(attrs, ATTR.ACCT_TERMINATE_CAUSE);

      if (!username) {
        // Send response anyway
        server!.send(buildResponse(id, authenticator, radiusConfig.sharedSecret), rinfo.port, rinfo.address);
        return;
      }

      // Resolve router by NAS IP
      const router = nasIp ? await prisma.router.findFirst({ where: { ipAddress: nasIp }, select: { id: true } }) : null;
      const routerId = router?.id || 'unknown';

      // Resolve customer
      const customer = await prisma.ispCustomer.findFirst({ where: { username }, select: { id: true } });

      if (statusType === ACCT_STATUS.START) {
        logger.debug(`RADIUS: Start — ${username} from ${nasIp}, IP: ${framedIp}`);

        complianceLogService.logSession({
          customerId: customer?.id, username, routerId, eventType: 'CONNECT',
          sessionId, ipAddress: framedIp, macAddress: callingStationId, nasIp, service: 'radius',
        }).catch(() => {});

        complianceLogService.logAuth({
          username, customerId: customer?.id, routerId, eventType: 'LOGIN_SUCCESS',
          ipAddress: framedIp, macAddress: callingStationId, nasIp, service: 'radius',
        }).catch(() => {});

        if (framedIp) {
          complianceLogService.logNat({
            customerId: customer?.id, username, assignedIp: framedIp,
            macAddress: callingStationId, routerId, action: 'ASSIGN',
          }).catch(() => {});
        }

      } else if (statusType === ACCT_STATUS.STOP) {
        logger.debug(`RADIUS: Stop — ${username}, duration: ${sessionTime}s, in: ${inputOctets}, out: ${outputOctets}`);

        complianceLogService.logSession({
          customerId: customer?.id, username, routerId, eventType: 'DISCONNECT',
          sessionId, ipAddress: framedIp, macAddress: callingStationId, nasIp, service: 'radius',
          sessionDuration: sessionTime,
          uploadBytes: inputOctets, downloadBytes: outputOctets,
          disconnectReason: terminateCause ? TERMINATE_CAUSES[terminateCause] || `cause-${terminateCause}` : undefined,
        }).catch(() => {});

        if (framedIp) {
          complianceLogService.logNat({
            customerId: customer?.id, username, assignedIp: framedIp,
            macAddress: callingStationId, routerId, action: 'RELEASE',
          }).catch(() => {});
        }

        // Update customer data usage
        if (customer?.id && (inputOctets || outputOctets)) {
          prisma.ispCustomer.update({
            where: { id: customer.id },
            data: { dataUsed: { increment: (inputOctets || 0) + (outputOctets || 0) } },
          }).catch(() => {});
        }

      } else if (statusType === ACCT_STATUS.INTERIM_UPDATE) {
        // Update traffic stats
        if (customer?.id && (inputOctets || outputOctets)) {
          prisma.ispCustomer.update({
            where: { id: customer.id },
            data: { dataUsed: { increment: (inputOctets || 0) + (outputOctets || 0) } },
          }).catch(() => {});
        }
      }

      // Send Accounting-Response
      server!.send(buildResponse(id, authenticator, radiusConfig.sharedSecret), rinfo.port, rinfo.address);

    } catch (err: any) {
      logger.error(`RADIUS packet processing error: ${err.message}`);
    }
  });

  server.on('error', (err) => {
    logger.error(`RADIUS server error: ${err.message}`);
  });

  server.bind(radiusConfig.acctPort, radiusConfig.host, () => {
    logger.info(`RADIUS accounting: listening on ${radiusConfig.host}:${radiusConfig.acctPort}`);
  });
};

const stopServer = (): void => {
  if (server) {
    server.close();
    server = null;
  }
};

export default { startServer, stopServer };
