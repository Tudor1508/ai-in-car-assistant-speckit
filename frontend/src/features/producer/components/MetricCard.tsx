"use client";

import { Card, CardContent, Stack, Typography } from "@mui/material";

export function MetricCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <Card variant="outlined" sx={{ height: "100%", bgcolor: "background.paper", borderColor: "divider", borderRadius: 3 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography variant="h3" sx={{ color: "text.primary", fontWeight: 800, lineHeight: 1 }}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{description}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
