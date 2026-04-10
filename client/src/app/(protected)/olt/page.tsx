"use client";

import { useEffect, useState } from "react";
import {
    Server,
    Wifi,
    WifiOff,
    AlertTriangle,
    Activity,
    Settings,
    Plus,
    Search,
    RefreshCw,
    Power,
    Signal,
    Users,
    Package,
    Router,
    Eye,
    Edit,
    Trash2,
    TrendingUp,
    TrendingDown,
    Clock,
    Calendar,
    Wrench,
    Cpu,
    HardDrive,
    Thermometer,
    Monitor,
    MapPin,
    AlertCircle,
    CheckCircle,
    XCircle,
    Filter,
    Download,
    Upload,
    Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import api from "@/lib/api";
import {
    OLTDashboardStats,
    OLT,
    OltStatus,
    PonTechnology,
    ONU,
    OLTPort,
    OLTAlert,
    MaintenanceSchedule,
} from "@/types";
import { format } from "date-fns";
import { toast } from "sonner";

const OLT_STATUS_COLORS: Record<OltStatus, string> = {
    PENDING: "bg-blue-100 text-blue-700",
    APPROVED: "bg-yellow-100 text-yellow-700",
    ACTIVE: "bg-emerald-100 text-emerald-700",
    INACTIVE: "bg-slate-100 text-slate-700",
    MAINTENANCE: "bg-blue-100 text-blue-700",
    ERROR: "bg-red-100 text-red-700",
    DECOMMISSIONED: "bg-gray-100 text-gray-700",
};

const PORT_STATUS_COLORS: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700",
    INACTIVE: "bg-slate-100 text-slate-700",
    DISABLED: "bg-red-100 text-red-700",
};

const ALERT_SEVERITY_COLORS: Record<string, string> = {
    LOW: "bg-blue-100 text-blue-700",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    HIGH: "bg-red-100 text-red-700",
    CRITICAL: "bg-red-100 text-red-900",
};

