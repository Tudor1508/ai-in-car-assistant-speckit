"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Box, Link, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { VehicleImage } from "../vehiclesSlice";
import { getVehicleImage } from "../vehiclesApi";

const FALLBACK_SRC = "/images/generic-vehicle.svg";
const GENERIC_ALT = "Placeholder image shown when no vehicle photo is available.";

type Props = {
  image: VehicleImage | null;
  vehicleLabel: string;
  vehicleId?: string;
  previewFile?: File | null;
};

export function VehicleImageDisplay({ image, vehicleLabel, vehicleId, previewFile }: Props) {
  const theme = useTheme();
  const [broken, setBroken] = useState(false);
  const [uploadedSrc, setUploadedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (previewFile) {
      const localUrl = URL.createObjectURL(previewFile);
      setUploadedSrc(localUrl);
      return () => URL.revokeObjectURL(localUrl);
    }
    if (image?.provider !== "user_upload" || !vehicleId) {
      setUploadedSrc(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    void getVehicleImage(vehicleId).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setUploadedSrc(objectUrl);
    }).catch(() => {
      if (!cancelled) setBroken(true);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image?.provider, image?.image_url, vehicleId, previewFile]);

  useEffect(() => setBroken(false), [image?.image_url, previewFile]);

  const imageSource = previewFile
    ? uploadedSrc
    : image?.provider === "user_upload"
      ? uploadedSrc
      : image?.image_url ?? null;
  const showFallback = broken || (image === null && !previewFile) || !imageSource;
  const fallbackSource = theme.palette.mode === "light" ? "/images/generic-vehicle-light.svg" : FALLBACK_SRC;

  return (
    <Stack spacing={0.75}>
      <Box sx={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden", borderRadius: 2, bgcolor: "background.paper" }}>
        <Image
          src={showFallback ? fallbackSource : imageSource!}
          alt={showFallback ? GENERIC_ALT : `Representative image for ${vehicleLabel}`}
          fill
          sizes="(max-width: 900px) 100vw, 50vw"
          unoptimized
          style={{ objectFit: "contain" }}
          onError={showFallback ? undefined : () => setBroken(true)}
        />
      </Box>
      {showFallback ? (
        <Typography variant="caption" color="text.secondary">No photo available yet. Upload a photo to show your vehicle here.</Typography>
      ) : previewFile || image?.provider === "user_upload" ? (
        <Typography variant="caption" color="text.secondary">Your uploaded vehicle photo</Typography>
      ) : image?.provider === "wikimedia_commons" ? (
        <Stack spacing={0.35}>
          {image.match_kind === "similar" && <Typography variant="caption" color="warning.light">Similar vehicle image; the exact model or year is not confirmed.</Typography>}
          <Typography variant="caption" component="span" sx={{ overflowWrap: "anywhere" }}>
            Photo by {image.creator} ·{" "}
            <Link href={image.file_page_url} target="_blank" rel="noreferrer noopener" underline="hover">Wikimedia Commons</Link>
            {" · "}
            <Link href={image.license_url} target="_blank" rel="noreferrer noopener" underline="hover">{image.license_name}</Link>
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  );
}
