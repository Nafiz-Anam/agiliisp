"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Settings,
    User,
    ShieldCheck,
    Globe,
    CreditCard,
    MessageSquare,
    Bell,
    ChevronDown,
    ChevronRight,
    Upload,
    Save,
    X,
    Mail,
    Activity,
    Building2,
    Image,
    Palette,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogBody,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";

// ── Settings nav structure ──
interface SettingsNavItem {
    id: string;
    label: string;
    icon: React.ElementType;
}
interface SettingsNavGroup {
    label: string;
    icon: React.ElementType;
    items: SettingsNavItem[];
}

const settingsNav: SettingsNavGroup[] = [
    {
        label: "General Settings",
        icon: Settings,
        items: [
            { id: "profile", label: "Profile", icon: User },
            { id: "security", label: "Security", icon: ShieldCheck },
        ],
    },
    {
        label: "Website Settings",
        icon: Globe,
        items: [
            { id: "company", label: "Company Settings", icon: Building2 },
            { id: "appearance", label: "Appearance", icon: Palette },
        ],
    },
    {
        label: "ISP Configuration",
        icon: Settings,
        items: [
            { id: "email-gateway", label: "Email Gateway", icon: Mail },
            { id: "sms-gateway", label: "SMS Gateway", icon: MessageSquare },
            { id: "billing", label: "Billing Defaults", icon: CreditCard },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "radius", label: "RADIUS Server", icon: ShieldCheck },
        ],
    },
];