export default function OLTCompletePage() {
    const [stats, setStats] = useState<OLTDashboardStats | null>(null);
    const [olts, setOlts] = useState<OLT[]>([]);
    const [onus, setOnus] = useState<ONU[]>([]);
    const [ports, setPorts] = useState<OLTPort[]>([]);
    const [alerts, setAlerts] = useState<OLTAlert[]>([]);
    const [maintenanceSchedules, setMaintenanceSchedules] = useState<
        MaintenanceSchedule[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<OltStatus | "all">("all");
    const [selectedOlt, setSelectedOlt] = useState<OLT | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [showPortsDialog, setShowPortsDialog] = useState(false);
    const [showOnusDialog, setShowOnusDialog] = useState(false);
    const [showAlertsDialog, setShowAlertsDialog] = useState(false);
    const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        fetchOLTData();
    }, []);

    const fetchOLTData = async () => {
        try {
            setLoading(true);
            const [statsRes, oltsRes] = await Promise.all([
                api.get("/isp/olts/dashboard"),
                api.get("/isp/olts?page=1&limit=50"),
            ]);

            setStats(statsRes.data.data);
            setOlts(oltsRes.data.data?.olts || oltsRes.data.data || []);
        } catch (error) {
            console.error("Failed to fetch OLT data:", error);
            toast.error("Failed to fetch OLT data");
        } finally {
            setLoading(false);
        }
    };

    const fetchOLTDetails = async (oltId: string) => {
        try {
            const [onusRes, portsRes, alertsRes, maintenanceRes] =
                await Promise.all([
                    api.get(`/isp/olts/${oltId}/onus`),
                    api.get(`/isp/olts/${oltId}/ports`),
                    api.get(`/isp/olts/${oltId}/alerts`),
                    api.get(`/isp/olts/${oltId}/maintenance-schedule`),
                ]);

            setOnus(onusRes.data.data);
            setPorts(portsRes.data.data);
            setAlerts(alertsRes.data.data);
            setMaintenanceSchedules(maintenanceRes.data.data);
        } catch (error) {
            console.error("Failed to fetch OLT details:", error);
            toast.error("Failed to fetch OLT details");
        }
    };

    const handleCreateOlt = async (oltData: any) => {
        try {
            const response = await api.post("/isp/olts", oltData);

            if (response.data.success) {
                toast.success("OLT created successfully");
                setShowCreateDialog(false);
                fetchOLTData();
            } else {
                toast.error("Failed to create OLT");
            }
        } catch (error) {
            console.error("Failed to create OLT:", error);
            toast.error("Failed to create OLT");
        }
    };

    const handleUpdateOlt = async (oltId: string, oltData: any) => {
        try {
            const response = await api.patch(`/isp/olts/${oltId}`, oltData);

            if (response.data.success) {
                toast.success("OLT updated successfully");
                fetchOLTData();
                if (selectedOlt?.id === oltId) {
                    setSelectedOlt(response.data.data);
                }
            } else {
                toast.error("Failed to update OLT");
            }
        } catch (error) {
            console.error("Failed to update OLT:", error);
            toast.error("Failed to update OLT");
        }
    };

    const handleDeleteOlt = async (oltId: string) => {
        try {
            const response = await api.delete(`/isp/olts/${oltId}`);

            if (response.data.success) {
                toast.success("OLT deleted successfully");
                fetchOLTData();
                if (selectedOlt?.id === oltId) {
                    setSelectedOlt(null);
                    setShowDetailsDialog(false);
                }
            } else {
                toast.error("Failed to delete OLT");
            }
        } catch (error) {
            console.error("Failed to delete OLT:", error);
            toast.error("Failed to delete OLT");
        }
    };

    const handleSyncOlt = async (oltId: string) => {
        try {
            const response = await api.post(`/isp/olts/${oltId}/sync`);

            if (response.data.success) {
                toast.success("OLT sync initiated");
                fetchOLTData();
            } else {
                toast.error("Failed to sync OLT");
            }
        } catch (error) {
            console.error("Failed to sync OLT:", error);
            toast.error("Failed to sync OLT");
        }
    };

    const handleRebootOlt = async (oltId: string) => {
        try {
            const response = await api.post(`/isp/olts/${oltId}/reboot`);

            if (response.data.success) {
                toast.success("OLT reboot initiated");
                fetchOLTData();
            } else {
                toast.error("Failed to reboot OLT");
            }
        } catch (error) {
            console.error("Failed to reboot OLT:", error);
            toast.error("Failed to reboot OLT");
        }
    };

    const handleApproveOlt = async (oltId: string) => {
        try {
            const response = await api.post(`/isp/olts/${oltId}/approve`);

            if (response.data.success) {
                toast.success("OLT approved successfully");
                fetchOLTData();
            } else {
                toast.error("Failed to approve OLT");
            }
        } catch (error) {
            console.error("Failed to approve OLT:", error);
            toast.error("Failed to approve OLT");
        }
    };

    const handleTestConnection = async (oltId: string) => {
        try {
            const response = await api.post(
                `/isp/olts/${oltId}/test-connection`,
            );

            if (response.data.success) {
                toast.success("Connection test initiated");
            } else {
                toast.error("Failed to test connection");
            }
        } catch (error) {
            console.error("Failed to test connection:", error);
            toast.error("Failed to test connection");
        }
    };

    const handleEnablePort = async (oltId: string, portId: string) => {
        try {
            const response = await api.post(
                `/isp/olts/${oltId}/ports/${portId}/enable`,
            );

            if (response.data.success) {
                toast.success("Port enabled successfully");
                fetchOLTDetails(selectedOlt?.id || "");
            } else {
                toast.error("Failed to enable port");
            }
        } catch (error) {
            console.error("Failed to enable port:", error);
            toast.error("Failed to enable port");
        }
    };

    const handleDisablePort = async (oltId: string, portId: string) => {
        try {
            const response = await api.post(
                `/isp/olts/${oltId}/ports/${portId}/disable`,
            );

            if (response.data.success) {
                toast.success("Port disabled successfully");
                fetchOLTDetails(selectedOlt?.id || "");
            } else {
                toast.error("Failed to disable port");
            }
        } catch (error) {
            console.error("Failed to disable port:", error);
            toast.error("Failed to disable port");
        }
    };

    const handleProvisionOnu = async (oltId: string, onuId: string) => {
        try {
            const response = await api.post(
                `/isp/olts/${oltId}/onus/${onuId}/provision`,
            );

            if (response.data.success) {
                toast.success("ONU provisioned successfully");
                fetchOLTDetails(selectedOlt?.id || "");
            } else {
                toast.error("Failed to provision ONU");
            }
        } catch (error) {
            console.error("Failed to provision ONU:", error);
            toast.error("Failed to provision ONU");
        }
    };

    const handleDeprovisionOnu = async (oltId: string, onuId: string) => {
        try {
            const response = await api.delete(
                `/isp/olts/${oltId}/onus/${onuId}`,
            );

            if (response.data.success) {
                toast.success("ONU deprovisioned successfully");
                fetchOLTDetails(selectedOlt?.id || "");
            } else {
                toast.error("Failed to deprovision ONU");
            }
        } catch (error) {
            console.error("Failed to deprovision ONU:", error);
            toast.error("Failed to deprovision ONU");
        }
    };

    const handleCreateMaintenanceSchedule = async (
        oltId: string,
        scheduleData: any,
    ) => {
        try {
            const response = await api.post(
                `/isp/olts/${oltId}/maintenance-schedule`,
                scheduleData,
            );

            if (response.data.success) {
                toast.success("Maintenance schedule created successfully");
                fetchOLTDetails(selectedOlt?.id || "");
            } else {
                toast.error("Failed to create maintenance schedule");
            }
        } catch (error) {
            console.error("Failed to create maintenance schedule:", error);
            toast.error("Failed to create maintenance schedule");
        }
    };

    const filteredOlts = olts.filter((olt) => {
        const matchesSearch =
            searchTerm === "" ||
            olt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            olt.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
            olt.location?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === "all" || olt.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const StatCard = ({
        label,
        value,
        icon: Icon,
        iconColor,
        iconBg,
        sub,
    }: {
        label: string;
        value: string | number;
        icon: any;
        iconColor: string;
        iconBg: string;
        sub: string;
    }) => (
        <Card className="border-slate-200/80">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="text-[12px] font-medium text-slate-700 mb-1">
                            {label}
                        </p>
                        <p className="text-2xl font-bold text-slate-800">
                            {value}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">{sub}</p>
                    </div>
                    <div
                        className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}
                    >
                        <Icon className={`h-5 w-5 ${iconColor}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 border-4 border-blue-200 border-t-blue-500 rounded-lg animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">
                        OLT Management
                    </h1>
                    <p className="text-slate-500">
                        Optical Line Terminal network overview and management
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={fetchOLTData} className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => setShowCreateDialog(true)}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add OLT
                    </Button>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Online Users"
                    value={stats?.onlineUsers ?? 0}
                    icon={Users}
                    iconColor="text-emerald-500"
                    iconBg="bg-emerald-50"
                    sub="Connected devices"
                />
                <StatCard
                    label="Active OLTs"
                    value={stats?.activeOlts ?? 0}
                    icon={Server}
                    iconColor="text-blue-500"
                    iconBg="bg-blue-50"
                    sub={`${stats?.totalOlts ?? 0} total`}
                />
                <StatCard
                    label="Total ONUs"
                    value={stats?.totalOnus ?? 0}
                    icon={Users}
                    iconColor="text-purple-500"
                    iconBg="bg-purple-50"
                    sub="Connected devices"
                />
                <StatCard
                    label="Critical Alerts"
                    value={stats?.criticalAlerts ?? 0}
                    icon={AlertTriangle}
                    iconColor="text-red-500"
                    iconBg="bg-red-50"
                    sub="Requires attention"
                />
                <StatCard
                    label="Offline ONUs"
                    value={stats?.offlineOnus ?? 0}
                    icon={WifiOff}
                    iconColor="text-slate-500"
                    iconBg="bg-slate-50"
                    sub="Disconnected devices"
                />
            </div>

            {/* Filters */}
            <Card className="border-slate-200/80">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search OLTs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select
                            value={statusFilter}
                            onValueChange={(value: OltStatus | "all") =>
                                setStatusFilter(value)
                            }
                        >
                            <SelectTrigger className="w-full sm:w-40">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="APPROVED">
                                    Approved
                                </SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="INACTIVE">
                                    Inactive
                                </SelectItem>
                                <SelectItem value="MAINTENANCE">
                                    Maintenance
                                </SelectItem>
                                <SelectItem value="ERROR">Error</SelectItem>
                                <SelectItem value="DECOMMISSIONED">
                                    Decommissioned
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* OLT Table */}
            <Card className="border-slate-200/80">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Server className="h-4 w-4 text-blue-500" />
                        OLT Devices ({filteredOlts.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-left px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                                    OLT
                                </TableHead>
                                <TableHead className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                                    Status
                                </TableHead>
                                <TableHead className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                                    Technology
                                </TableHead>
                                <TableHead className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                                    Load
                                </TableHead>
                                <TableHead className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                                    IP Address
                                </TableHead>
                                <TableHead className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOlts.map((olt) => (
                                <TableRow
                                    key={olt.id}
                                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                                >
                                    <TableCell className="px-5 py-3">
                                        <div>
                                            <p className="font-medium text-slate-700 text-[13px]">
                                                {olt.name}
                                            </p>
                                            <p className="text-slate-400 text-[11px]">
                                                {olt.location || "No location"}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Badge
                                            className={`${OLT_STATUS_COLORS[olt.status]} text-[10px] font-bold px-2 py-0.5 rounded-full`}
                                        >
                                            {olt.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <span className="text-slate-600 text-[12px]">
                                            {olt.ponTechnology}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="text-slate-700 text-[12px]">
                                                {olt.currentLoad}
                                            </div>
                                            <span className="text-slate-400 text-[11px]">
                                                / {olt.maxCapacity}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <span className="text-slate-600 text-[12px] font-mono">
                                            {olt.ipAddress}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedOlt(olt);
                                                            setShowDetailsDialog(
                                                                true,
                                                            );
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    View OLT details
                                                </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleSyncOlt(
                                                                olt.id,
                                                            )
                                                        }
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Sync OLT
                                                </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleRebootOlt(
                                                                olt.id,
                                                            )
                                                        }
                                                    >
                                                        <Power className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Reboot OLT
                                                </TooltipContent>
                                            </Tooltip>
                                            {olt.status === "PENDING" && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleApproveOlt(
                                                                    olt.id,
                                                                )
                                                            }
                                                        >
                                                            <Settings className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Approve OLT
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedOlt(olt);
                                                            setShowDetailsDialog(
                                                                false,
                                                            );
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Edit OLT
                                                </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            handleDeleteOlt(
                                                                olt.id,
                                                            );
                                                            setSelectedOlt(
                                                                null,
                                                            );
                                                            setShowDetailsDialog(
                                                                false,
                                                            );
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Delete OLT
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredOlts.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="px-5 py-8 text-center text-slate-400 text-sm"
                                    >
                                        No OLTs found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Details Dialog */}
            {showDetailsDialog && selectedOlt && (
                <Dialog
                    open={showDetailsDialog}
                    onOpenChange={setShowDetailsDialog}
                >
                    <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-semibold">
                                OLT Details
                            </DialogTitle>
                        </DialogHeader>
                        <DialogBody>
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList>
                                <TabsTrigger value="overview">
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger value="ports">Ports</TabsTrigger>
                                <TabsTrigger value="onus">ONUs</TabsTrigger>
                                <TabsTrigger value="alerts">Alerts</TabsTrigger>
                                <TabsTrigger value="maintenance">
                                    Maintenance
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview">
                                <div className="space-y-6">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-700 mb-2">
                                                Basic Information
                                            </h3>
                                            <dl className="space-y-1">
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-slate-500">
                                                        Name:
                                                    </dt>
                                                    <dd className="text-sm text-slate-700">
                                                        {selectedOlt.name}
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-slate-500">
                                                        Status:
                                                    </dt>
                                                    <dd>
                                                        <Badge
                                                            className={`${OLT_STATUS_COLORS[selectedOlt.status]} text-[10px] font-bold px-2 py-0.5 rounded-full`}
                                                        >
                                                            {selectedOlt.status}
                                                        </Badge>
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-slate-500">
                                                        Technology:
                                                    </dt>
                                                    <dd className="text-sm text-slate-700">
                                                        {
                                                            selectedOlt.ponTechnology
                                                        }
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-slate-500">
                                                        IP Address:
                                                    </dt>
                                                    <dd className="text-sm text-slate-700 font-mono">
                                                        {selectedOlt.ipAddress}
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-slate-500">
                                                        Location:
                                                    </dt>
                                                    <dd className="text-sm text-slate-700">
                                                        {selectedOlt.location ||
                                                            "Not specified"}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-700 mb-2">
                                                Brand & Version
                                            </h3>
                                            <dl className="space-y-1">
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-slate-500">
                                                        Brand:
                                                    </dt>
                                                    <dd className="text-sm text-slate-700">
                                                        {selectedOlt.oltBrand
                                                            .displayName ||
                                                            selectedOlt.oltBrand
                                                                .name}
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-slate-500">
                                                        Version:
                                                    </dt>
                                                    <dd className="text-sm text-slate-700">
                                                        {
                                                            selectedOlt
                                                                .oltVersion
                                                                .version
                                                        }
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-slate-500">
                                                        Firmware:
                                                    </dt>
                                                    <dd className="text-sm text-slate-700">
                                                        {selectedOlt.oltVersion
                                                            .firmware ||
                                                            "Unknown"}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>
                                    </div>

                                    {/* Performance */}
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-700 mb-2">
                                            Performance
                                        </h3>
                                        <dl className="space-y-1">
                                            <div className="flex justify-between">
                                                <dt className="text-sm text-slate-500">
                                                    CPU Usage:
                                                </dt>
                                                <dd className="text-sm text-slate-700">
                                                    {selectedOlt.cpuUsage.toFixed(
                                                        1,
                                                    )}
                                                    %
                                                </dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-sm text-slate-500">
                                                    RAM Usage:
                                                </dt>
                                                <dd className="text-sm text-slate-700">
                                                    {selectedOlt.ramUsage.toFixed(
                                                        1,
                                                    )}
                                                    %
                                                </dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-sm text-slate-500">
                                                    Temperature:
                                                </dt>
                                                <dd className="text-sm text-slate-700">
                                                    {selectedOlt.temperature
                                                        ? `${selectedOlt.temperature.toFixed(1)}°C`
                                                        : "N/A"}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-sm text-slate-500">
                                                    Uptime:
                                                </dt>
                                                <dd className="text-sm text-slate-700">
                                                    {selectedOlt.uptime
                                                        ? `${Math.floor(selectedOlt.uptime / 86400)} days`
                                                        : "N/A"}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>

                                    {/* Capacity */}
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-700 mb-2">
                                            Capacity
                                        </h3>
                                        <dl className="space-y-1">
                                            <div className="flex justify-between">
                                                <dt className="text-sm text-slate-500">
                                                    Current Load:
                                                </dt>
                                                <dd className="text-sm text-slate-700">
                                                    {selectedOlt.currentLoad} /{" "}
                                                    {selectedOlt.maxCapacity}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-sm text-slate-500">
                                                    Max Capacity:
                                                </dt>
                                                <dd className="text-sm text-slate-700">
                                                    {selectedOlt.maxCapacity}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-sm text-slate-500">
                                                    Utilization:
                                                </dt>
                                                <dd className="text-sm text-slate-700">
                                                    {(
                                                        (selectedOlt.currentLoad /
                                                            selectedOlt.maxCapacity) *
                                                        100
                                                    ).toFixed(1)}
                                                    %
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="ports">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-slate-700 mb-4">
                                        OLT Ports ({ports.length})
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {ports.map((port) => (
                                            <Card
                                                key={port.id}
                                                className="border-slate-200/80"
                                            >
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-semibold">
                                                        Port {port.portNumber}
                                                    </CardTitle>
                                                    <Badge
                                                        className={`${PORT_STATUS_COLORS[port.status]} text-[10px] font-bold px-2 py-0.5 rounded-full`}
                                                    >
                                                        {port.status}
                                                    </Badge>
                                                </CardHeader>
                                                <CardContent className="p-4">
                                                    <dl className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-slate-500">
                                                                Status:
                                                            </dt>
                                                            <dd className="text-sm text-slate-700">
                                                                {port.status}
                                                            </dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-slate-500">
                                                                Technology:
                                                            </dt>
                                                            <dd className="text-sm text-slate-700">
                                                                {
                                                                    port.technology
                                                                }
                                                            </dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-slate-500">
                                                                ONU Connected:
                                                            </dt>
                                                            <dd className="text-sm text-slate-700">
                                                                {port.onu
                                                                    ? "Yes"
                                                                    : "No"}
                                                            </dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-slate-500">
                                                                Signal Level:
                                                            </dt>
                                                            <dd className="text-sm text-slate-700">
                                                                {port.signalLevel
                                                                    ? `${port.signalLevel} dBm`
                                                                    : "N/A"}
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                    <div className="flex justify-end gap-2 pt-4">
                                                        <Button
                                                            variant={
                                                                port.status ===
                                                                "ACTIVE"
                                                                    ? "outline"
                                                                    : "default"
                                                            }
                                                            size="sm"
                                                            onClick={() =>
                                                                port.status ===
                                                                "ACTIVE"
                                                                    ? handleDisablePort(
                                                                          selectedOlt.id,
                                                                          port.id,
                                                                      )
                                                                    : handleEnablePort(
                                                                          selectedOlt.id,
                                                                          port.id,
                                                                      )
                                                            }
                                                        >
                                                            {port.status ===
                                                            "ACTIVE"
                                                                ? "Disable"
                                                                : "Enable"}
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="onus">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-slate-700 mb-4">
                                        Connected ONUs ({onus.length})
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {onus.map((onu) => (
                                            <Card
                                                key={onu.id}
                                                className="border-slate-200/80"
                                            >
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-semibold">
                                                        ONU {onu.onuId}
                                                    </CardTitle>
                                                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        Active
                                                    </Badge>
                                                </CardHeader>
                                                <CardContent className="p-4">
                                                    <dl className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-slate-500">
                                                                Serial Number:
                                                            </dt>
                                                            <dd className="text-sm text-slate-700 font-mono">
                                                                {
                                                                    onu.serialNumber
                                                                }
                                                            </dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-slate-500">
                                                                Signal Level:
                                                            </dt>
                                                            <dd className="text-sm text-slate-700">
                                                                {onu.signalLevel
                                                                    ? `${onu.signalLevel} dBm`
                                                                    : "N/A"}
                                                            </dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-slate-500">
                                                                Customer:
                                                            </dt>
                                                            <dd className="text-sm text-slate-700">
                                                                {onu.customer
                                                                    ?.fullName ||
                                                                    "Unassigned"}
                                                            </dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-slate-500">
                                                                IP Address:
                                                            </dt>
                                                            <dd className="text-sm text-slate-700 font-mono">
                                                                {onu.ipAddress}
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                    <div className="flex justify-end gap-2 pt-4">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleDeprovisionOnu(
                                                                    selectedOlt.id,
                                                                    onu.id,
                                                                )
                                                            }
                                                        >
                                                            De-provision
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="alerts">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-slate-700 mb-4">
                                        OLT Alerts ({alerts.length})
                                    </h3>
                                    <div className="space-y-4">
                                        {alerts.map((alert) => (
                                            <Card
                                                key={alert.id}
                                                className="border-slate-200/80"
                                            >
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                        {alert.type}
                                                        <Badge
                                                            className={`${ALERT_SEVERITY_COLORS[alert.severity]} text-[10px] font-bold px-2 py-0.5 rounded-full`}
                                                        >
                                                            {alert.severity.toUpperCase()}
                                                        </Badge>
                                                        <span className="text-slate-700">
                                                            {alert.message}
                                                        </span>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-4">
                                                    <p className="text-sm text-slate-600">
                                                        {alert.description}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-2">
                                                        {format(
                                                            new Date(
                                                                alert.createdAt,
                                                            ),
                                                            "MMM dd, yyyy HH:mm:ss",
                                                        )}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="maintenance">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-slate-700 mb-4">
                                        Maintenance Schedule (
                                        {maintenanceSchedules.length})
                                    </h3>
                                    <div className="space-y-4">
                                        {maintenanceSchedules.map(
                                            (schedule) => (
                                                <Card
                                                    key={schedule.id}
                                                    className="border-slate-200/80"
                                                >
                                                    <CardHeader>
                                                        <CardTitle className="text-sm font-semibold">
                                                            {format(
                                                                new Date(
                                                                    schedule.startTime,
                                                                ),
                                                                "MMM dd, yyyy HH:mm",
                                                            )}
                                                        </CardTitle>
                                                        <Badge
                                                            className={
                                                                schedule.status ===
                                                                "COMPLETED"
                                                                    ? "bg-emerald-100 text-emerald-700"
                                                                    : "bg-blue-100 text-blue-700"
                                                            }
                                                        >
                                                            {schedule.status}
                                                        </Badge>
                                                    </CardHeader>
                                                    <CardContent className="p-4">
                                                        <p className="text-sm font-medium text-slate-700 mb-2">
                                                            {schedule.title}
                                                        </p>
                                                        <p className="text-sm text-slate-600">
                                                            {
                                                                schedule.description
                                                            }
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-2">
                                                            <strong>
                                                                Start:
                                                            </strong>{" "}
                                                            {format(
                                                                new Date(
                                                                    schedule.startTime,
                                                                ),
                                                                "MMM dd, yyyy HH:mm",
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            <strong>
                                                                End:
                                                            </strong>{" "}
                                                            {format(
                                                                new Date(
                                                                    schedule.endTime,
                                                                ),
                                                                "MMM dd, yyyy HH:mm",
                                                            )}
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                        </DialogBody>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setShowDetailsDialog(false)}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Create OLT Dialog */}
            {showCreateDialog && (
                <Dialog
                    open={showCreateDialog}
                    onOpenChange={setShowCreateDialog}
                >
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-semibold">
                                Add New OLT
                            </DialogTitle>
                        </DialogHeader>
                        <DialogBody className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="name">OLT Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Enter OLT name"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="ipAddress">
                                        IP Address
                                    </Label>
                                    <Input
                                        id="ipAddress"
                                        placeholder="192.168.1.100"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="location">Location</Label>
                                    <Input
                                        id="location"
                                        placeholder="Enter location"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="oltBrandId">Brand</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select brand" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="brand1">
                                                Brand 1
                                            </SelectItem>
                                            <SelectItem value="brand2">
                                                Brand 2
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="ponTechnology">
                                        Technology
                                    </Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select technology" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="GPON">
                                                GPON
                                            </SelectItem>
                                            <SelectItem value="EPON">
                                                EPON
                                            </SelectItem>
                                            <SelectItem value="ACTIVE_ETHERNET">
                                                Active Ethernet
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="maxCapacity">
                                        Max Capacity
                                    </Label>
                                    <Input
                                        id="maxCapacity"
                                        type="number"
                                        placeholder="128"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="sshPort">SSH Port</Label>
                                    <Input
                                        id="sshPort"
                                        type="number"
                                        placeholder="22"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="managementInterface">
                                        Management Interface
                                    </Label>
                                    <Input
                                        id="managementInterface"
                                        placeholder="192.168.1.100"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="snmpCommunity">
                                        SNMP Community
                                    </Label>
                                    <Input
                                        id="snmpCommunity"
                                        placeholder="public"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="autoProvisioning"
                                        className="h-4 w-4"
                                    />
                                    <Label htmlFor="autoProvisioning">
                                        Auto-provisioning
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        className="h-4 w-4"
                                    />
                                    <Label htmlFor="isActive">Active</Label>
                                </div>
                            </div>
                        </DialogBody>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setShowCreateDialog(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() =>
                                    handleCreateOlt({
                                        name: "",
                                        location: "",
                                        ipAddress: "",
                                        oltBrandId: "",
                                        ponTechnology: "GPON",
                                        maxCapacity: 128,
                                        sshPort: 22,
                                        managementInterface: "",
                                        snmpCommunity: "",
                                        autoProvisioning: false,
                                        isActive: true,
                                    })
                                }
                            >
                                Create OLT
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
