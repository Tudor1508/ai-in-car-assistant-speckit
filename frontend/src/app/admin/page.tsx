"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Box, Button, Card, CardContent, LinearProgress, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import { listAdmin, type Query } from "@/features/admin/adminApi";
import { adminDataLoaded, adminRequestFailed, adminRequestStarted, type AdminRow } from "@/features/admin/adminSlice";

type SectionKey = "users" | "vehicles" | "producers";
type ChartItem = { label: string; value: number; color: string };

const sections: Array<{ key: SectionKey; title: string; description: string }> = [
  { key: "users", title: "Users", description: "Review and manage user accounts." },
  { key: "vehicles", title: "Vehicles", description: "Browse vehicles registered in the app." },
  { key: "producers", title: "Producers", description: "Review producer accounts and add new producers." },
];
const query: Query = { page: 1, page_size: 1, sort_by: "created_at", sort_order: "desc" };

function DonutChart({ title, data }: { title: string; data: ChartItem[] }) {
  const theme = useTheme();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: "center", justifyContent: "center", gap: { xs: 2, sm: 4 }, py: 1 }}>
    <Box role="img" aria-label={`${title}: ${data.map(({ label, value }) => `${label}, ${value}`).join("; ")}`} sx={{ position: "relative", width: 176, height: 176, flex: "0 0 auto" }}>
      <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" stroke={theme.palette.divider} strokeWidth="14" />
        {total > 0 && data.filter((item) => item.value > 0).map((item) => {
          const length = item.value / total * circumference;
          const currentOffset = offset;
          offset += length;
          return <circle key={item.label} cx="60" cy="60" r={radius} fill="none" stroke={item.color} strokeWidth="14" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-currentOffset} transform="rotate(-90 60 60)"><title>{`${item.label}: ${item.value}`}</title></circle>;
        })}
      </svg>
      <Stack sx={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}><Typography variant="h4" sx={{ fontWeight: 750 }}>{total}</Typography><Typography variant="caption" color="text.secondary">Total</Typography></Stack>
    </Box>
    <Stack spacing={1.5} sx={{ minWidth: { sm: 170 } }}>{data.map((item) => <Stack key={item.label} direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 2 }}><Stack direction="row" sx={{ alignItems: "center", gap: 1 }}><Box aria-hidden="true" sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: item.color }} /><Typography variant="body2" color="text.secondary">{item.label}</Typography></Stack><Typography variant="body2" sx={{ fontWeight: 700 }}>{item.value}</Typography></Stack>)}</Stack>
  </Stack>;
}