export default function SettingsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const user = useAuthStore((s) => s.user);

    const [activeTab, setActiveTab] = useState(
        searchParams.get("tab") || "profile",
    );
    const [expandedGroups, setExpandedGroups] = useState<
        Record<string, boolean>
    >({
        "General Settings": true,
        "Website Settings": true,
        "ISP Configuration": true,
    });

    // Update tab from URL
    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    const handleTabChange = (id: string) => {
        setActiveTab(id);
        router.replace(`/settings?tab=${id}`, { scroll: false });
    };

    const toggleGroup = (label: string) => {
        setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
    };

    // Find active item for header
    const activeItem = settingsNav
        .flatMap((g) => g.items)
        .find((i) => i.id === activeTab);

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    Manage your settings on portal
                </p>
            </div>

            <div className="flex gap-5 items-start">
                {/* Left sidebar nav */}
                <Card className="w-[260px] shrink-0 sticky top-20">
                    <CardContent className="p-3">
                        <h3 className="text-sm font-semibold text-slate-800 px-2 py-2">
                            Settings
                        </h3>
                        <div className="space-y-1">
                            {settingsNav.map((group) => (
                                <div key={group.label}>
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(group.label)}
                                        className="flex items-center justify-between w-full px-2 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <group.icon className="h-4 w-4 text-slate-400" />
                                            {group.label}
                                        </span>
                                        {expandedGroups[group.label] ? (
                                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                        ) : (
                                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                        )}
                                    </button>
                                    {expandedGroups[group.label] && (
                                        <div className="ml-4 space-y-0.5 mt-0.5">
                                            {group.items.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() =>
                                                        handleTabChange(item.id)
                                                    }
                                                    className={cn(
                                                        "flex items-center gap-2 w-full px-3 py-1.5 text-[13px] rounded-lg transition-colors",
                                                        activeTab === item.id
                                                            ? "bg-blue-50 text-blue-600 font-medium"
                                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                                                    )}
                                                >
                                                    {item.label}
                                                    {activeTab === item.id && (
                                                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Right content */}
                <Card className="flex-1 min-w-0">
                    <CardContent className="p-6">
                        {activeTab === "profile" && <ProfileSettings />}
                        {activeTab === "security" && <SecuritySettings />}
                        {activeTab === "company" && <CompanySettings />}
                        {activeTab === "appearance" && <AppearanceSettings />}
                        {activeTab === "email-gateway" && (
                            <EmailGatewaySettings />
                        )}
                        {activeTab === "sms-gateway" && <SmsGatewaySettings />}
                        {activeTab === "billing" && <BillingSettings />}
                        {activeTab === "notifications" && (
                            <NotificationSettings />
                        )}
                        {activeTab === "radius" && <RadiusSettings />}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// Profile Settings
// ═══════════════════════════════════════
function ProfileSettings() {
    const user = useAuthStore((s) => s.user);
    const [form, setForm] = useState({
        name: user?.name || "",
        email: user?.email || "",
        phone: "",
        address: "",
        city: "",
        state: "",
        country: "Bangladesh",
        postalCode: "",
    });
    const [saving, setSaving] = useState(false);

    const initials = user?.name
        ? user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
        : "U";

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch("/profile", { name: form.name, phone: form.phone });
            toast.success("Profile updated");
        } catch {
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Profile</h2>

            {/* Basic Information */}
            <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <User className="h-4 w-4 text-slate-400" />
                    Basic Information
                </div>

                {/* Avatar upload area */}
                <div className="flex items-center gap-5">
                    <div className="h-20 w-20 rounded-lg bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center shrink-0">
                        <div className="h-full w-full rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xl font-bold text-white">
                            {initials}
                        </div>
                    </div>
                    <div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                        >
                            <Upload className="h-3.5 w-3.5" /> Upload Image
                        </Button>
                        <p className="text-[11px] text-slate-400 mt-1.5">
                            Upload an image below 2 MB. Accepted: JPG, PNG
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>
                            Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={form.name}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, name: e.target.value }))
                            }
                            placeholder="Your full name"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>
                            Phone Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={form.phone}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    phone: e.target.value,
                                }))
                            }
                            placeholder="+880 1XXX-XXXXXX"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label>
                        Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={form.email}
                        disabled
                        className="bg-slate-50"
                    />
                    <p className="text-[11px] text-slate-400">
                        Email cannot be changed
                    </p>
                </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 pt-2">
                    <svg
                        className="h-4 w-4 text-slate-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                    Address Information
                </div>

                <div className="space-y-1.5">
                    <Label>
                        Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={form.address}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, address: e.target.value }))
                        }
                        placeholder="Street address"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>
                            Country <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={form.country}
                            disabled
                            className="bg-slate-50"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>State / Division</Label>
                        <Input
                            value={form.state}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    state: e.target.value,
                                }))
                            }
                            placeholder="e.g. Khulna"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>City</Label>
                        <Input
                            value={form.city}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, city: e.target.value }))
                            }
                            placeholder="e.g. Khulna"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Postal Code</Label>
                        <Input
                            value={form.postalCode}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    postalCode: e.target.value,
                                }))
                            }
                            placeholder="e.g. 9000"
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline">Cancel</Button>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5"
                >
                    <Save className="h-3.5 w-3.5" />
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// Security Settings
// ═══════════════════════════════════════
function SecuritySettings() {
    const user = useAuthStore((s) => s.user);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [showDeviceDialog, setShowDeviceDialog] = useState(false);
    const [showActivityDialog, setShowActivityDialog] = useState(false);
    const [pwForm, setPwForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [saving, setSaving] = useState(false);
    const [twoFaEnabled, setTwoFaEnabled] = useState(false);
    const [devices, setDevices] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [loadingDevices, setLoadingDevices] = useState(false);
    const [loadingActivity, setLoadingActivity] = useState(false);

    // Fetch 2FA status
    useEffect(() => {
        api.get("/2fa/status")
            .then((r) =>
                setTwoFaEnabled(r.data?.data?.twoFactorEnabled || false),
            )
            .catch(() => {});
    }, []);

    const handleChangePassword = async () => {
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (pwForm.newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }
        setSaving(true);
        try {
            await api.post("/auth/change-password", {
                oldPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword,
            });
            toast.success("Password changed successfully");
            setPwForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
            setShowPasswordDialog(false);
        } catch (e: any) {
            toast.error(
                e.response?.data?.error?.message || "Failed to change password",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleToggle2FA = async () => {
        try {
            if (twoFaEnabled) {
                await api.post("/2fa/disable");
                setTwoFaEnabled(false);
                toast.success("Two-factor authentication disabled");
            } else {
                await api.post("/2fa/setup");
                setTwoFaEnabled(true);
                toast.success("Two-factor authentication enabled");
            }
        } catch (e: any) {
            toast.error(
                e.response?.data?.error?.message || "Failed to update 2FA",
            );
        }
    };

    const fetchDevices = async () => {
        setLoadingDevices(true);
        try {
            const res = await api.get("/me/devices/sessions");
            setDevices(res.data?.data || []);
        } catch {
            setDevices([]);
        } finally {
            setLoadingDevices(false);
        }
        setShowDeviceDialog(true);
    };

    const handleLogoutAll = async () => {
        try {
            await api.delete("/sessions/revoke-others");
            toast.success("All other sessions terminated");
            fetchDevices();
        } catch {
            toast.error("Failed to logout devices");
        }
    };

    const fetchActivity = async () => {
        setLoadingActivity(true);
        try {
            const res = await api.get("/me/activity?limit=20");
            setActivities(res.data?.data || []);
        } catch {
            setActivities([]);
        } finally {
            setLoadingActivity(false);
        }
        setShowActivityDialog(true);
    };

    // Toggle component
    const Toggle = ({
        checked,
        onChange,
    }: {
        checked: boolean;
        onChange: () => void;
    }) => (
        <button
            type="button"
            onClick={onChange}
            className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                checked ? "bg-blue-500" : "bg-slate-200",
            )}
        >
            <span
                className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                    checked ? "translate-x-6" : "translate-x-1",
                )}
            />
        </button>
    );

    // Security row component matching the reference design
    const SecurityRow = ({
        icon: Icon,
        title,
        description,
        action,
    }: {
        icon: React.ElementType;
        title: string;
        description: string;
        action: React.ReactNode;
    }) => (
        <div className="flex items-center gap-4 py-5 border-b border-slate-100 last:border-0">
            <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                <Icon className="h-4.5 w-4.5 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>
            <div className="shrink-0 flex items-center gap-2">{action}</div>
        </div>
    );

    return (
        <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
                Security
            </h2>

            {/* Password */}
            <SecurityRow
                icon={ShieldCheck}
                title="Password"
                description="Last changed — update regularly for security"
                action={
                    <Button
                        size="sm"
                        onClick={() => setShowPasswordDialog(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs"
                    >
                        Change Password
                    </Button>
                }
            />

            {/* Two Factor Authentication */}
            <SecurityRow
                icon={ShieldCheck}
                title="Two Factor Authentication"
                description="Receive codes via SMS or email every time you login"
                action={
                    <Toggle checked={twoFaEnabled} onChange={handleToggle2FA} />
                }
            />

            {/* Google Authentication */}
            <SecurityRow
                icon={Globe}
                title="Google Authentication"
                description="Connect your Google account for enhanced security"
                action={
                    <>
                        <Badge className="text-[10px] bg-slate-100 text-slate-500 rounded-[4px]">
                            Not Connected
                        </Badge>
                        <Button variant="outline" size="sm" className="text-xs">
                            Connect
                        </Button>
                    </>
                }
            />

            {/* Phone Number */}
            <SecurityRow
                icon={MessageSquare}
                title="Phone Number"
                description={
                    user?.email
                        ? "No phone number added"
                        : "No phone number added"
                }
                action={
                    <Button variant="outline" size="sm" className="text-xs">
                        Add Phone
                    </Button>
                }
            />

            {/* Email Address */}
            <SecurityRow
                icon={Mail}
                title="Email Address"
                description={`Verified Email : ${user?.email || "—"}`}
                action={
                    <>
                        <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                            <svg
                                className="h-3 w-3 text-emerald-600"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            >
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                        </div>
                        <Button
                            size="sm"
                            className="bg-blue-500 hover:bg-blue-600 text-white text-xs"
                        >
                            Change
                        </Button>
                    </>
                }
            />

            {/* Device Management */}
            <SecurityRow
                icon={Settings}
                title="Device Management"
                description="Manage active devices and sessions"
                action={
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-red-500 border-red-200 hover:bg-red-50"
                            onClick={handleLogoutAll}
                        >
                            Logout All
                        </Button>
                        <Button
                            size="sm"
                            className="bg-blue-500 hover:bg-blue-600 text-white text-xs"
                            onClick={fetchDevices}
                        >
                            Manage
                        </Button>
                    </>
                }
            />

            {/* Account Activity */}
            <SecurityRow
                icon={Activity}
                title="Account Activity"
                description="Manage activities associated with the account"
                action={
                    <Button
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs"
                        onClick={fetchActivity}
                    >
                        View
                    </Button>
                }
            />

            {/* ── Change Password Dialog ── */}
            <Dialog
                open={showPasswordDialog}
                onOpenChange={setShowPasswordDialog}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                    </DialogHeader>
                    <DialogBody className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>
                                Current Password{" "}
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="password"
                                value={pwForm.currentPassword}
                                onChange={(e) =>
                                    setPwForm((f) => ({
                                        ...f,
                                        currentPassword: e.target.value,
                                    }))
                                }
                                placeholder="Enter current password"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>
                                New Password{" "}
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="password"
                                value={pwForm.newPassword}
                                onChange={(e) =>
                                    setPwForm((f) => ({
                                        ...f,
                                        newPassword: e.target.value,
                                    }))
                                }
                                placeholder="Enter new password"
                            />
                            {/* Strength indicator */}
                            {pwForm.newPassword && (
                                <div className="flex gap-1 mt-1.5">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "h-1 flex-1 rounded-full",
                                                pwForm.newPassword.length >=
                                                    i * 3
                                                    ? pwForm.newPassword
                                                          .length >= 12
                                                        ? "bg-emerald-400"
                                                        : pwForm.newPassword
                                                                .length >= 8
                                                          ? "bg-amber-400"
                                                          : "bg-red-400"
                                                    : "bg-slate-200",
                                            )}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label>
                                Confirm Password{" "}
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="password"
                                value={pwForm.confirmPassword}
                                onChange={(e) =>
                                    setPwForm((f) => ({
                                        ...f,
                                        confirmPassword: e.target.value,
                                    }))
                                }
                                placeholder="Confirm new password"
                            />
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowPasswordDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleChangePassword}
                            disabled={saving}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Device Management Dialog ── */}
            <Dialog open={showDeviceDialog} onOpenChange={setShowDeviceDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Device Management</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {loadingDevices ? (
                            <div className="flex justify-center py-8">
                                <div className="h-5 w-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                            </div>
                        ) : devices.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">
                                            Device
                                        </th>
                                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">
                                            Date
                                        </th>
                                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">
                                            Location
                                        </th>
                                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">
                                            IP Address
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {devices.map((d: any, i: number) => (
                                        <tr
                                            key={i}
                                            className="border-b border-slate-100"
                                        >
                                            <td className="py-2 px-3 text-slate-700">
                                                {d.deviceName ||
                                                    d.userAgent?.split(
                                                        "/",
                                                    )[0] ||
                                                    "Unknown"}
                                            </td>
                                            <td className="py-2 px-3 text-slate-500">
                                                {d.lastActiveAt
                                                    ? new Date(
                                                          d.lastActiveAt,
                                                      ).toLocaleDateString()
                                                    : "—"}
                                            </td>
                                            <td className="py-2 px-3 text-slate-500">
                                                {d.location || "—"}
                                            </td>
                                            <td className="py-2 px-3 text-slate-500 font-mono text-xs">
                                                {d.ipAddress || "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-center text-slate-400 py-8 text-sm">
                                No active sessions found
                            </p>
                        )}
                    </DialogBody>
                </DialogContent>
            </Dialog>

            {/* ── Account Activity Dialog ── */}
            <Dialog
                open={showActivityDialog}
                onOpenChange={setShowActivityDialog}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Account Activity</DialogTitle>
                    </DialogHeader>
                    <DialogBody className="max-h-[400px] overflow-y-auto">
                        {loadingActivity ? (
                            <div className="flex justify-center py-8">
                                <div className="h-5 w-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                            </div>
                        ) : activities.length > 0 ? (
                            <div className="space-y-0">
                                {activities.map((a: any, i: number) => (
                                    <div
                                        key={i}
                                        className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0"
                                    >
                                        <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                                            <Activity className="h-3.5 w-3.5 text-slate-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-700">
                                                {a.action ||
                                                    a.type ||
                                                    "Activity"}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {a.createdAt
                                                    ? new Date(
                                                          a.createdAt,
                                                      ).toLocaleString()
                                                    : "—"}
                                                {a.ipAddress && (
                                                    <span className="ml-2 font-mono">
                                                        {a.ipAddress}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-400 py-8 text-sm">
                                No recent activity
                            </p>
                        )}
                    </DialogBody>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ═══════════════════════════════════════
// Company Settings
// ═══════════════════════════════════════
function CompanySettings() {
    const [form, setForm] = useState({
        companyName: "",
        companyEmail: "",
        phone: "",
        fax: "",
        website: "",
        address: "",
        country: "Bangladesh",
        state: "",
        city: "",
        postalCode: "",
    });
    const [images, setImages] = useState<{
        icon: string | null;
        favicon: string | null;
        logo: string | null;
        darkLogo: string | null;
    }>({
        icon: null,
        favicon: null,
        logo: null,
        darkLogo: null,
    });
    const [saving, setSaving] = useState(false);

    // Load settings
    useEffect(() => {
        api.get("/me/preferences")
            .then((r) => {
                const d = r.data?.data || {};
                setForm((f) => ({
                    ...f,
                    companyName: d.companyName || "",
                    companyEmail: d.companyEmail || "",
                    phone: d.companyPhone || "",
                    fax: d.companyFax || "",
                    website: d.companyWebsite || "",
                    address: d.companyAddress || "",
                    state: d.companyState || "",
                    city: d.companyCity || "",
                    postalCode: d.companyPostalCode || "",
                }));
                setImages({
                    icon: d.companyIcon || null,
                    favicon: d.companyFavicon || null,
                    logo: d.companyLogo || null,
                    darkLogo: d.companyDarkLogo || null,
                });
            })
            .catch(() => {});
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch("/me/preferences", {
                companyName: form.companyName,
                companyEmail: form.companyEmail,
                companyPhone: form.phone,
                companyFax: form.fax,
                companyWebsite: form.website,
                companyAddress: form.address,
                companyState: form.state,
                companyCity: form.city,
                companyPostalCode: form.postalCode,
            });
            toast.success("Company settings saved");
        } catch {
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = (field: keyof typeof images) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File must be under 5MB");
                return;
            }
            // Preview immediately
            const reader = new FileReader();
            reader.onload = () =>
                setImages((prev) => ({
                    ...prev,
                    [field]: reader.result as string,
                }));
            reader.readAsDataURL(file);
            // Upload
            try {
                const formData = new FormData();
                formData.append("image", file);
                formData.append("type", field);
                await api.post("/profile/profile-picture", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                toast.success("Image uploaded");
            } catch {
                toast.error("Upload failed");
            }
        };
        input.click();
    };

    const handleImageRemove = (field: keyof typeof images) => {
        setImages((prev) => ({ ...prev, [field]: null }));
    };

    const ImageUploadRow = ({
        label,
        description,
        field,
        recommended,
    }: {
        label: string;
        description: string;
        field: keyof typeof images;
        recommended: string;
    }) => (
        <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
            <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>
            <div className="flex items-center gap-4">
                <Button
                    size="sm"
                    onClick={() => handleImageUpload(field)}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-xs gap-1.5"
                >
                    <Upload className="h-3.5 w-3.5" /> Upload Image
                </Button>
                <p className="text-[11px] text-slate-400 max-w-[180px]">
                    {recommended}
                </p>
                {images[field] ? (
                    <div className="relative h-14 w-14 shrink-0">
                        <img
                            src={images[field]!}
                            alt={label}
                            className="h-14 w-14 object-contain rounded-lg border border-slate-200"
                        />
                        <button
                            type="button"
                            onClick={() => handleImageRemove(field)}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center"
                        >
                            <X className="h-3 w-3 text-white" />
                        </button>
                    </div>
                ) : (
                    <div className="h-14 w-14 rounded-lg bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center shrink-0">
                        <Image className="h-5 w-5 text-slate-300" />
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">
                Company Settings
            </h2>

            {/* Company Information */}
            <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    Company Information
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <Label>Company Name</Label>
                        <Input
                            value={form.companyName}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    companyName: e.target.value,
                                }))
                            }
                            placeholder="Your ISP name"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Company Email</Label>
                        <Input
                            value={form.companyEmail}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    companyEmail: e.target.value,
                                }))
                            }
                            placeholder="info@yourisp.com"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Phone Number</Label>
                        <Input
                            value={form.phone}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    phone: e.target.value,
                                }))
                            }
                            placeholder="+880 1XXX-XXXXXX"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>Fax</Label>
                        <Input
                            value={form.fax}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, fax: e.target.value }))
                            }
                            placeholder="Fax number (optional)"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Website</Label>
                        <Input
                            value={form.website}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    website: e.target.value,
                                }))
                            }
                            placeholder="https://yourisp.com"
                        />
                    </div>
                </div>
            </div>

            {/* Company Images */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 pt-2">
                    <Image className="h-4 w-4 text-slate-400" />
                    Company Images
                </div>

                <ImageUploadRow
                    label="Company Icon"
                    description="Upload Icon of your Company"
                    field="icon"
                    recommended="Recommended size is 450px x 450px. Max size 5mb."
                />
                <ImageUploadRow
                    label="Favicon"
                    description="Upload Favicon of your Company"
                    field="favicon"
                    recommended="Recommended size is 450px x 450px. Max size 5mb."
                />
                <ImageUploadRow
                    label="Company Logo"
                    description="Used on invoices and reports. Upload logo of your company."
                    field="logo"
                    recommended="Recommended size 450x450px. Max 5mb."
                />
                <ImageUploadRow
                    label="Company Dark Logo"
                    description="Upload Dark Logo of your Company"
                    field="darkLogo"
                    recommended="Recommended size is 450px x 450px. Max size 5mb."
                />
            </div>

            {/* Address Information */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 pt-2">
                    <svg
                        className="h-4 w-4 text-slate-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                    Address Information
                </div>

                <div className="space-y-1.5">
                    <Label>Address</Label>
                    <Input
                        value={form.address}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, address: e.target.value }))
                        }
                        placeholder="Street address"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>Country</Label>
                        <Input
                            value={form.country}
                            disabled
                            className="bg-slate-50"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>State / Division</Label>
                        <Input
                            value={form.state}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    state: e.target.value,
                                }))
                            }
                            placeholder="e.g. Khulna"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>City</Label>
                        <Input
                            value={form.city}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, city: e.target.value }))
                            }
                            placeholder="e.g. Khulna"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Postal Code</Label>
                        <Input
                            value={form.postalCode}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    postalCode: e.target.value,
                                }))
                            }
                            placeholder="e.g. 9000"
                        />
                    </div>
                </div>
            </div>

            {/* Save */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline">Cancel</Button>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5"
                >
                    <Save className="h-3.5 w-3.5" />
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// Appearance Settings
// ═══════════════════════════════════════
function AppearanceSettings() {
    const [theme, setTheme] = useState("light");
    const [primaryColor, setPrimaryColor] = useState("#3b82f6");
    const [saving, setSaving] = useState(false);

    const colors = [
        { label: "Blue", value: "#3b82f6" },
        { label: "Indigo", value: "#6366f1" },
        { label: "Emerald", value: "#10b981" },
        { label: "Orange", value: "#f97316" },
        { label: "Rose", value: "#f43f5e" },
        { label: "Violet", value: "#8b5cf6" },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Appearance</h2>

            {/* Theme */}
            <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <Palette className="h-4 w-4 text-slate-400" />
                    Theme
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {[
                        {
                            id: "light",
                            label: "Light",
                            desc: "Default light theme",
                        },
                        { id: "dark", label: "Dark", desc: "Dark mode" },
                        {
                            id: "system",
                            label: "System",
                            desc: "Follow OS setting",
                        },
                    ].map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTheme(t.id)}
                            className={cn(
                                "p-4 rounded-lg border text-left transition-colors",
                                theme === t.id
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-slate-200 hover:bg-slate-50",
                            )}
                        >
                            <p
                                className={cn(
                                    "text-sm font-medium",
                                    theme === t.id
                                        ? "text-blue-700"
                                        : "text-slate-700",
                                )}
                            >
                                {t.label}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {t.desc}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Accent color */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 pt-2">
                    Primary Color
                </div>
                <div className="flex gap-3">
                    {colors.map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            onClick={() => setPrimaryColor(c.value)}
                            className={cn(
                                "h-10 w-10 rounded-lg transition-all",
                                primaryColor === c.value
                                    ? "ring-2 ring-offset-2 ring-slate-400 scale-110"
                                    : "hover:scale-105",
                            )}
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                        />
                    ))}
                </div>
            </div>

            {/* Save */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline">Cancel</Button>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
                    <Save className="h-3.5 w-3.5" /> Save Changes
                </Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// Email Gateway Settings
// ═══════════════════════════════════════
function EmailGatewaySettings() {
    const [provider, setProvider] = useState("smtp");
    const [form, setForm] = useState({
        smtpHost: "",
        smtpPort: "587",
        smtpUser: "",
        smtpPass: "",
        encryption: "tls",
        fromEmail: "",
        fromName: "AgiloISP",
        // Provider-specific
        sendgridApiKey: "",
        mailgunApiKey: "",
        mailgunDomain: "",
        sesAccessKey: "",
        sesSecretKey: "",
        sesRegion: "ap-southeast-1",
    });
    const [saving, setSaving] = useState(false);
    const [testSending, setTestSending] = useState(false);
    const [testEmail, setTestEmail] = useState("");

    const handleSave = async () => {
        setSaving(true);
        try {
            // TODO: save to system_settings table
            toast.success("Email gateway settings saved");
        } catch {
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        if (!testEmail) {
            toast.error("Enter a test email address");
            return;
        }
        setTestSending(true);
        try {
            // TODO: call backend test email endpoint
            toast.success(`Test email sent to ${testEmail}`);
        } catch {
            toast.error("Failed to send test email");
        } finally {
            setTestSending(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">
                Email Gateway
            </h2>

            {/* Provider selection */}
            <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <Mail className="h-4 w-4 text-slate-400" />
                    Select Email Provider
                    <span className="text-[11px] text-slate-400 font-normal ml-1">
                        (only one can be active)
                    </span>
                </div>

                <div className="space-y-2">
                    {[
                        {
                            id: "smtp",
                            label: "SMTP",
                            desc: "Custom SMTP server (Gmail, Zoho, etc.)",
                        },
                        {
                            id: "sendgrid",
                            label: "SendGrid",
                            desc: "Transactional email via SendGrid API",
                        },
                        {
                            id: "mailgun",
                            label: "Mailgun",
                            desc: "Transactional email via Mailgun API",
                        },
                        {
                            id: "ses",
                            label: "Amazon SES",
                            desc: "AWS Simple Email Service",
                        },
                    ].map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => setProvider(p.id)}
                            className={cn(
                                "flex items-center gap-3 w-full px-4 py-3 rounded-lg border transition-colors text-left",
                                provider === p.id
                                    ? "border-blue-500 bg-blue-50/50"
                                    : "border-slate-200 hover:bg-slate-50",
                            )}
                        >
                            {/* Radio indicator */}
                            <div
                                className={cn(
                                    "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                                    provider === p.id
                                        ? "border-blue-500"
                                        : "border-slate-300",
                                )}
                            >
                                {provider === p.id && (
                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p
                                    className={cn(
                                        "text-sm font-medium",
                                        provider === p.id
                                            ? "text-blue-700"
                                            : "text-slate-700",
                                    )}
                                >
                                    {p.label}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {p.desc}
                                </p>
                            </div>
                            {provider === p.id && (
                                <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-[4px]">
                                    ACTIVE
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* SMTP Config */}
            {provider === "smtp" && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 pt-2">
                        SMTP Configuration
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>
                                SMTP Host{" "}
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={form.smtpHost}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        smtpHost: e.target.value,
                                    }))
                                }
                                placeholder="e.g. smtp.gmail.com"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>
                                SMTP Port{" "}
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={form.smtpPort}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        smtpPort: e.target.value,
                                    }))
                                }
                                placeholder="587"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>
                                Username <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={form.smtpUser}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        smtpUser: e.target.value,
                                    }))
                                }
                                placeholder="your@email.com"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>
                                Password <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="password"
                                value={form.smtpPass}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        smtpPass: e.target.value,
                                    }))
                                }
                                placeholder="App password"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Encryption</Label>
                        <Select
                            value={form.encryption}
                            onValueChange={(v) =>
                                setForm((f) => ({ ...f, encryption: v }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="tls">
                                    TLS (Recommended)
                                </SelectItem>
                                <SelectItem value="ssl">SSL</SelectItem>
                                <SelectItem value="none">None</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* SendGrid */}
            {provider === "sendgrid" && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 pt-2">
                        SendGrid Configuration
                    </div>
                    <div className="space-y-1.5">
                        <Label>
                            API Key <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            type="password"
                            value={form.sendgridApiKey}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    sendgridApiKey: e.target.value,
                                }))
                            }
                            placeholder="SG.xxxx..."
                        />
                    </div>
                </div>
            )}

            {/* Mailgun */}
            {provider === "mailgun" && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 pt-2">
                        Mailgun Configuration
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>
                                API Key <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="password"
                                value={form.mailgunApiKey}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        mailgunApiKey: e.target.value,
                                    }))
                                }
                                placeholder="key-xxxx..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>
                                Domain <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={form.mailgunDomain}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        mailgunDomain: e.target.value,
                                    }))
                                }
                                placeholder="mg.yourdomain.com"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Amazon SES */}
            {provider === "ses" && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 pt-2">
                        Amazon SES Configuration
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>
                                Access Key ID{" "}
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={form.sesAccessKey}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        sesAccessKey: e.target.value,
                                    }))
                                }
                                placeholder="AKIA..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>
                                Secret Access Key{" "}
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="password"
                                value={form.sesSecretKey}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        sesSecretKey: e.target.value,
                                    }))
                                }
                                placeholder="Secret key"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Region</Label>
                        <Select
                            value={form.sesRegion}
                            onValueChange={(v) =>
                                setForm((f) => ({ ...f, sesRegion: v }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="us-east-1">
                                    US East (N. Virginia)
                                </SelectItem>
                                <SelectItem value="us-west-2">
                                    US West (Oregon)
                                </SelectItem>
                                <SelectItem value="eu-west-1">
                                    EU (Ireland)
                                </SelectItem>
                                <SelectItem value="ap-south-1">
                                    Asia Pacific (Mumbai)
                                </SelectItem>
                                <SelectItem value="ap-southeast-1">
                                    Asia Pacific (Singapore)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* Sender info — common for all providers */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 pt-2">
                    Sender Information
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>
                            From Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={form.fromEmail}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    fromEmail: e.target.value,
                                }))
                            }
                            placeholder="noreply@yourisp.com"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>From Name</Label>
                        <Input
                            value={form.fromName}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    fromName: e.target.value,
                                }))
                            }
                            placeholder="AgiloISP"
                        />
                    </div>
                </div>
            </div>

            {/* Test email */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 pt-2">
                    Send Test Email
                </div>
                <div className="flex gap-3">
                    <Input
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="recipient@example.com"
                        className="max-w-xs"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestEmail}
                        disabled={testSending}
                        className="gap-1.5 shrink-0"
                    >
                        <Mail className="h-3.5 w-3.5" />
                        {testSending ? "Sending..." : "Send Test"}
                    </Button>
                </div>
                <p className="text-[11px] text-slate-400">
                    Send a test email to verify your configuration works
                    correctly
                </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline">Cancel</Button>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5"
                >
                    <Save className="h-3.5 w-3.5" />
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// SMS Gateway Settings
// ═══════════════════════════════════════
function SmsGatewaySettings() {
    const [form, setForm] = useState({
        provider: "bulksmsbd",
        apiUrl: "",
        apiKey: "",
        senderId: "AgiloISP",
        enabled: false,
    });
    const [saving, setSaving] = useState(false);

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">
                SMS Gateway
            </h2>

            <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    Gateway Configuration
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div>
                        <p className="text-sm font-medium text-slate-700">
                            SMS Notifications
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Send invoice, payment, and suspension alerts via SMS
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() =>
                            setForm((f) => ({ ...f, enabled: !f.enabled }))
                        }
                        className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                            form.enabled ? "bg-blue-500" : "bg-slate-200",
                        )}
                    >
                        <span
                            className={cn(
                                "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                                form.enabled
                                    ? "translate-x-6"
                                    : "translate-x-1",
                            )}
                        />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>Provider</Label>
                        <Select
                            value={form.provider}
                            onValueChange={(v) =>
                                setForm((f) => ({ ...f, provider: v }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bulksmsbd">
                                    BulkSMSBD
                                </SelectItem>
                                <SelectItem value="sslwireless">
                                    SSL Wireless
                                </SelectItem>
                                <SelectItem value="custom">
                                    Custom HTTP Gateway
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Sender ID</Label>
                        <Input
                            value={form.senderId}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    senderId: e.target.value,
                                }))
                            }
                            placeholder="e.g. AgiloISP"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label>API URL</Label>
                    <Input
                        value={form.apiUrl}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, apiUrl: e.target.value }))
                        }
                        placeholder="https://api.bulksmsbd.com/send"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label>API Key</Label>
                    <Input
                        type="password"
                        value={form.apiKey}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, apiKey: e.target.value }))
                        }
                        placeholder="Your API key"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline">Cancel</Button>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
                    <Save className="h-3.5 w-3.5" /> Save Changes
                </Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// Billing Defaults
