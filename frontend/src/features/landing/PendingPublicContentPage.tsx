"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";

type PublicPage = "Contact" | "Privacy";

function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return <Box component="section" aria-labelledby={`section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
    <Typography id={`section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} variant="h2" sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 1 }}>{title}</Typography>
    <Typography component="div" color="text.secondary" sx={{ lineHeight: 1.75 }}>{children}</Typography>
  </Box>;
}

function PrivacyInformation() {
  return <Stack spacing={2.5}>
    <Typography>Drivewise is designed to help people manage account and vehicle information and plan journeys. This page explains, in general terms, the types of information that may be involved when you use those features.</Typography>
    <ContentSection title="Information you provide">
      Depending on the features you use, Drivewise may process information you submit, such as account and profile details, vehicle details, journey locations, route preferences, and information needed to operate the application. The specific information used depends on the feature and the actions you choose to take.
    </ContentSection>
    <ContentSection title="How information is used">
      Information may be used to provide the features you request, such as signing in, displaying your profile and vehicles, planning a journey, and presenting route results. Technical information may also be processed to operate, protect, troubleshoot, and maintain the application.
    </ContentSection>
    <ContentSection title="Maps and external services">
      Some features may rely on external providers for maps, geocoding, route calculation, or points of interest. When you use those features, relevant information—such as a location or route query—may be sent to the provider needed to return the requested result.
    </ContentSection>
    <ContentSection title="Your choices and requests">
      You should avoid entering information that is not needed for the feature you are using. This demo does not have an active support channel.
    </ContentSection>
  </Stack>;
}

export function PendingPublicContentPage({ title }: { title: PublicPage }) {
  const isPrivacy = title === "Privacy";
  return <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
    <Box component="header" sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Stack direction="row" sx={{ maxWidth: 1100, mx: "auto", px: 2, minHeight: 68, alignItems: "center", justifyContent: "space-between" }}>
        <Button component={Link} href="/" color="inherit" sx={{ fontWeight: 800, textTransform: "none" }}>drivewise<Box component="span" sx={{ color: "primary.main" }}>.</Box></Button>
        <ThemeModeToggle />
      </Stack>
    </Box>
    <Box component="main" sx={{ maxWidth: 840, mx: "auto", p: { xs: 2, sm: 4 }, pt: { xs: 4, sm: 7 } }}>
      <Paper sx={{ p: { xs: 3, sm: 5 }, bgcolor: "background.paper" }}>
        <Stack spacing={3}>
          <Typography variant="h1" sx={{ fontSize: { xs: "2rem", sm: "2.7rem" }, fontWeight: 800 }}>{isPrivacy ? "Privacy at Drivewise" : "Contact Drivewise"}</Typography>
          {isPrivacy
            ? <Alert severity="info" role="status">Demo privacy information. This is general information about the demo, not a legal privacy policy for a public service.</Alert>
            : <Alert severity="info" role="status">This demo does not have an active support channel.</Alert>}
          {isPrivacy && <PrivacyInformation />}
          <Stack direction="row" spacing={1} sx={{ pt: 1, flexWrap: "wrap" }}>
            <Button component={Link} href="/" sx={{ alignSelf: "flex-start" }}>Back to home</Button>
            <Button component={Link} href={isPrivacy ? "/contact" : "/privacy"} sx={{ alignSelf: "flex-start" }}>{isPrivacy ? "Contact" : "Privacy"}</Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  </Box>;
}