function BrandChart({ brands, loading }: { brands: unknown; loading: boolean }) {
  const theme = useTheme();
  const rows = useMemo(() => {
    if (!Array.isArray(brands)) return [];
    return brands.map((item) => ({
      label: item && typeof item === "object" && typeof item.brand === "string" && item.brand.trim() ? item.brand : "No brand",
      value: item && typeof item === "object" && typeof item.count === "number" ? item.count : 0,
    })).sort((a, b) => b.value - a.value);
  }, [brands]);
  const shown = rows.slice(0, 7);
  const remaining = rows.slice(7).reduce((sum, item) => sum + item.value, 0);
  if (loading) return <Typography role="status" color="text.secondary">Loading producer statistics…</Typography>;
  if (!rows.length) return <Typography color="text.secondary">No producer brand data is available yet.</Typography>;
  const max = Math.max(1, remaining, ...shown.map((item) => item.value));
  return <Stack spacing={1.75} sx={{ mt: 1 }}>
    {shown.map((item) => <Stack key={item.label} direction="row" sx={{ alignItems: "center", gap: 2 }}><Typography variant="body2" sx={{ width: { xs: 105, sm: 150 }, flex: "0 0 auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.label}>{item.label}</Typography><LinearProgress variant="determinate" value={item.value / max * 100} aria-label={`${item.label}: ${item.value} producers`} sx={{ flex: 1, height: 10, borderRadius: 5, bgcolor: "action.hover", "& .MuiLinearProgress-bar": { borderRadius: 5 } }} /><Typography variant="body2" sx={{ width: 32, textAlign: "right", fontWeight: 700 }}>{item.value}</Typography></Stack>)}
    {remaining > 0 && <Stack direction="row" sx={{ alignItems: "center", gap: 2 }}><Typography variant="body2" color="text.secondary" sx={{ width: { xs: 105, sm: 150 }, flex: "0 0 auto" }}>Other brands</Typography><LinearProgress variant="determinate" value={remaining / max * 100} sx={{ flex: 1, height: 10, borderRadius: 5, bgcolor: "action.hover", "& .MuiLinearProgress-bar": { borderRadius: 5, bgcolor: theme.palette.secondary.main } }} /><Typography variant="body2" sx={{ width: 32, textAlign: "right", fontWeight: 700 }}>{remaining}</Typography></Stack>}
  </Stack>;
}

export default function AdminOverviewPage() {
  const dispatch = useDispatch<AppDispatch>();
  const stats = useSelector((state: RootState) => state.admin.sections);
  const theme = useTheme();
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  useEffect(() => {
    let active = true;
    sections.forEach(({ key }) => dispatch(adminRequestStarted(key)));
    Promise.all(sections.map(async ({ key }) => ({ key, result: await listAdmin<AdminRow>(key, query) })))
      .then((values) => {
        if (!active) return;
        values.forEach(({ key, result }) => dispatch(adminDataLoaded({ section: key, items: (result[key] as AdminRow[]) ?? [], stats: result.stats, pagination: result.pagination })));
      })
      .catch(() => {
        if (!active) return;
        sections.forEach(({ key }) => dispatch(adminRequestFailed({ section: key, error: "Overview data could not be loaded." })));
        setError("Overview data could not be loaded. Please try again.");
      });
    return () => { active = false; };
  }, [dispatch, reloadVersion]);

  const userStatus = stats.users.stats.by_status as Record<string, number> | undefined;
  const vehicleTypes = stats.vehicles.stats.by_type as Record<string, number> | undefined;
  const userChart: ChartItem[] = [
    { label: "Active", value: userStatus?.active ?? 0, color: theme.palette.success.main },
    { label: "Disabled", value: userStatus?.disabled ?? 0, color: theme.palette.warning.main },
  ];
  const vehicleChart: ChartItem[] = [
    { label: "Combustion", value: vehicleTypes?.combustion ?? 0, color: theme.palette.primary.main },
    { label: "Electric", value: vehicleTypes?.electric ?? 0, color: theme.palette.secondary.main },
  ];

  return <Box sx={{ minHeight: "calc(100vh - 72px)", px: { xs: 2, sm: 3, lg: 5 }, py: { xs: 4, md: 6 } }}><Box sx={{ maxWidth: 1180, mx: "auto" }}>
    <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: ".12em" }}>ADMINISTRATION</Typography>
    <Typography variant="h3" sx={{ mt: .5, fontWeight: 750, letterSpacing: "-.04em" }}>Overview</Typography>
    <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>A summary of users, vehicles, and producers.</Typography>
    {error && <Alert severity="error" action={<Button color="inherit" onClick={() => { setError(""); setReloadVersion((value) => value + 1); }}>Retry</Button>} sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
      {sections.map(({ key, title, description }) => {
        const section = stats[key];
        const total = section.stats.total;
        const loading = section.status === "loading";
        return <Card key={key} elevation={0} sx={{ display: "flex", border: 1, borderColor: "divider", borderRadius: 3, minHeight: 210 }}><CardContent sx={{ p: 3, display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1 }}>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Typography variant="h3" sx={{ my: 1.5, fontWeight: 750 }}>{loading ? "…" : typeof total === "number" ? total : "—"}</Typography>
          <Typography variant="body2" color="text.secondary">{description}</Typography>
          <Button component={Link} href={`/admin/${key}`} sx={{ mt: "auto", pt: 2, px: 0 }}>Open {title.toLowerCase()} →</Button>
        </CardContent></Card>;
      })}
    </Box>

    <Typography variant="h5" sx={{ mt: 5, mb: 2, fontWeight: 700 }}>Data insights</Typography>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
      <Card elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}><CardContent sx={{ p: { xs: 2, sm: 3 } }}><Typography variant="h6" sx={{ fontWeight: 700 }}>User account status</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Active and disabled accounts</Typography>{stats.users.status === "loading" ? <Typography role="status" color="text.secondary">Loading user statistics…</Typography> : <DonutChart title="User account status" data={userChart} />}</CardContent></Card>
      <Card elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}><CardContent sx={{ p: { xs: 2, sm: 3 } }}><Typography variant="h6" sx={{ fontWeight: 700 }}>Vehicles by type</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Combustion and electric vehicles</Typography>{stats.vehicles.status === "loading" ? <Typography role="status" color="text.secondary">Loading vehicle statistics…</Typography> : <DonutChart title="Vehicles by type" data={vehicleChart} />}</CardContent></Card>
      <Card elevation={0} sx={{ gridColumn: { md: "1 / -1" }, border: 1, borderColor: "divider", borderRadius: 3 }}><CardContent sx={{ p: { xs: 2, sm: 3 } }}><Typography variant="h6" sx={{ fontWeight: 700 }}>Producers by brand</Typography><Typography variant="body2" color="text.secondary">Producer account distribution across brands</Typography><BrandChart brands={stats.producers.stats.by_brand} loading={stats.producers.status === "loading"} /></CardContent></Card>
    </Box>
  </Box></Box>;
}