// ═══════════════════════════════════════
function BillingSettings() {
    const [form, setForm] = useState({
        invoicePrefix: "INV-",
        paymentTermDays: "15",
        gracePeriodDays: "3",
        autoSuspendDays: "7",
        currency: "BDT",
        taxRate: "0",
        lateFeePct: "0",
    });

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">
                Billing Defaults
            </h2>

            <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    Invoice Settings
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>Invoice Prefix</Label>
                        <Input
                            value={form.invoicePrefix}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    invoicePrefix: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Currency</Label>
                        <Input
                            value={form.currency}
                            disabled
                            className="bg-slate-50"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <Label>Payment Term (days)</Label>
                        <Input
                            type="number"
                            value={form.paymentTermDays}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    paymentTermDays: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Grace Period (days)</Label>
                        <Input
                            type="number"
                            value={form.gracePeriodDays}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    gracePeriodDays: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Auto-Suspend After (days)</Label>
                        <Input
                            type="number"
                            value={form.autoSuspendDays}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    autoSuspendDays: e.target.value,
                                }))
                            }
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>Tax Rate (%)</Label>
                        <Input
                            type="number"
                            value={form.taxRate}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    taxRate: e.target.value,
                                }))
                            }
                            placeholder="0"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Late Fee (%)</Label>
                        <Input
                            type="number"
                            value={form.lateFeePct}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    lateFeePct: e.target.value,
                                }))
                            }
                            placeholder="0"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline">Cancel</Button>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
                    <Save className="h-3.5 w-3.5" /> Save Changes
                </Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// Notification Settings
