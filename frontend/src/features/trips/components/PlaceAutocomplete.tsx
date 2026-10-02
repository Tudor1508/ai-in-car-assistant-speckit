"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, CircularProgress, Stack, TextField } from "@mui/material";
import type { PlaceSelection } from "../tripsSlice";
import { safeTripError, searchPlaces } from "../tripsApi";

type Props = {
  label: string;
  value: string;
  selected: PlaceSelection | null;
  onChange: (value: string) => void;
  onSelect: (place: PlaceSelection | null) => void;
  allowCurrentLocation?: boolean;
};

const configuredMinChars = Number(process.env.NEXT_PUBLIC_PLACE_MIN_CHARS);
const configuredDebounceMs = Number(process.env.NEXT_PUBLIC_PLACE_DEBOUNCE_MS);

export function PlaceAutocomplete({ label, value, selected, onChange, onSelect, allowCurrentLocation = false }: Props) {
  const [suggestions, setSuggestions] = useState<PlaceSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);
  const searchConfigValid = Number.isInteger(configuredMinChars) && configuredMinChars > 0
    && Number.isFinite(configuredDebounceMs) && configuredDebounceMs >= 0;
  const query = useMemo(() => value.trim(), [value]);

  useEffect(() => {
    let active = true;
    if (!searchConfigValid || query.length < configuredMinChars || selected?.label === value) {
      setSuggestions([]);
      setSearchError("");
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    setSuggestions([]);
    setSearchError("");
    const timer = window.setTimeout(() => {
      searchPlaces(query)
        .then((result) => { if (active) setSuggestions(result.places); })
        .catch((error: unknown) => { if (active) setSearchError(safeTripError(error)); })
        .finally(() => { if (active) setLoading(false); });
    }, configuredDebounceMs);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, retryVersion, searchConfigValid, selected?.label, value]);

  function useCurrentLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Browserul nu oferă acces la locație. Poți introduce și selecta o adresă.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const place: PlaceSelection = {
          label: `Locația mea (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        onChange(place.label);
        onSelect(place);
      },
      () => setLocationError("Nu am putut accesa locația. Verifică permisiunea și încearcă din nou."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <Stack spacing={1}>
      <Autocomplete
        freeSolo
        options={suggestions}
        value={selected}
        inputValue={value}
        getOptionLabel={(option) => typeof option === "string" ? option : option.label}
        isOptionEqualToValue={(option, current) => typeof current !== "string" && option.latitude === current.latitude && option.longitude === current.longitude}
        filterOptions={(options) => options}
        loading={loading}
        noOptionsText={query.length < configuredMinChars ? "Introdu mai multe caractere" : "Nu am găsit sugestii"}
        onInputChange={(_, nextValue, reason) => {
          if (reason === "input" || reason === "clear") {
            onChange(nextValue);
            onSelect(null);
            setLocationError("");
          }
        }}
        onChange={(_, place) => {
          if (place && typeof place !== "string") {
            onChange(place.label);
            onSelect(place);
          }
        }}
        renderOption={(props, option) => <li {...props} key={`${option.latitude}:${option.longitude}`}>{option.label}</li>}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            required
            fullWidth
            autoComplete="off"
            slotProps={{
              ...params.slotProps,
              htmlInput: { ...params.slotProps.htmlInput, "aria-label": label, maxLength: 255 },
              input: {
                ...params.slotProps.input,
                endAdornment: <>{loading ? <CircularProgress color="inherit" size={18} /> : null}{params.slotProps.input.endAdornment}</>,
              },
            }}
          />
        )}
      />
      {allowCurrentLocation && <Button type="button" onClick={useCurrentLocation} sx={{ alignSelf: "flex-start" }}>Folosește locația curentă</Button>}
      {locationError && <Alert severity="warning" role="alert">{locationError}</Alert>}
      {searchError && <Alert severity="error" role="alert" action={<Button color="inherit" size="small" onClick={() => setRetryVersion((current) => current + 1)}>Reîncearcă căutarea</Button>}>{searchError}</Alert>}
      {!searchError && query.length >= configuredMinChars && !loading && suggestions.length === 0 && (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Alert severity="info" sx={{ flex: 1 }}>Nu am găsit sugestii</Alert>
          <Button type="button" onClick={() => setRetryVersion((current) => current + 1)}>Reîncearcă căutarea</Button>
        </Box>
      )}
      {!searchConfigValid && <Alert severity="error" role="alert">Configurează NEXT_PUBLIC_PLACE_MIN_CHARS și NEXT_PUBLIC_PLACE_DEBOUNCE_MS pentru căutarea locațiilor.</Alert>}
    </Stack>
  );
}
