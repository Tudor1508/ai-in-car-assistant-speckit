"use client";

import Link from "next/link";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";

const features = [
  { number: "01", title: "Plan around your vehicle", body: "Choose the vehicle you are driving and plan with its available range in mind." },
  { number: "02", title: "See the route clearly", body: "Preview your journey on an interactive map with useful details for each leg." },
  { number: "03", title: "Know where to stop", body: "Find recommended charging or fuel stops along the way." },
];

function Brand() {
  return <Stack component={Link} href="/" direction="row" sx={{ alignItems: "center", gap: 1.25, color: "inherit", textDecoration: "none", width: "fit-content" }}>
    <Box aria-hidden="true" sx={{ display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: 2, bgcolor: "primary.main", color: "primary.contrastText" }}>
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 11 1.4-4.2A2 2 0 0 1 8.3 5.5h7.4a2 2 0 0 1 1.9 1.3L19 11v7H5z" /><path d="M5 12h14M8 18v1m8-1v1M8 15h.01M16 15h.01" /></svg>
    </Box>
    <Typography sx={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.04em" }}>drivewise<Box component="span" sx={{ color: "primary.main" }}>.</Box></Typography>
  </Stack>;
}

function RoutePreview() {
  return <Box component="aside" aria-label="Illustration of a planned route" sx={{ position: "relative", width: "100%", maxWidth: 570, justifySelf: "end", p: { xs: 1.5, sm: 2 }, border: 1, borderColor: "divider", borderRadius: 6, bgcolor: "background.paper", boxShadow: 12 }}>
    <Box sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, bgcolor: "background.default", border: 1, borderColor: "divider" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2 }}>
        <Box><Typography variant="caption" color="text.secondary">SAMPLE ROUTE</Typography><Typography variant="h6" sx={{ mt: .4, fontWeight: 750 }}>Cluj-Napoca <Box component="span" sx={{ color: "primary.main", px: .5 }}>to</Box> Bucharest</Typography></Box>
        <Box sx={{ px: 1.25, py: .6, borderRadius: 99, bgcolor: "action.selected", color: "primary.main", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>Range-aware</Box>
      </Stack>
      <Box sx={{ position: "relative", height: { xs: 210, sm: 250 }, overflow: "hidden", borderRadius: 3, bgcolor: "action.hover", backgroundImage: "linear-gradient(30deg, transparent 48%, rgba(120,160,180,.10) 49%, rgba(120,160,180,.10) 51%, transparent 52%), linear-gradient(150deg, transparent 48%, rgba(120,160,180,.08) 49%, rgba(120,160,180,.08) 51%, transparent 52%)", backgroundSize: "150px 100px" }}>
        <svg viewBox="0 0 520 250" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true"><path d="M88 192 C148 194 160 154 215 161 S300 126 344 127 S405 70 454 61" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="7 5" style={{ color: "var(--mui-palette-primary-main)" }} /><circle cx="88" cy="192" r="8" fill="currentColor" style={{ color: "var(--mui-palette-primary-main)" }} /><circle cx="454" cy="61" r="8" fill="currentColor" style={{ color: "var(--mui-palette-text-primary)" }} /><circle cx="454" cy="61" r="13" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--mui-palette-text-primary)" }} /></svg>
        <Typography variant="caption" sx={{ position: "absolute", left: "11%", bottom: "9%", color: "text.secondary" }}>Your starting point</Typography>
        <Typography variant="caption" sx={{ position: "absolute", right: "8%", top: "13%", color: "text.secondary" }}>Your destination</Typography>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1, mt: 1.5 }}>
        {[{ label: "Route", value: "Personalized" }, { label: "Vehicle", value: "Range-aware" }, { label: "Stops", value: "Recommended" }].map((item) => <Box key={item.label} sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: "action.hover", borderRadius: 2 }}><Typography variant="caption" color="text.secondary">{item.label}</Typography><Typography variant="body2" sx={{ mt: .5, fontWeight: 700, fontSize: { xs: 11, sm: 14 } }}>{item.value}</Typography></Box>)}
      </Box>
    </Box>
  </Box>;
}