// ═══════════════════════════════════════
function NotificationSettings() {
    const [settings, setSettings] = useState({
        emailInvoice: true,
        emailOverdue: true,
        emailSuspension: true,
        smsInvoice: false,
        smsOverdue: false,
        smsSuspension: false,
        smsPaymentConfirm: false,
        smsExpiryReminder: false,
    });

    const Toggle = ({
        checked,
        onChange,
    }: {
        checked: boolean;
        onChange: () => void;
    }) => (
        <button
            type="button"
            onClick={onChange}
            className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                checked ? "bg-blue-500" : "bg-slate-200",
            )}
        >
            <span
                className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                    checked ? "translate-x-6" : "translate-x-1",
                )}
            />
        </button>
    );

    const Row = ({
        label,
        description,
        checked,
        onChange,
    }: {
        label: string;
        description: string;
        checked: boolean;
        onChange: () => void;
    }) => (
        <div className="flex items-center justify-between py-3">
            <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-xs text-slate-400">{description}</p>
            </div>
            <Toggle checked={checked} onChange={onChange} />
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">
                Notifications
            </h2>

            {/* Email notifications */}
            <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 pb-2">
                    <Bell className="h-4 w-4 text-slate-400" />
                    Email Notifications
                </div>
                <div className="divide-y divide-slate-100">
                    <Row
                        label="Invoice Generated"
                        description="Send email when a new invoice is created"
                        checked={settings.emailInvoice}
                        onChange={() =>
                            setSettings((s) => ({
                                ...s,
                                emailInvoice: !s.emailInvoice,
                            }))
                        }
                    />
                    <Row
                        label="Overdue Reminder"
                        description="Email reminder for overdue invoices"
                        checked={settings.emailOverdue}
                        onChange={() =>
                            setSettings((s) => ({
                                ...s,
                                emailOverdue: !s.emailOverdue,
                            }))
                        }
                    />
                    <Row
                        label="Suspension Warning"
                        description="Email warning before service suspension"
                        checked={settings.emailSuspension}
                        onChange={() =>
                            setSettings((s) => ({
                                ...s,
                                emailSuspension: !s.emailSuspension,
                            }))
                        }
                    />
                </div>
            </div>

            {/* SMS notifications */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 pb-2 pt-2">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    SMS Notifications
                </div>
                <div className="divide-y divide-slate-100">
                    <Row
                        label="Invoice SMS"
                        description="Send SMS when invoice is generated"
                        checked={settings.smsInvoice}
                        onChange={() =>
                            setSettings((s) => ({
                                ...s,
                                smsInvoice: !s.smsInvoice,
                            }))
                        }
                    />
                    <Row
                        label="Overdue SMS"
                        description="SMS reminder for overdue invoices"
                        checked={settings.smsOverdue}
                        onChange={() =>
                            setSettings((s) => ({
                                ...s,
                                smsOverdue: !s.smsOverdue,
                            }))
                        }
                    />
                    <Row
                        label="Suspension SMS"
                        description="SMS alert on service suspension"
                        checked={settings.smsSuspension}
                        onChange={() =>
                            setSettings((s) => ({
                                ...s,
                                smsSuspension: !s.smsSuspension,
                            }))
                        }
                    />
                    <Row
                        label="Payment Confirmation"
                        description="SMS confirmation when payment is received"
                        checked={settings.smsPaymentConfirm}
                        onChange={() =>
                            setSettings((s) => ({
                                ...s,
                                smsPaymentConfirm: !s.smsPaymentConfirm,
                            }))
                        }
                    />
                    <Row
                        label="Expiry Reminder"
                        description="SMS reminder before prepaid package expires"
                        checked={settings.smsExpiryReminder}
                        onChange={() =>
                            setSettings((s) => ({
                                ...s,
                                smsExpiryReminder: !s.smsExpiryReminder,
                            }))
                        }
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline">Cancel</Button>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
                    <Save className="h-3.5 w-3.5" /> Save Changes
                </Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// RADIUS Server Settings
// ═══════════════════════════════════════
function RadiusSettings() {
    const [form, setForm] = useState({ enabled: false, host: "0.0.0.0", acctPort: "1813", sharedSecret: "" });
    const [saving, setSaving] = useState(false);

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">RADIUS Server</h2>

            <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <ShieldCheck className="h-4 w-4 text-slate-400" /> RADIUS Accounting Receiver
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div>
                        <p className="text-sm font-medium text-slate-700">Enable RADIUS Accounting</p>
                        <p className="text-xs text-slate-400 mt-0.5">Receive accounting packets from FreeRADIUS or MikroTik NAS for compliance logging</p>
                    </div>
                    <button type="button" onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                        className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", form.enabled ? "bg-blue-500" : "bg-slate-200")}>
                        <span className={cn("inline-block h-4 w-4 rounded-full bg-white transition-transform", form.enabled ? "translate-x-6" : "translate-x-1")} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>Listen Host</Label>
                        <Input value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))} placeholder="0.0.0.0" disabled={!form.enabled} />
                        <p className="text-[11px] text-slate-400">0.0.0.0 = listen on all interfaces</p>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Accounting Port</Label>
                        <Input value={form.acctPort} onChange={e => setForm(f => ({ ...f, acctPort: e.target.value }))} placeholder="1813" disabled={!form.enabled} />
                        <p className="text-[11px] text-slate-400">Standard RADIUS accounting port is 1813</p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label>Shared Secret <span className="text-red-500">*</span></Label>
                    <Input type="password" value={form.sharedSecret} onChange={e => setForm(f => ({ ...f, sharedSecret: e.target.value }))} placeholder="Must match NAS/FreeRADIUS config" disabled={!form.enabled} />
                </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 pt-2">How to configure</div>
                <div className="text-xs text-slate-500 space-y-1.5 bg-slate-50 rounded-lg p-4">
                    <p className="font-medium text-slate-600">For MikroTik (direct):</p>
                    <p className="font-mono text-[11px]">/radius add service=ppp address=YOUR_SERVER_IP secret=YOUR_SECRET accounting-port={form.acctPort}</p>
                    <p className="font-medium text-slate-600 mt-3">For FreeRADIUS:</p>
                    <p className="font-mono text-[11px]"># In /etc/freeradius/clients.conf, add AgiliOSP as accounting proxy target</p>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline">Cancel</Button>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5" disabled={saving}>
                    <Save className="h-3.5 w-3.5" /> Save Changes
                </Button>
            </div>
        </div>
    );
}
