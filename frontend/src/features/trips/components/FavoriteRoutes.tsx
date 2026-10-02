"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardActionArea, CardContent, CircularProgress, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import type { AppDispatch, RootState } from "@/lib/store";
import { authCleared } from "@/features/auth/authSlice";
import { ApiClientError, setCsrfToken } from "@/lib/api/client";
import {
  favoriteSaved,
  favoriteSaveFailed,
  favoriteSaving,
  favoriteSelected,
  favoritesFailed,
  favoritesLoaded,
  favoritesLoading,
} from "../tripsSlice";
import { listFavoriteRoutes, safeTripError, saveFavoriteRoute } from "../tripsApi";

export function FavoriteRoutes({ canSave = true }: { canSave?: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const {
    origin,
    destination,
    favorites,
    favoritesStatus,
    favoritesError,
    favoriteSaveStatus,
    favoriteSaveError,
  } = useSelector((state: RootState) => state.trips);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    dispatch(favoritesLoading());
    try {
      const result = await listFavoriteRoutes();
      dispatch(favoritesLoaded(result.favorites));
    } catch (cause) {
      if (cause instanceof ApiClientError && cause.code === "authentication_required") {
        setCsrfToken(null);
        dispatch(authCleared());
        router.replace("/login");
        return;
      }
      dispatch(favoritesFailed(safeTripError(cause)));
    }
  }, [dispatch, router]);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!origin || !destination) return;
    dispatch(favoriteSaving());
    setNotice("");
    try {
      const result = await saveFavoriteRoute({ origin, destination });
      const existing = favorites.some((favorite) => favorite.id === result.favorite.id);
      dispatch(favoriteSaved(result.favorite));
      setNotice(existing ? "Acest traseu era deja în lista de favorite." : "Traseul a fost salvat la favorite.");
    } catch (cause) {
      if (cause instanceof ApiClientError && cause.code === "authentication_required") {
        setCsrfToken(null);
        dispatch(authCleared());
        router.replace("/login");
        return;
      }
      dispatch(favoriteSaveFailed(safeTripError(cause)));
    }
  }

  const error = favoritesError ?? favoriteSaveError;
  const loading = favoritesStatus === "idle" || favoritesStatus === "loading";
  const saving = favoriteSaveStatus === "loading";

  return (
    <Box component="section" aria-labelledby="favorite-routes-heading" sx={{ mt: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 1 }}>
        <Box>
          <Typography id="favorite-routes-heading" variant="h6" sx={{ fontWeight: 750 }}>Trasee favorite</Typography>
          <Typography variant="body2" color="text.secondary">Salvează și refolosește perechi de locații.</Typography>
        </Box>
        <Button variant="outlined" onClick={() => void save()} disabled={!origin || !destination || !canSave || saving}>
          {saving ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}Salvează traseul
        </Button>
      </Stack>
      {error && <Alert severity="error" role="alert" action={<Button color="inherit" size="small" onClick={() => void load()}>Reîncearcă</Button>} sx={{ mt: 1 }}>{error}</Alert>}
      {notice && <Alert severity="success" role="status" sx={{ mt: 1 }}>{notice}</Alert>}
      {loading ? <Typography role="status" sx={{ mt: 1 }}>Se încarcă favoritele…</Typography> : favorites.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 1 }}>Nu ai încă trasee favorite.</Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 1, mt: 1 }}>
          {favorites.map((favorite) => (
            <Card key={favorite.id} variant="outlined" sx={{ bgcolor: "#13263a", borderColor: "#34495d" }}>
              <CardActionArea onClick={() => { dispatch(favoriteSelected(favorite)); setNotice("Locațiile favorite au fost completate."); }} aria-label={`Folosește traseul ${favorite.origin.label} către ${favorite.destination.label}`}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700 }}>{favorite.origin.label}</Typography>
                  <Typography variant="body2" color="text.secondary">către {favorite.destination.label}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
