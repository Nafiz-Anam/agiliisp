"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { toast } from "sonner";

export default function MyProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ phone: "", email: "", address: "", city: "", state: "", zipCode: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    api.get("/customer-portal/profile")
      .then(res => {
        const p = res.data.data.profile;
        setProfile(p);
        setForm({ phone: p.phone || "", email: p.email || "", address: p.address || "", city: p.city || "", state: p.state || "", zipCode: p.zipCode || "" });
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch("/customer-portal/profile", form);
      toast.success("Profile updated!");
    } catch { toast.error("Failed to update profile"); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error("Passwords don't match"); return; }
    if (pwForm.newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setChangingPw(true);
    try {
      await api.post("/customer-portal/profile/change-password", { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success("Password changed!");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e: any) { toast.error(e.response?.data?.error?.message || "Failed to change password"); }
    finally { setChangingPw(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  if (!profile) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your contact information and password</p>
      </div>

      {/* Account Info (read-only) */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Account Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-slate-400">Full Name</p><p className="font-medium text-slate-700">{profile.fullName}</p></div>
            <div><p className="text-xs text-slate-400">Username</p><p className="font-medium text-slate-700">{profile.username}</p></div>
            <div><p className="text-xs text-slate-400">Status</p><p className="font-medium text-slate-700">{profile.status}</p></div>
            <div><p className="text-xs text-slate-400">Package</p><p className="font-medium text-slate-700">{profile.package?.name || "—"}</p></div>
            <div><p className="text-xs text-slate-400">Billing Cycle</p><p className="font-medium text-slate-700">{profile.billingCycle || "—"} days</p></div>
            <div><p className="text-xs text-slate-400">Country</p><p className="font-medium text-slate-700">{profile.country || "—"}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Contact Info */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Contact Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><Label>State</Label><Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} /></div>
            <div><Label>Zip Code</Label><Input value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} /></div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="mt-4 bg-blue-500 hover:bg-blue-600 text-white">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Change Password</h3>
          <div className="space-y-3 max-w-sm">
            <div><Label>Current Password</Label><Input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} /></div>
            <div><Label>New Password</Label><Input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} /></div>
            <div><Label>Confirm New Password</Label><Input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} /></div>
          </div>
          <Button onClick={handleChangePassword} disabled={changingPw} variant="outline" className="mt-4">
            {changingPw ? "Changing..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
