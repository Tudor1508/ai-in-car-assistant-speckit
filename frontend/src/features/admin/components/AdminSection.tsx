"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import { createAdminProducer, deactivateAdminUser, listAdmin, type Query } from "../adminApi";
import { adminDataLoaded, adminRequestFailed, adminRequestStarted, type AdminRow } from "../adminSlice";

type Section = "users" | "vehicles" | "producers";
const titles: Record<Section, string> = { users: "Users", vehicles: "Vehicles", producers: "Producers" };
const descriptions: Record<Section, string> = { users: "Review and manage user accounts.", vehicles: "Browse vehicles registered in the app.", producers: "Review producer accounts and add new producers." };
const columns: Record<Section, string[]> = { users: ["name", "email", "status", "created_at"], vehicles: ["name", "model", "type", "year", "range_km", "mileage_km", "fuel_type", "created_at"], producers: ["name", "brand", "email", "status", "created_at"] };
const labels: Record<string, string> = { name: "Name", email: "Email", status: "Status", created_at: "Created", brand: "Brand", model: "Model", type: "Type", year: "Year", range_km: "Range (km)", mileage_km: "Mileage (km)", fuel_type: "Fuel type" };
const filterLabels: Record<string, string> = { name: "Name", email: "Email", brand: "Brand", model: "Model", status: "Status", type: "Type", fuel_type: "Fuel type", created_from: "Created after", created_to: "Created before", year_from: "Minimum year", year_to: "Maximum year", range_km_from: "Minimum range (km)", range_km_to: "Maximum range (km)", mileage_km_from: "Minimum mileage (km)", mileage_km_to: "Maximum mileage (km)" };

function statisticEntries(stats: Record<string, unknown>): Array<[string, number]> {
  const entries: Array<[string, number]> = [];
  if (typeof stats.total === "number") entries.push(["Total", stats.total]);
  for (const key of ["by_status", "by_type"]) {
    const group = stats[key];
    if (group && typeof group === "object" && !Array.isArray(group)) Object.entries(group).forEach(([label, count]) => { if (typeof count === "number") entries.push([label === "active" ? "Active" : label === "disabled" ? "Disabled" : label === "combustion" ? "Combustion" : label === "electric" ? "Electric" : label, count]); });
  }
  if (Array.isArray(stats.by_brand)) stats.by_brand.forEach((item) => { if (item && typeof item === "object" && "count" in item && typeof item.count === "number") entries.push([typeof item.brand === "string" ? item.brand : "No brand", item.count]); });
  return entries;
}
function showValue(key: string, value: unknown) {
  if (value == null || value === "") return "—";
  if (key === "created_at" && typeof value === "string") { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date); }
  return String(value);
}

