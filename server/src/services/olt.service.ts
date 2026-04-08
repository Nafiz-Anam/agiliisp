import { OLTStatus, PonTechnology, AlertType, AlertSeverity } from '@prisma/client';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import { PaginationOptions, PaginationResult } from '../types/pagination';
import prisma from '../client';

class OLTService {
  private prisma = prisma;

  // Core OLT Management
  async getOlts(query: any): Promise<PaginationResult<any>> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      brand,
      technology,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: any = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as OLTStatus;
    }

    if (brand) {
      where.oltBrandId = brand;
    }

    if (technology) {
      where.ponTechnology = technology as PonTechnology;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [olts, total] = await Promise.all([
      this.prisma.oLT.findMany({
        where,
        include: {
          oltBrand: true,
          oltVersion: true,
          onus: {
            where: { status: 'ACTIVE' },
            take: 5,
          },
          _count: {
            select: {
              onus: true,
              ports: true,
              oltAlerts: {
                where: { status: 'ACTIVE' },
              },
            },
          },
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: Number(limit),
      }),
      this.prisma.oLT.count({ where }),
    ]);

    return {
      data: olts,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async getOltById(oltId: string): Promise<any> {
    const olt = await this.prisma.oLT.findUnique({
      where: { id: oltId },
      include: {
        oltBrand: true,
        oltVersion: true,
        onus: {
          include: {
            customer: true,
          },
        },
        ports: {
          include: {
            onu: true,
          },
        },
        oltAlerts: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        maintenanceSchedules: {
          where: {
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            scheduledFor: { gte: new Date() },
          },
          orderBy: { scheduledFor: 'asc' },
        },
      },
    });

    if (!olt) {
      throw new ApiError(httpStatus.NOT_FOUND, 'OLT not found');
    }

    return olt;
  }

  async createOlt(oltData: any): Promise<any> {
    const {
      name,
      location,
      ipAddress,
      serialNumber,
      oltBrandId,
      oltVersionId,
      ponTechnology,
      maxCapacity,
      latitude,
      longitude,
      address,
      managementInterface,
      snmpCommunity,
      sshPort,
      createdBy,
    } = oltData;

    // Check if OLT with same IP or name already exists
    const existingOlt = await this.prisma.oLT.findFirst({
      where: {
        OR: [{ ipAddress }, { name }],
      },
    });

    if (existingOlt) {
      throw new ApiError(httpStatus.CONFLICT, 'OLT with this IP or name already exists');
    }

    // Validate brand and version
    const [brand, version] = await Promise.all([
      this.prisma.oLTBrand.findUnique({ where: { id: oltBrandId } }),
      this.prisma.oLTVersion.findUnique({ where: { id: oltVersionId } }),
    ]);

    if (!brand || !version) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid OLT brand or version');
    }

    const olt = await this.prisma.oLT.create({
      data: {
        name,
        location,
        ipAddress,
        serialNumber,
        oltBrandId,
        oltVersionId,
        ponTechnology: ponTechnology as PonTechnology,
        maxCapacity: maxCapacity || 128,
        latitude,
        longitude,
        address,
        managementInterface,
        snmpCommunity,
        sshPort: sshPort || 22,
        createdBy,
      },
      include: {
        oltBrand: true,
        oltVersion: true,
      },
    });

    return olt;
  }

  async updateOlt(oltId: string, updateData: any): Promise<any> {
    const olt = await this.prisma.oLT.findUnique({
      where: { id: oltId },
    });

    if (!olt) {
      throw new ApiError(httpStatus.NOT_FOUND, 'OLT not found');
    }

    // Check for conflicts if updating IP or name
    const { ipAddress, name, oltBrandId, oltVersionId } = updateData;
    if (ipAddress || name) {
      const existingOlt = await this.prisma.oLT.findFirst({
        where: {
          AND: [
            { id: { not: oltId } },
            {
              OR: [...(ipAddress ? [{ ipAddress }] : []), ...(name ? [{ name }] : [])],
            },
          ],
        },
      });

      if (existingOlt) {
        throw new ApiError(httpStatus.CONFLICT, 'OLT with this IP or name already exists');
      }
    }

    // Validate brand and version if provided
    if (oltBrandId || oltVersionId) {
      const [brand, version] = await Promise.all([
        oltBrandId
          ? this.prisma.oLTBrand.findUnique({ where: { id: oltBrandId } })
          : Promise.resolve(null),
        oltVersionId
          ? this.prisma.oLTVersion.findUnique({ where: { id: oltVersionId } })
          : Promise.resolve(null),
      ]);

      if ((oltBrandId && !brand) || (oltVersionId && !version)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid OLT brand or version');
      }
    }

    const updatedOlt = await this.prisma.oLT.update({
      where: { id: oltId },
      data: updateData,
      include: {
        oltBrand: true,
        oltVersion: true,
      },
    });

    return updatedOlt;
  }

  async deleteOlt(oltId: string): Promise<void> {
    const olt = await this.prisma.oLT.findUnique({
      where: { id: oltId },
      include: {
        _count: {
          select: {
            onus: true,
            ports: true,
          },
        },
      },
    });

    if (!olt) {
      throw new ApiError(httpStatus.NOT_FOUND, 'OLT not found');
    }

    if (olt._count.onus > 0 || olt._count.ports > 0) {
      throw new ApiError(httpStatus.CONFLICT, 'Cannot delete OLT with associated ONUs or ports');
    }

    await this.prisma.oLT.delete({
      where: { id: oltId },
    });
  }

  async approveOlt(oltId: string): Promise<any> {
    const olt = await this.prisma.oLT.findUnique({
      where: { id: oltId },
    });

    if (!olt) {
      throw new ApiError(httpStatus.NOT_FOUND, 'OLT not found');
    }

    if (olt.status !== OLTStatus.PENDING) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'OLT is not in pending status');
    }

    const updatedOlt = await this.prisma.oLT.update({
      where: { id: oltId },
      data: { status: OLTStatus.APPROVED },
      include: {
        oltBrand: true,
        oltVersion: true,
      },
    });

    return updatedOlt;
  }

  // Dashboard & Monitoring
  async getOltDashboard(): Promise<any> {
    const [
      totalOlts,
      activeOlts,
      approvedOlts,
      pendingOlts,
      totalOnus,
      onlineOnus,
      belowThresholdPower,
      wireDownCount,
      weakPowerCount,
      systemResources,
    ] = await Promise.all([
      this.prisma.oLT.count({ where: { isActive: true } }),
      this.prisma.oLT.count({ where: { status: OLTStatus.ACTIVE, isActive: true } }),
      this.prisma.oLT.count({ where: { status: OLTStatus.APPROVED, isActive: true } }),
      this.prisma.oLT.count({ where: { status: OLTStatus.PENDING, isActive: true } }),
      this.prisma.onu.count({ where: { status: 'ACTIVE' } }),
      this.prisma.onu.count({ where: { status: 'ACTIVE' } }), // Simplified for now
      this.prisma.oLTPort.count({
        where: {
          powerLevel: { lt: -25 }, // Below -25 dBm
          status: 'ACTIVE',
        },
      }),
      this.prisma.oLTPort.count({
        where: {
          status: 'FAULT',
        },
      }),
      this.prisma.oLTPort.count({
        where: {
          powerLevel: { lt: -30, gt: -40 }, // Weak signal between -30 and -40 dBm
          status: 'ACTIVE',
        },
      }),
      this.getSystemResources(),
    ]);

    return {
      onlineUsers: onlineOnus,
      activeOlts,
      approvedOlts,
      belowThresholdPower,
      wireDown: wireDownCount,
      weakPower: weakPowerCount,
      systemResources,
      totalOlts,
      pendingOlts,
      totalOnus,
    };
  }

  async getOltStats(oltId: string): Promise<any> {
    const olt = await this.prisma.oLT.findUnique({
      where: { id: oltId },
      include: {
        onus: {
          where: { status: 'ACTIVE' },
        },
        ports: {
          where: { status: 'ACTIVE' },
        },
        oltAlerts: {
          where: { status: 'ACTIVE' },
        },
        _count: {
          select: {
            onus: true,
            ports: true,
            oltAlerts: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });

    if (!olt) {
      throw new ApiError(httpStatus.NOT_FOUND, 'OLT not found');
    }

    const portStats = await this.prisma.oLTPort.groupBy({
      by: ['status'],
      where: { oltId },
      _count: true,
    });

    const onuStats = await this.prisma.onu.groupBy({
      by: ['status'],
      where: { oltId },
      _count: true,
    });

    return {
      olt,
      portStats,
      onuStats,
    };
  }

  async getOltAlerts(oltId: string, query: any): Promise<any> {
    const { page = 1, limit = 10, severity, status } = query;

    const where: any = { oltId };
    if (severity) where.severity = severity as AlertSeverity;
    if (status) where.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [alerts, total] = await Promise.all([
      this.prisma.oLTAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.oLTAlert.count({ where }),
    ]);

    return {
      data: alerts,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async getSignalHistory(oltId: string, query: any): Promise<any> {
    const { hours = 24 } = query;
    const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);

    const ports = await this.prisma.oLTPort.findMany({
      where: {
        oltId,
        lastSignalCheck: { gte: since },
        powerLevel: { not: null },
      },
      select: {
        portNumber: true,
        powerLevel: true,
        signalStrength: true,
        lastSignalCheck: true,
        onu: {
          select: {
            serialNumber: true,
            macAddress: true,
          },
        },
      },
      orderBy: { lastSignalCheck: 'desc' },
    });

    return { ports };
  }

  async getTrafficStats(oltId: string, query: any): Promise<any> {
    const { hours = 24 } = query;
    const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);

    const onus = await this.prisma.onu.findMany({
      where: {
        oltId,
        lastSeen: { gte: since },
        status: 'ACTIVE',
      },
      select: {
        serialNumber: true,
        dataRx: true,
        dataTx: true,
        dataRateRx: true,
        dataRateTx: true,
        lastSeen: true,
        customer: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { lastSeen: 'desc' },
    });

    return { onus };
  }

  // Device Management
  async syncOlt(oltId: string): Promise<any> {
    const olt = await this.prisma.oLT.findUnique({
      where: { id: oltId },
    });

    if (!olt) {
      throw new ApiError(httpStatus.NOT_FOUND, 'OLT not found');
    }

    // TODO: Implement actual OLT synchronization logic
    // This would involve SNMP/SSH communication with the OLT

    const result = {
      synced: true,
      lastSyncAt: new Date(),
      message: 'OLT synchronized successfully',
    };

    await this.prisma.oLT.update({
      where: { id: oltId },
      data: {
        lastSyncAt: result.lastSyncAt,
      },
    });

    return result;
  }

  async testConnection(oltId: string): Promise<any> {
    const olt = await this.prisma.oLT.findUnique({
      where: { id: oltId },
    });

    if (!olt) {
      throw new ApiError(httpStatus.NOT_FOUND, 'OLT not found');
    }

    // TODO: Implement actual connection test logic
    // This would involve testing SNMP/SSH connectivity

    return {
      connected: true,
      responseTime: 45, // ms
      message: 'Connection successful',
    };
  }

  async rebootOlt(oltId: string): Promise<any> {
    const olt = await this.prisma.oLT.findUnique({
      where: { id: oltId },
    });

    if (!olt) {
      throw new ApiError(httpStatus.NOT_FOUND, 'OLT not found');
    }

    // TODO: Implement actual OLT reboot logic
    // This would involve sending reboot command via SNMP/SSH

    return {
      rebooted: true,
      message: 'OLT reboot initiated',
    };
  }

  async getOltConfiguration(oltId: string): Promise<any> {
    const olt = await this.prisma.oLT.findUnique({
      where: { id: oltId },
      include: {
        oltBrand: true,
        oltVersion: true,
      },
    });

    if (!olt) {
      throw new ApiError(httpStatus.NOT_FOUND, 'OLT not found');
    }

    // TODO: Implement actual configuration retrieval
    // This would involve fetching configuration from OLT

    return {
      configuration: {
        system: {
          hostname: olt.name,
          location: olt.location,
          uptime: olt.uptime,
        },
        network: {
          ipAddress: olt.ipAddress,
          managementInterface: olt.managementInterface,
          sshPort: olt.sshPort,
        },
        pon: {
          technology: olt.ponTechnology,
          maxCapacity: olt.maxCapacity,
          currentLoad: olt.currentLoad,
        },
      },
    };
  }

  // ONU Management
  async getOnusByOlt(oltId: string, query: any): Promise<PaginationResult<any>> {
    const { page = 1, limit = 10, status, search } = query;

    const where: any = { oltId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { macAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [onus, total] = await Promise.all([
      this.prisma.onu.findMany({
        where,
        include: {
          customer: true,
          port: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.onu.count({ where }),
    ]);

    return {
      data: onus,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async provisionOnu(oltId: string, onuData: any): Promise<any> {
    const { serialNumber, macAddress, portId, customerId, vlanId, speedProfile } = onuData;

    // Check if ONU already exists
    const existingOnu = await this.prisma.onu.findFirst({
      where: {
        OR: [{ serialNumber }, ...(macAddress ? [{ macAddress }] : [])],
      },
    });

    if (existingOnu) {
      throw new ApiError(httpStatus.CONFLICT, 'ONU with this serial number or MAC already exists');
    }

    // Validate port
    const port = await this.prisma.oLTPort.findUnique({
      where: { id: portId, oltId },
    });

    if (!port) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Port not found');
    }

    if (port.onuId) {
      throw new ApiError(httpStatus.CONFLICT, 'Port already has ONU assigned');
    }

    const onu = await this.prisma.onu.create({
      data: {
        serialNumber,
        macAddress,
        oltId,
        portId,
        customerId,
        vlanId,
        speedProfile,
        autoProvisioned: true,
        status: 'ACTIVE',
      },
      include: {
        customer: true,
        port: true,
      },
    });

    // Update port with ONU assignment
    await this.prisma.oLTPort.update({
      where: { id: portId },
      data: { onuId: onu.id, status: 'ACTIVE' },
    });

    return onu;
  }

  async deprovisionOnu(oltId: string, onuId: string): Promise<void> {
    const onu = await this.prisma.onu.findUnique({
      where: { id: onuId, oltId },
    });

    if (!onu) {
      throw new ApiError(httpStatus.NOT_FOUND, 'ONU not found');
    }

    // Update port to remove ONU assignment
    if (onu.portId) {
      await this.prisma.oLTPort.update({
        where: { id: onu.portId },
        data: { onuId: null, status: 'INACTIVE' },
      });
    }

    await this.prisma.onu.delete({
      where: { id: onuId },
    });
  }

  async getOnuDetails(oltId: string, onuId: string): Promise<any> {
    const onu = await this.prisma.onu.findUnique({
      where: { id: onuId, oltId },
      include: {
        customer: true,
        port: true,
        olt: {
          include: {
            oltBrand: true,
          },
        },
      },
    });

    if (!onu) {
      throw new ApiError(httpStatus.NOT_FOUND, 'ONU not found');
    }

    return onu;
  }

  // Port Management
  async getOltPorts(oltId: string, query: any): Promise<any> {
    const { status, portType } = query;

    const where: any = { oltId };
    if (status) where.status = status;
    if (portType) where.portType = portType;

    const ports = await this.prisma.oLTPort.findMany({
      where,
      include: {
        onu: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: { portNumber: 'asc' },
    });

    return { ports };
  }

  async enablePort(oltId: string, portId: string): Promise<any> {
    const port = await this.prisma.oLTPort.findUnique({
      where: { id: portId, oltId },
    });

    if (!port) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Port not found');
    }

    const updatedPort = await this.prisma.oLTPort.update({
      where: { id: portId },
      data: { enabled: true, status: 'ACTIVE' },
    });

    return updatedPort;
  }

  async disablePort(oltId: string, portId: string): Promise<any> {
    const port = await this.prisma.oLTPort.findUnique({
      where: { id: portId, oltId },
    });

    if (!port) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Port not found');
    }

    const updatedPort = await this.prisma.oLTPort.update({
      where: { id: portId },
      data: { enabled: false, status: 'DISABLED' },
    });

    return updatedPort;
  }

  async getPortDetails(oltId: string, portId: string): Promise<any> {
    const port = await this.prisma.oLTPort.findUnique({
      where: { id: portId, oltId },
      include: {
        onu: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!port) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Port not found');
    }

    return port;
  }

  // Maintenance
  async getMaintenanceSchedule(oltId: string, query: any): Promise<any> {
    const { status } = query;

    const where: any = { oltId };
    if (status) where.status = status;

    const schedules = await this.prisma.maintenanceSchedule.findMany({
      where,
      orderBy: { scheduledFor: 'asc' },
    });

    return { schedules };
  }

  async createMaintenanceSchedule(oltId: string, scheduleData: any): Promise<any> {
    const { title, description, scheduledFor, duration, type, performedBy, notes } = scheduleData;

    const schedule = await this.prisma.maintenanceSchedule.create({
      data: {
        oltId,
        title,
        description,
        scheduledFor: new Date(scheduledFor),
        duration,
        type,
        performedBy,
        notes,
      },
    });

    return schedule;
  }

  // Dashboard helper methods
  async getOltSummary(): Promise<any> {
    const [totalOlts, activeOlts, totalOnus, activeOnus, totalPorts, activePorts] =
      await Promise.all([
        this.prisma.oLT.count({ where: { isActive: true } }),
        this.prisma.oLT.count({ where: { status: OLTStatus.ACTIVE, isActive: true } }),
        this.prisma.onu.count({ where: { status: 'ACTIVE' } }),
        this.prisma.onu.count({ where: { status: 'ACTIVE' } }), // Simplified
        this.prisma.oLTPort.count({ where: { oltId: { not: null } } }),
        this.prisma.oLTPort.count({ where: { status: 'ACTIVE' } }),
      ]);

    return {
      totalOlts,
      activeOlts,
      totalOnus,
      activeOnus,
      totalPorts,
      activePorts,
      utilizationRate: totalOlts > 0 ? (activeOlts / totalOlts) * 100 : 0,
    };
  }

  async getActiveConnections(): Promise<any> {
    const activeOnus = await this.prisma.onu.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        serialNumber: true,
        macAddress: true,
        lastSeen: true,
        dataRateRx: true,
        dataRateTx: true,
        customer: {
          select: {
            fullName: true,
          },
        },
        port: {
          select: {
            portNumber: true,
            powerLevel: true,
          },
        },
      },
      take: 100,
      orderBy: { lastSeen: 'desc' },
    });

    return { connections: activeOnus };
  }

  // Helper methods
  private async getSystemResources(): Promise<any> {
    // This would typically fetch real system metrics
    // For now, returning mock data
    return {
      cpu: { current: 25, total: 100 },
      ram: { current: 60, total: 100 },
      storage: { current: 45, total: 100 },
    };
  }
}

export default new OLTService();
