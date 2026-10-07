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
  favoriteDeleting,
  favoriteDeleted,
  favoriteDeleteFailed,
  favoritesFailed,
  favoritesLoaded,
  favoritesLoading,
} from "../tripsSlice";
import { deleteFavoriteRoute, listFavoriteRoutes, safeTripError, saveFavoriteRoute } from "../tripsApi";

export function FavoriteRoutes({ canSave = true, disabled = false }: { canSave?: boolean; disabled?: boolean }) {
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
    favoriteDeleteId,
    favoriteDeleteStatus,
    favoriteDeleteError,
  } = useSelector((state: RootState) => state.trips);
  const [notice, setNotice] = useState("");
  const [showAll, setShowAll] = useState(false);

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
      setNotice(existing ? "This route is already in your favorites." : "Route added to your favorites.");
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

  async function remove(favoriteId: string) {
    dispatch(favoriteDeleting(favoriteId));
    setNotice("");
    try {
      await deleteFavoriteRoute(favoriteId);
      dispatch(favoriteDeleted(favoriteId));
      setNotice("Favorite route removed.");
    } catch (cause) {
      if (cause instanceof ApiClientError && cause.code === "authentication_required") {
        setCsrfToken(null);
        dispatch(authCleared());
        router.replace("/login");
        return;
      }
      dispatch(favoriteDeleteFailed({ id: favoriteId, error: safeTripError(cause) }));
    }
  }

  const error = favoritesError ?? favoriteSaveError;
  const loading = favoritesStatus === "idle" || favoritesStatus === "loading";
  const saving = favoriteSaveStatus === "loading";
  const visibleFavorites = showAll ? favorites : favorites.slice(0, 2);

  async function retryDelete() {
    if (favoriteDeleteId) await remove(favoriteDeleteId);
  }

  return (
    <Box component="section" aria-labelledby="favorite-routes-heading" sx={{ mt: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 1 }}>
        <Box>
          <Typography id="favorite-routes-heading" variant="h6" sx={{ fontWeight: 750 }}>Favorite routes</Typography>
          <Typography variant="body2" color="text.secondary">Save and reuse pairs of locations.</Typography>
        </Box>
        <Button variant="outlined" onClick={() => void save()} disabled={disabled || !origin || !destination || !canSave || saving}>
          {saving ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}Save route
        </Button>
      </Stack>
      {error && <Alert severity="error" role="alert" action={<Button color="inherit" size="small" onClick={() => void load()}>Retry</Button>} sx={{ mt: 1 }}>{error}</Alert>}
      {favoriteDeleteError && <Alert severity="error" role="alert" action={<Button color="inherit" size="small" onClick={() => void retryDelete()}>Retry removal</Button>} sx={{ mt: 1 }}>{favoriteDeleteError}</Alert>}
      {notice && <Alert severity="success" role="status" sx={{ mt: 1 }}>{notice}</Alert>}
      {loading ? <Typography role="status" sx={{ mt: 1 }}>Loading favorites…</Typography> : favorites.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 1 }}>You do not have any favorite routes yet.</Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 1, mt: 1 }}>
          {visibleFavorites.map((favorite) => (
            <Card key={favorite.id} variant="outlined" sx={{ bgcolor: "background.default", borderColor: "divider" }}>
              <Stack direction="row" sx={{ alignItems: "stretch" }}>
                <CardActionArea disabled={disabled} onClick={() => { dispatch(favoriteSelected(favorite)); setNotice("Favorite locations have been filled in."); }} aria-label={`Use route from ${favorite.origin.label} to ${favorite.destination.label}`} sx={{ flex: 1, minWidth: 0 }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700 }}>{favorite.origin.label}</Typography>
                    <Typography variant="body2" color="text.secondary">to {favorite.destination.label}</Typography>
                  </CardContent>
                </CardActionArea>
                <Button
                  aria-label={`Remove favorite route from ${favorite.origin.label} to ${favorite.destination.label}`}
                  onClick={() => void remove(favorite.id)}
                  disabled={disabled || favoriteDeleteStatus === "loading"}
                  sx={{ alignSelf: "center", mx: 1, minWidth: "auto", whiteSpace: "nowrap" }}
                >
                  {favoriteDeleteId === favorite.id && favoriteDeleteStatus === "loading" ? <CircularProgress size={18} aria-label="Removing route" /> : "Remove"}
                </Button>
              </Stack>
            </Card>
          ))}
        </Box>
      )}
      {!loading && favorites.length > 2 && <Button onClick={() => setShowAll((shown) => !shown)} sx={{ mt: 1 }} aria-expanded={showAll}>
        {showAll ? "Show less" : `Show more (${favorites.length - 2})`}
      </Button>}
    </Box>
  );
}