export function AdminSection({ section }: { section: Section }) {
  const dispatch = useDispatch<AppDispatch>();
  const sectionState = useSelector((state: RootState) => state.admin.sections[section]);
  const [query, setQuery] = useState<Query>({ page: 1, page_size: 25, sort_by: "created_at", sort_order: "desc" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [target, setTarget] = useState<AdminRow | null>(null);
  const [producerOpen, setProducerOpen] = useState(false);
  const [form, setForm] = useState({ name: "", brand: "", email: "", password: "" });
  const load = useCallback(async () => {
    dispatch(adminRequestStarted(section));
    try {
      const result = await listAdmin<AdminRow>(section, query);
      dispatch(adminDataLoaded({ section, items: (result[section] as AdminRow[]) ?? [], stats: result.stats, pagination: result.pagination }));
    } catch { dispatch(adminRequestFailed({ section, error: "The data could not be loaded. Please try again." })); }
  }, [dispatch, query, section]);
  useEffect(() => { void load(); }, [load]);
  function changeQuery(key: string, value: string | number) { setQuery((current) => ({ ...current, [key]: value, page: key === "page" ? Number(value) : 1 })); }
  async function confirmDeactivate() {
    if (!target) return;
    try { await deactivateAdminUser(String(target.id)); setNotice("The user has been deactivated."); setTarget(null); setQuery((current) => ({ ...current, page: 1 })); }
    catch { dispatch(adminRequestFailed({ section, error: "The user could not be deactivated." })); }
  }
  async function submitProducer(event: React.FormEvent) {
    event.preventDefault(); setNotice("");
    try { await createAdminProducer(form); setForm({ name: "", brand: "", email: "", password: "" }); setProducerOpen(false); setNotice("The producer was added and can now sign in with the email and password provided."); setQuery((current) => ({ ...current, page: 1 })); }
    catch { dispatch(adminRequestFailed({ section, error: "The producer could not be added. Check the details and whether the email is already in use." })); }
  }
  const queryFields = section === "users" ? ["name", "email", "status", "created_from", "created_to"] : section === "vehicles" ? ["name", "model", "year_from", "year_to", "type", "range_km_from", "range_km_to", "mileage_km_from", "mileage_km_to", "fuel_type"] : ["name", "email", "brand", "status", "created_from", "created_to"];
  const sortFields = section === "users" ? ["name", "email", "created_at"] : section === "vehicles" ? ["name", "model", "type", "year", "range_km", "mileage_km", "fuel_type", "created_at"] : ["name", "brand", "email", "created_at"];
  const activeFilters = queryFields.filter((field) => query[field] !== undefined && query[field] !== "").length;
  const colSpan = columns[section].length + (section === "users" ? 1 : 0);
  return <Box sx={{ minHeight: "calc(100vh - 70px)", bgcolor: "background.default", color: "text.primary", px: { xs: 2, sm: 3, lg: 5 }, py: { xs: 3, md: 5 } }}><Box sx={{ maxWidth: 1320, mx: "auto" }}>
    <Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", gap: 2, mb: 3 }}><Box><Typography variant="h4" sx={{ fontWeight: 750, letterSpacing: "-.03em" }}>{titles[section]}</Typography><Typography color="text.secondary" sx={{ mt: .5 }}>{descriptions[section]}</Typography></Box>{section === "producers" && <Button variant="contained" size="large" onClick={() => setProducerOpen(true)} sx={{ borderRadius: 2, px: 2.5, boxShadow: "none" }}>＋ Add producer</Button>}</Stack>
    {notice && <Alert severity="success" onClose={() => setNotice("")} sx={{ mb: 2, borderRadius: 2 }}>{notice}</Alert>}
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5, mb: 3 }}>{statisticEntries(sectionState.stats).map(([label, value]) => <Card key={label} elevation={0} sx={{ minWidth: 150, flex: "0 1 185px", border: 1, borderColor: "divider", borderRadius: 3 }}><CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="h5" sx={{ mt: .5, fontWeight: 700 }}>{value}</Typography></CardContent></Card>)}</Stack>
    <Card elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3, mb: 2 }}><CardContent sx={{ p: { xs: 2, md: 2.5 } }}><Stack direction={{ xs: "column", md: "row" }} sx={{ alignItems: { md: "center" }, justifyContent: "space-between", gap: 1.5 }}><Box><Typography variant="subtitle1" sx={{ fontWeight: 650 }}>Records</Typography><Typography variant="body2" color="text.secondary">Search, filter, and sort this section.</Typography></Box><Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}><Button variant="outlined" onClick={() => setFiltersOpen((open) => !open)} sx={{ borderRadius: 2 }}>{filtersOpen ? "Hide filters" : "Filters"}{activeFilters > 0 ? ` · ${activeFilters}` : ""}</Button><TextField select size="small" label="Sort by" value={query.sort_by} onChange={(e) => changeQuery("sort_by", e.target.value)} sx={{ minWidth: 155 }}>{sortFields.map((field) => <MenuItem key={field} value={field}>{labels[field] ?? field}</MenuItem>)}</TextField><TextField select size="small" label="Order" value={query.sort_order} onChange={(e) => changeQuery("sort_order", e.target.value)} sx={{ minWidth: 140 }}><MenuItem value="asc">Ascending</MenuItem><MenuItem value="desc">Descending</MenuItem></TextField></Stack></Stack>
      <Collapse in={filtersOpen}><Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>{queryFields.map((field) => <TextField key={field} select={field === "status" || field === "type" || field === "fuel_type"} type={field.includes("created_") ? "date" : /(_from|_to)$/.test(field) ? "number" : "text"} size="small" label={filterLabels[field] ?? field} value={query[field] ?? ""} onChange={(e) => changeQuery(field, e.target.value)} slotProps={field.includes("created_") ? { inputLabel: { shrink: true } } : undefined}>{field === "status" ? ["active", "disabled"].map((value) => <MenuItem key={value} value={value}>{value === "active" ? "Active" : "Disabled"}</MenuItem>) : field === "type" ? ["combustion", "electric"].map((value) => <MenuItem key={value} value={value}>{value === "electric" ? "Electric" : "Combustion"}</MenuItem>) : field === "fuel_type" ? ["petrol", "diesel", "lpg", "cng", "other"].map((value) => <MenuItem key={value} value={value}>{value === "other" ? "Other" : value.toUpperCase()}</MenuItem>) : null}</TextField>)}</Box><Button sx={{ mt: 1 }} onClick={() => setQuery({ page: 1, page_size: 25, sort_by: "created_at", sort_order: "desc" })}>Clear filters</Button></Box></Collapse>
    </CardContent></Card>
    {sectionState.error && <Alert severity="error" action={<Button color="inherit" onClick={() => void load()}>Retry</Button>} sx={{ mb: 2, borderRadius: 2 }}>{sectionState.error}</Alert>}
    <Card elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3, overflow: "hidden" }}><TableContainer sx={{ maxHeight: 620, overflowX: "auto" }}><Table aria-label={`${titles[section]} table`} stickyHeader sx={{ minWidth: section === "vehicles" ? 1050 : 760 }}><TableHead><TableRow>{columns[section].map((column) => <TableCell key={column} sx={{ bgcolor: "background.paper", color: "text.secondary", fontWeight: 650, whiteSpace: "nowrap" }}>{labels[column] ?? column}</TableCell>)}{section === "users" && <TableCell sx={{ bgcolor: "background.paper", color: "text.secondary", fontWeight: 650 }}>Actions</TableCell>}</TableRow></TableHead><TableBody>{sectionState.status === "loading" && <TableRow><TableCell colSpan={colSpan} role="status" sx={{ py: 5, textAlign: "center", color: "text.secondary" }}>Loading records…</TableCell></TableRow>}{sectionState.status !== "loading" && sectionState.items.map((row) => <TableRow hover key={String(row.id)}>{columns[section].map((column) => <TableCell key={column} sx={{ whiteSpace: column === "created_at" ? "nowrap" : "normal" }}>{column === "status" ? <Chip size="small" label={row[column] === "active" ? "Active" : "Disabled"} color={row[column] === "active" ? "success" : "default"} /> : showValue(column, row[column])}</TableCell>)}{section === "users" && <TableCell><Button color="error" size="small" onClick={() => setTarget(row)}>Deactivate</Button></TableCell>}</TableRow>)}{sectionState.status !== "loading" && !sectionState.items.length && <TableRow><TableCell colSpan={colSpan} sx={{ py: 6, textAlign: "center" }}><Typography sx={{ fontWeight: 600 }}>No records found</Typography><Typography variant="body2" color="text.secondary">{activeFilters ? "Try changing or clearing your filters." : "Records will appear here when available."}</Typography></TableCell></TableRow>}</TableBody></Table></TableContainer>
      <Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, px: 2, py: 1.5, borderTop: 1, borderColor: "divider" }}><Typography variant="body2" color="text.secondary">Page {sectionState.pagination.page} of {Math.max(1, sectionState.pagination.total_pages)} · {sectionState.pagination.total} results</Typography><Stack direction="row" sx={{ alignItems: "center", gap: 1 }}><TextField select size="small" label="Rows per page" value={query.page_size} onChange={(e) => changeQuery("page_size", Number(e.target.value))} sx={{ width: 130 }}>{[10, 25, 50].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}</TextField><Button disabled={sectionState.pagination.page <= 1 || sectionState.status === "loading"} onClick={() => changeQuery("page", sectionState.pagination.page - 1)}>Previous</Button><Button disabled={sectionState.pagination.page >= sectionState.pagination.total_pages || sectionState.status === "loading"} onClick={() => changeQuery("page", sectionState.pagination.page + 1)}>Next</Button></Stack></Stack>
    </Card>
    <Dialog open={producerOpen} onClose={() => setProducerOpen(false)} fullWidth maxWidth="sm"><Box component="form" onSubmit={(event) => void submitProducer(event)}><DialogTitle sx={{ pb: 1 }}>Add producer</DialogTitle><DialogContent><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Add the producer profile and sign-in details. The email and password will be used to sign in.</Typography><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Name" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><TextField label="Brand" required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /><TextField label="Email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><TextField label="Password" type="password" required autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Stack></DialogContent><DialogActions sx={{ px: 3, pb: 2.5 }}><Button onClick={() => setProducerOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Save producer</Button></DialogActions></Box></Dialog>
    <Dialog open={!!target} onClose={() => setTarget(null)}><DialogTitle>Deactivate this user?</DialogTitle><DialogContent>Account {target?.email} will be deactivated and active sessions will be closed.</DialogContent><DialogActions><Button onClick={() => setTarget(null)}>Cancel</Button><Button color="error" onClick={() => void confirmDeactivate()}>Confirm</Button></DialogActions></Dialog>
  </Box></Box>;
}
