"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    Shield,
    Plus,
    Edit,
    Trash2,
    Search,
    Lock,
    Key,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useConfirm } from "@/components/ui/confirm-dialog";
import api from "@/lib/api";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

interface Permission {
    id: string;
    name: string;
    description: string;
    resource: string;
    action: string;
}

interface RolePermission {
    permission: Permission;
}

interface Role {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    permissions: RolePermission[];
    createdAt?: string;
    updatedAt?: string;
}

interface RoleFormData {
    name: string;
    description: string;
    isActive: boolean;
    permissionIds: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function groupPermissionsByResource(permissions: Permission[]): Record<string, Permission[]> {
    return permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
        const resource = perm.resource || "Other";
        if (!acc[resource]) acc[resource] = [];
        acc[resource].push(perm);
        return acc;
    }, {});
}

const EMPTY_FORM: RoleFormData = {
    name: "",
    description: "",
    isActive: true,
    permissionIds: [],
};

// ── Component ────────────────────────────────────────────────────────────────

export default function RolesPermissionsPage() {
    const confirm = useConfirm();

    // Data
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    // UI
    const [activeTab, setActiveTab] = useState("roles");
    const [searchTerm, setSearchTerm] = useState("");
    const [permSearchTerm, setPermSearchTerm] = useState("");

    // Dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState<RoleFormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    // ── Fetch ────────────────────────────────────────────────────────────────

    const fetchRoles = useCallback(async () => {
        try {
            const res = await api.get("/roles");
            setRoles(res.data.data?.roles || []);
        } catch (error) {
            console.error("Failed to fetch roles:", error);
            toast.error("Failed to fetch roles");
        }
    }, []);

    const fetchPermissions = useCallback(async () => {
        try {
            const res = await api.get("/roles/permissions/all");
            setPermissions(res.data.data?.permissions || []);
        } catch (error) {
            console.error("Failed to fetch permissions:", error);
            toast.error("Failed to fetch permissions");
        }
    }, []);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchRoles(), fetchPermissions()]);
        setLoading(false);
    }, [fetchRoles, fetchPermissions]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // ── Grouped permissions ──────────────────────────────────────────────────

    const groupedPermissions = useMemo(
        () => groupPermissionsByResource(permissions),
        [permissions]
    );

    const sortedResources = useMemo(
        () => Object.keys(groupedPermissions).sort(),
        [groupedPermissions]
    );

    // ── Filtered data ────────────────────────────────────────────────────────

    const filteredRoles = useMemo(() => {
        if (!searchTerm.trim()) return roles;
        const q = searchTerm.toLowerCase();
        return roles.filter(
            (r) =>
                r.name.toLowerCase().includes(q) ||
                r.description?.toLowerCase().includes(q)
        );
    }, [roles, searchTerm]);

    const filteredGroupedPermissions = useMemo(() => {
        if (!permSearchTerm.trim()) return groupedPermissions;
        const q = permSearchTerm.toLowerCase();
        const result: Record<string, Permission[]> = {};
        for (const [resource, perms] of Object.entries(groupedPermissions)) {
            const matched = perms.filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    p.resource.toLowerCase().includes(q) ||
                    p.action.toLowerCase().includes(q) ||
                    p.description?.toLowerCase().includes(q)
            );
            if (matched.length > 0) result[resource] = matched;
        }
        return result;
    }, [groupedPermissions, permSearchTerm]);

    const filteredPermResources = useMemo(
        () => Object.keys(filteredGroupedPermissions).sort(),
        [filteredGroupedPermissions]
    );

    // ── Dialog handlers ──────────────────────────────────────────────────────

    const openCreateDialog = () => {
        setEditingRole(null);
        setFormData(EMPTY_FORM);
        setDialogOpen(true);
    };

    const openEditDialog = (role: Role) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            description: role.description || "",
            isActive: role.isActive,
            permissionIds: role.permissions.map((rp) => rp.permission.id),
        });
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setEditingRole(null);
        setFormData(EMPTY_FORM);
    };

    // ── Permission checkbox helpers ──────────────────────────────────────────

    const togglePermission = (permId: string) => {
        setFormData((prev) => ({
            ...prev,
            permissionIds: prev.permissionIds.includes(permId)
                ? prev.permissionIds.filter((id) => id !== permId)
                : [...prev.permissionIds, permId],
        }));
    };

    const toggleResourceGroup = (resource: string) => {
        const resourcePermIds = (groupedPermissions[resource] || []).map((p) => p.id);
        const allSelected = resourcePermIds.every((id) =>
            formData.permissionIds.includes(id)
        );

        setFormData((prev) => ({
            ...prev,
            permissionIds: allSelected
                ? prev.permissionIds.filter((id) => !resourcePermIds.includes(id))
                : [
                      ...prev.permissionIds,
                      ...resourcePermIds.filter(
                          (id) => !prev.permissionIds.includes(id)
                      ),
                  ],
        }));
    };

    const isResourceFullySelected = (resource: string) => {
        const resourcePermIds = (groupedPermissions[resource] || []).map((p) => p.id);
        return (
            resourcePermIds.length > 0 &&
            resourcePermIds.every((id) => formData.permissionIds.includes(id))
        );
    };

    const isResourcePartiallySelected = (resource: string) => {
        const resourcePermIds = (groupedPermissions[resource] || []).map((p) => p.id);
        const selectedCount = resourcePermIds.filter((id) =>
            formData.permissionIds.includes(id)
        ).length;
        return selectedCount > 0 && selectedCount < resourcePermIds.length;
    };

    // ── Save / Delete ────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error("Role name is required");
            return;
        }

        setSaving(true);
        try {
            if (editingRole) {
                await api.put(`/roles/${editingRole.id}`, {
                    name: formData.name,
                    description: formData.description,
                    isActive: formData.isActive,
                    permissionIds: formData.permissionIds,
                });
                toast.success("Role updated successfully");
            } else {
                await api.post("/roles", {
                    name: formData.name,
                    description: formData.description,
                    permissionIds: formData.permissionIds,
                });
                toast.success("Role created successfully");
            }
            closeDialog();
            fetchRoles();
        } catch (error: any) {
            const msg =
                error?.response?.data?.message ||
                `Failed to ${editingRole ? "update" : "create"} role`;
            toast.error(msg);
            console.error("Save role error:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (role: Role) => {
        const ok = await confirm({
            title: "Delete Role",
            description: `Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`,
            confirmText: "Delete",
            cancelText: "Cancel",
            variant: "danger",
        });
        if (!ok) return;

        try {
            await api.delete(`/roles/${role.id}`);
            toast.success("Role deleted successfully");
            fetchRoles();
        } catch (error: any) {
            const msg = error?.response?.data?.message || "Failed to delete role";
            toast.error(msg);
            console.error("Delete role error:", error);
        }
    };

    // ── Loading state ────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-lg animate-spin mx-auto" />
            </div>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Shield className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">
                            Roles & Permissions
                        </h1>
                        <p className="text-sm text-slate-500">
                            Manage access control roles and their permissions
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="roles" className="gap-2">
                        <Lock className="h-4 w-4" />
                        Roles
                    </TabsTrigger>
                    <TabsTrigger value="permissions" className="gap-2">
                        <Key className="h-4 w-4" />
                        Permissions
                    </TabsTrigger>
                </TabsList>

                {/* ── Tab 1: Roles ─────────────────────────────────────────── */}
                <TabsContent value="roles" className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search roles..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button
                            onClick={openCreateDialog}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            New Role
                        </Button>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                                            Role Name
                                        </TableHead>
                                        <TableHead className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                                            Description
                                        </TableHead>
                                        <TableHead className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                                            Permissions
                                        </TableHead>
                                        <TableHead className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                                            Status
                                        </TableHead>
                                        <TableHead className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRoles.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="text-center text-slate-400 py-12"
                                            >
                                                {searchTerm
                                                    ? "No roles match your search."
                                                    : "No roles found. Create your first role to get started."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredRoles.map((role) => (
                                            <TableRow
                                                key={role.id}
                                                className="hover:bg-slate-50/50"
                                            >
                                                <TableCell className="font-medium text-slate-800">
                                                    {role.name}
                                                </TableCell>
                                                <TableCell className="text-slate-600 max-w-xs truncate">
                                                    {role.description || "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-slate-600"
                                                    >
                                                        {role.permissions.length}{" "}
                                                        {role.permissions.length === 1
                                                            ? "permission"
                                                            : "permissions"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            role.isActive
                                                                ? "bg-emerald-100 text-emerald-700"
                                                                : "bg-slate-100 text-slate-700"
                                                        }
                                                    >
                                                        {role.isActive
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                openEditDialog(role)
                                                            }
                                                        >
                                                            <Edit className="h-4 w-4 text-slate-500" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleDelete(role)
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Tab 2: Permissions ───────────────────────────────────── */}
                <TabsContent value="permissions" className="space-y-4">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search permissions..."
                            value={permSearchTerm}
                            onChange={(e) => setPermSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {filteredPermResources.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-slate-400">
                                {permSearchTerm
                                    ? "No permissions match your search."
                                    : "No permissions found."}
                            </CardContent>
                        </Card>
                    ) : (
                        filteredPermResources.map((resource) => (
                            <Card key={resource}>
                                <CardContent className="p-0">
                                    <div className="px-4 py-3 border-b bg-slate-50/60">
                                        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            <Key className="h-4 w-4 text-blue-500" />
                                            {resource}
                                            <Badge
                                                variant="outline"
                                                className="ml-2 text-xs"
                                            >
                                                {filteredGroupedPermissions[resource].length}
                                            </Badge>
                                        </h3>
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                                                    Permission Name
                                                </TableHead>
                                                <TableHead className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                                                    Resource
                                                </TableHead>
                                                <TableHead className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                                                    Action
                                                </TableHead>
                                                <TableHead className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                                                    Description
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredGroupedPermissions[resource].map(
                                                (perm) => (
                                                    <TableRow
                                                        key={perm.id}
                                                        className="hover:bg-slate-50/50"
                                                    >
                                                        <TableCell className="font-medium text-slate-800">
                                                            {perm.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className="text-xs"
                                                            >
                                                                {perm.resource}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-slate-600">
                                                            {perm.action}
                                                        </TableCell>
                                                        <TableCell className="text-slate-500 max-w-xs truncate">
                                                            {perm.description || "—"}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>

            {/* ── Create / Edit Role Dialog ────────────────────────────────── */}
            <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-slate-800">
                            {editingRole ? "Edit Role" : "Create New Role"}
                        </DialogTitle>
                    </DialogHeader>

                    <DialogBody className="space-y-5">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="role-name">Name</Label>
                            <Input
                                id="role-name"
                                placeholder="e.g. Support Agent"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                    }))
                                }
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="role-desc">Description</Label>
                            <Textarea
                                id="role-desc"
                                placeholder="Describe what this role is for..."
                                rows={3}
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                            />
                        </div>

                        {/* Active toggle (only when editing) */}
                        {editingRole && (
                            <div className="flex items-center gap-3">
                                <Label htmlFor="role-active" className="cursor-pointer">
                                    Active
                                </Label>
                                <button
                                    id="role-active"
                                    type="button"
                                    role="switch"
                                    aria-checked={formData.isActive}
                                    onClick={() =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            isActive: !prev.isActive,
                                        }))
                                    }
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                                        formData.isActive
                                            ? "bg-blue-500"
                                            : "bg-slate-200"
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            formData.isActive
                                                ? "translate-x-6"
                                                : "translate-x-1"
                                        }`}
                                    />
                                </button>
                            </div>
                        )}

                        {/* Permissions grid */}
                        <div className="space-y-2">
                            <Label>
                                Permissions{" "}
                                <span className="text-slate-400 font-normal">
                                    ({formData.permissionIds.length} selected)
                                </span>
                            </Label>

                            <div className="border rounded-lg max-h-[340px] overflow-y-auto">
                                {sortedResources.length === 0 ? (
                                    <p className="p-4 text-sm text-slate-400 text-center">
                                        No permissions available.
                                    </p>
                                ) : (
                                    sortedResources.map((resource) => {
                                        const perms = groupedPermissions[resource];
                                        const fullySelected =
                                            isResourceFullySelected(resource);
                                        const partiallySelected =
                                            isResourcePartiallySelected(resource);

                                        return (
                                            <div
                                                key={resource}
                                                className="border-b last:border-b-0"
                                            >
                                                {/* Resource header with select-all */}
                                                <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50/80">
                                                    <input
                                                        type="checkbox"
                                                        checked={fullySelected}
                                                        ref={(el) => {
                                                            if (el)
                                                                el.indeterminate =
                                                                    partiallySelected;
                                                        }}
                                                        onChange={() =>
                                                            toggleResourceGroup(resource)
                                                        }
                                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-500"
                                                    />
                                                    <span className="text-sm font-semibold text-slate-700">
                                                        {resource}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        ({perms.length})
                                                    </span>
                                                </div>

                                                {/* Individual permission checkboxes */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 px-4 py-2">
                                                    {perms.map((perm) => (
                                                        <label
                                                            key={perm.id}
                                                            className="flex items-center gap-2.5 py-1 cursor-pointer group"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.permissionIds.includes(
                                                                    perm.id
                                                                )}
                                                                onChange={() =>
                                                                    togglePermission(
                                                                        perm.id
                                                                    )
                                                                }
                                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-500"
                                                            />
                                                            <span className="text-sm text-slate-600 group-hover:text-slate-800">
                                                                {perm.name}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                    </DialogBody>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={closeDialog}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                            {saving ? (
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            ) : null}
                            {editingRole ? "Save Changes" : "Create Role"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