export function LandingPage() {
  return <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary", backgroundImage: "radial-gradient(ellipse at 74% 22%, rgba(20,184,166,.15), transparent 32%), radial-gradient(ellipse at 12% 82%, rgba(58,90,170,.14), transparent 34%)" }}>
    <Box component="header" sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Stack direction={{ xs: "column", sm: "row" }} sx={{ maxWidth: 1320, mx: "auto", px: { xs: 2, md: 4 }, py: { xs: 1, sm: 0 }, minHeight: 76, alignItems: "center", justifyContent: "space-between", gap: { xs: 1, sm: 2 } }}>
        <Brand />
        <Button component="a" href="#how-it-works" sx={{ display: "inline-flex", color: "text.secondary", textTransform: "none", "&:focus-visible": { outline: "2px solid currentColor", outlineOffset: 2 } }}>How it works</Button>
        <Stack direction="row" sx={{ alignItems: "center", gap: { xs: .25, sm: 1 } }}>
          <ThemeModeToggle />
          <Button component={Link} href="/login" sx={{ color: "text.primary", textTransform: "none", px: { xs: 1, sm: 2 } }}>Log in</Button>
          <Button component={Link} href="/register" variant="contained" sx={{ borderRadius: 99, px: { xs: 1.5, sm: 2.5 }, py: 1, textTransform: "none", fontWeight: 700 }}>Get started</Button>
        </Stack>
      </Stack>
    </Box>
    <Box component="main">
      <Box component="section" sx={{ maxWidth: 1320, mx: "auto", px: { xs: 2, md: 4 }, pt: { xs: 7, sm: 10, lg: 14 }, pb: { xs: 8, md: 12 }, display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.05fr) minmax(0, .95fr)" }, alignItems: "center", gap: { xs: 6, md: 7 } }}>
        <Box>
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, px: 1.5, py: .8, mb: 3, border: 1, borderColor: "divider", bgcolor: "action.hover", borderRadius: 99 }}><Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "primary.main" }} /><Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: ".14em" }}>YOUR INTELLIGENT DRIVING COMPANION</Typography></Box>
          <Typography variant="h1" sx={{ maxWidth: 720, fontSize: { xs: "3rem", sm: "4.25rem", lg: "5.15rem" }, lineHeight: .99, fontWeight: 850, letterSpacing: "-.065em" }}>Every journey,<br /><Box component="span" sx={{ color: "primary.main" }}>thought through.</Box></Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 650, mt: 3, fontSize: { xs: 16, sm: 19 }, lineHeight: 1.7, fontWeight: 400 }}>Drivewise brings calm, clarity, and intelligence to every mile. Plan smarter routes, understand your vehicle, and arrive ready for what&apos;s next.</Typography>
          <Button component={Link} href="/login" variant="contained" size="large" endIcon={<Box component="span" aria-hidden="true">→</Box>} sx={{ mt: 3.5, px: 3.5, py: 1.6, borderRadius: 99, fontWeight: 750 }}>Start your journey</Button>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: { xs: 2, sm: 3 }, mt: 4, color: "text.secondary" }}>{["Personalized routes", "Vehicle-aware planning"].map((item) => <Stack key={item} direction="row" sx={{ alignItems: "center", gap: 1 }}><Typography component="span" sx={{ color: "primary.main", fontWeight: 800 }}>✓</Typography><Typography variant="body2">{item}</Typography></Stack>)}</Stack>
        </Box>
        <RoutePreview />
      </Box>
      <Box component="section" id="how-it-works" sx={{ scrollMarginTop: 3, borderTop: 1, borderColor: "divider", bgcolor: "action.hover" }}><Box sx={{ maxWidth: 1320, mx: "auto", px: { xs: 2, md: 4 }, py: { xs: 7, md: 10 } }}>
        <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: ".14em", fontWeight: 700 }}>BUILT FOR THE ROAD AHEAD</Typography>
        <Typography variant="h3" sx={{ mt: 1, mb: 4, fontWeight: 750, letterSpacing: "-.04em", fontSize: { xs: "2rem", sm: "2.75rem" } }}>A clearer way to get there.</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>{features.map((feature) => <Card key={feature.number} elevation={0} sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: 3 }}><CardContent sx={{ p: { xs: 2.5, sm: 3 } }}><Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700 }}>{feature.number}</Typography><Typography variant="h6" sx={{ mt: 1, fontWeight: 700 }}>{feature.title}</Typography><Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>{feature.body}</Typography></CardContent></Card>)}</Box>
      </Box></Box>
    </Box>
    <Box component="footer" sx={{ maxWidth: 1320, mx: "auto", px: { xs: 2, md: 4 }, py: 3, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
      <Typography variant="caption" color="text.secondary">© {new Date().getFullYear()} Drivewise. Plan the miles ahead.</Typography>
      <Stack component="nav" aria-label="Footer navigation" direction="row" spacing={2}>
        <Button component={Link} href="/contact" size="small" sx={{ textTransform: "none" }}>Contact</Button>
        <Button component={Link} href="/privacy" size="small" sx={{ textTransform: "none" }}>Privacy</Button>
      </Stack>
    </Box>
  </Box>;
}
