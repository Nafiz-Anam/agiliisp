"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Edit2, Trash2, ChevronRight, MapPin, Users, FolderTree } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"; // used for Parent Zone
import { Combobox } from "@/components/ui/combobox";
import type { ComboboxOption } from "@/components/ui/combobox";
import api from "@/lib/api";
import { toast } from "sonner";

const BD_API = process.env.NEXT_PUBLIC_BD_LOCATIONS_API || "http://localhost:4100";

const EMPTY_FORM = { name: "", parentId: "", division: "", district: "", upazila: "", area: "", description: "", coverage: "" };

export default function ZonesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "tree">("tree");

  // Location data from BD Locations API
  const [divisionList, setDivisionList] = useState<string[]>([]);
  const [districtList, setDistrictList] = useState<string[]>([]);
  const [thanaList, setThanaList] = useState<{ name: string; type: string; areas: string[] }[]>([]);
  const [areaList, setAreaList] = useState<string[]>([]);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, treeRes] = await Promise.all([
        api.get("/isp/zones"),
        api.get("/isp/zones/tree"),
      ]);
      setZones(listRes.data.data.zones || []);
      setTree(treeRes.data.data.tree || []);
    } catch { toast.error("Failed to load zones"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  // Fetch divisions on mount
  useEffect(() => {
    fetch(`${BD_API}/api/divisions`).then(r => r.json()).then(d => {
      setDivisionList((d.data || []).map((x: any) => x.name));
    }).catch(() => {});
  }, []);

  // Fetch districts when division changes
  useEffect(() => {
    if (!form.division) { setDistrictList([]); return; }
    fetch(`${BD_API}/api/divisions/${encodeURIComponent(form.division)}`).then(r => r.json()).then(d => {
      setDistrictList(d.data?.districts || []);
    }).catch(() => setDistrictList([]));
  }, [form.division]);

  // Fetch thanas when district changes
  useEffect(() => {
    if (!form.district) { setThanaList([]); setAreaList([]); return; }
    fetch(`${BD_API}/api/districts/${encodeURIComponent(form.district)}`).then(r => r.json()).then(d => {
      setThanaList(d.data?.thanas || []);
    }).catch(() => setThanaList([]));
  }, [form.district]);

  // Update area list when thana changes
  useEffect(() => {
    if (!form.upazila) { setAreaList([]); return; }
    const thana = thanaList.find(t => t.name === form.upazila);
    setAreaList(thana?.areas || []);
  }, [form.upazila, thanaList]);

  // Build combobox options
  const divisionOptions: ComboboxOption[] = useMemo(() => divisionList.map(d => ({ value: d, label: d })), [divisionList]);
  const districtOptions: ComboboxOption[] = useMemo(() => districtList.map(d => ({ value: d, label: d })), [districtList]);
  const thanaOptions: ComboboxOption[] = useMemo(() => thanaList.map(t => ({
    value: t.name, label: t.name, group: t.type === "metro" ? "City / Metro Thanas" : "Upazilas",
  })), [thanaList]);
  const areaOptions: ComboboxOption[] = useMemo(() => areaList.map(a => ({ value: a, label: a })), [areaList]);

  // Auto-generate zone name
  const autoName = useMemo(() => {
    const parts = [form.area, form.upazila, form.district].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "";
  }, [form.area, form.district, form.upazila]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Zone name is required"); return; }
    if (!form.division) { toast.error("Please select a division"); return; }
    setSaving(true);
    try {
      const body = { ...form, parentId: form.parentId || null };
      if (editId) { await api.patch(`/isp/zones/${editId}`, body); toast.success("Zone updated"); }
      else { await api.post("/isp/zones", body); toast.success("Zone created"); }
      setShowForm(false); setEditId(null); setForm(EMPTY_FORM);
      fetchZones();
    } catch (e: any) { toast.error(e.response?.data?.error?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await api.delete(`/isp/zones/${id}`); toast.success("Zone deleted"); fetchZones(); }
    catch (e: any) { toast.error(e.response?.data?.error?.message || "Failed to delete"); }
  };

  const openEdit = (z: any) => {
    setForm({
      name: z.name, parentId: z.parentId || "",
      division: z.division || "", district: z.district || "", upazila: z.upazila || "",
      area: z.area || "", description: z.description || "", coverage: z.coverage || "",
    });
    setEditId(z.id); setShowForm(true);
  };

  const openCreate = (parentId?: string) => {
    setForm({ ...EMPTY_FORM, parentId: parentId || "" });
    setEditId(null); setShowForm(true);
  };

  const parentOptions = zones.filter(z => z.id !== editId);

  const locationLabel = (z: any) => {
    const parts = [z.area, z.upazila, z.district, z.division].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const ZoneNode = ({ zone, depth = 0 }: { zone: any; depth?: number }) => (
    <div>
      <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors" style={{ paddingLeft: `${12 + depth * 24}px` }}>
        <div className="flex items-center gap-2 min-w-0">
          {zone.children?.length > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
          {zone.children?.length === 0 && <div className="w-3.5 shrink-0" />}
          <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="font-medium text-slate-700 text-sm">{zone.name}</span>
          {locationLabel(zone) && <Badge className="text-[10px] bg-slate-100 text-slate-500 font-normal ml-1">{locationLabel(zone)}</Badge>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 text-xs text-slate-400"><Users className="h-3 w-3" /> {zone._count?.customers || 0}</div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCreate(zone.id)} title="Add sub-zone"><Plus className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(zone)}><Edit2 className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(zone.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
      {zone.children?.map((child: any) => <ZoneNode key={child.id} zone={child} depth={depth + 1} />)}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Zone Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Organize service areas by division, district, thana, and area</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => setViewMode(v => v === "tree" ? "list" : "tree")}>
            <FolderTree className="h-3.5 w-3.5" /> {viewMode === "tree" ? "List View" : "Tree View"}
          </Button>
          <Button onClick={() => openCreate()} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 text-sm h-9">
            <Plus className="h-4 w-4" /> Add Zone
          </Button>
        </div>
      </div>

      {/* Zone List / Tree */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
          ) : viewMode === "tree" ? (
            tree.length > 0 ? (
              <div className="space-y-0.5">{tree.map(z => <ZoneNode key={z.id} zone={z} />)}</div>
            ) : <p className="text-center text-slate-400 py-12">No zones created yet</p>
          ) : (
            <div className="space-y-2">
              {zones.map(z => (
                <div key={z.id} className="flex items-center justify-between py-2 px-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-slate-700 text-sm">{z.name}</span>
                    {z.parent && <span className="text-xs text-slate-400">in {z.parent.name}</span>}
                    {locationLabel(z) && <Badge className="text-[10px] bg-blue-50 text-blue-600 font-normal">{locationLabel(z)}</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="text-[10px] bg-blue-50 text-blue-600">{z._count?.customers || 0} customers</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(z)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(z.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
              {zones.length === 0 && <p className="text-center text-slate-400 py-12">No zones created yet</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create / Edit Zone Dialog ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Zone" : "Create Zone"}</DialogTitle>
            <DialogDescription>Select location from the dropdowns below to define the zone.</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {/* Location selectors — 2-column grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Division</Label>
                <Combobox
                  value={form.division}
                  onValueChange={v => setForm(f => ({ ...f, division: v, district: "", upazila: "", area: "" }))}
                  options={divisionOptions}
                  placeholder="Select division"
                  searchPlaceholder="Search division..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>District</Label>
                <Combobox
                  value={form.district}
                  onValueChange={v => setForm(f => ({ ...f, district: v, upazila: "", area: "" }))}
                  options={districtOptions}
                  placeholder={form.division ? "Select district" : "Select division first"}
                  searchPlaceholder="Search district..."
                  disabled={!form.division}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Thana / Upazila</Label>
                <Combobox
                  value={form.upazila}
                  onValueChange={v => setForm(f => ({ ...f, upazila: v, area: "" }))}
                  options={thanaOptions}
                  placeholder={form.district ? "Search thana..." : "Select district first"}
                  searchPlaceholder="Search thana or upazila..."
                  disabled={!form.district}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Area / Locality</Label>
                {areaOptions.length > 0 ? (
                  <Combobox
                    value={form.area}
                    onValueChange={v => setForm(f => ({ ...f, area: v }))}
                    options={areaOptions}
                    placeholder="Search area..."
                    searchPlaceholder="Search area..."
                    disabled={!form.upazila}
                  />
                ) : (
                  <Input
                    value={form.area}
                    onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                    placeholder={form.upazila ? "Type area name" : "Select thana first"}
                    disabled={!form.upazila}
                  />
                )}
              </div>
            </div>

            {/* Zone name */}
            <div className="space-y-1.5">
              <Label>Zone Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={autoName || "e.g. Khalishpur, Khulna"}
              />
              {autoName && !form.name && (
                <button type="button" className="text-xs text-blue-500 hover:underline" onClick={() => setForm(f => ({ ...f, name: autoName }))}>
                  Use suggested: {autoName}
                </button>
              )}
            </div>

            {/* Parent zone */}
            <div className="space-y-1.5">
              <Label>Parent Zone</Label>
              <Select value={form.parentId} onValueChange={v => setForm(f => ({ ...f, parentId: v }))}>
                <SelectTrigger><SelectValue placeholder="No parent (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No parent (top-level)</SelectItem>
                  {parentOptions.map(z => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.parent ? `${z.parent.name} > ` : ""}{z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes about this zone" rows={2} />
            </div>

            {/* Coverage Area — full width, at the end */}
            <div className="space-y-1.5">
              <Label>Coverage Area</Label>
              <Textarea value={form.coverage} onChange={e => setForm(f => ({ ...f, coverage: e.target.value }))} placeholder="e.g. Block A-F, Road 1-15&#10;Ward 1-5, Moholla list..." rows={4} className="min-h-[100px]" />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-500 hover:bg-blue-600 text-white">
              {saving ? "Saving..." : editId ? "Update Zone" : "Create Zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
