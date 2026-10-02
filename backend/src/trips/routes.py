from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from src.api.responses import (
	ErrorEnvelope,
	SuccessEnvelope,
	common_error_responses,
	success_envelope,
)
from src.auth.dependencies import get_db, require_account, require_csrf
from src.data.models.account import Account
from src.trips.provider import ORSProvider
from src.trips.schemas import (
	FavoriteCollection,
	FavoriteItem,
	FavoriteRouteCreate,
	PlaceCollection,
	TripPreviewRequest,
	TripPreviewResponse,
)
from src.trips.service import (
	list_favorite_routes,
	preview_owned_trip,
	save_favorite_route,
	search_places,
)
from src.trips.settings import TripConfigurationError, TripSettings

router = APIRouter(prefix="/trips", tags=["trips"])
trip_errors = common_error_responses() | {
	502: {"model": ErrorEnvelope, "description": "The route provider is unavailable"},
	503: {"model": ErrorEnvelope, "description": "The route provider is not configured"},
}


def required_trip_settings() -> TripSettings:
	try:
		return TripSettings.from_environment()
	except TripConfigurationError as error:
		raise HTTPException(
			status_code=503,
			detail="routing_provider_unavailable",
		) from error


@router.get(
	"/places",
	response_model=SuccessEnvelope[PlaceCollection],
	responses=trip_errors,
)
def get_place_suggestions(
	query: Annotated[str | None, Query(alias="q", max_length=255)] = None,
	account: Account = Depends(require_account),
):
	if query is None or not query.strip():
		raise HTTPException(status_code=422, detail="validation_error")
	settings = required_trip_settings()
	places = search_places(ORSProvider(settings), query, settings)
	return success_envelope(places.model_dump())


@router.post(
	"/preview",
	response_model=SuccessEnvelope[TripPreviewResponse],
	responses=trip_errors,
)
def post_trip_preview(
	body: TripPreviewRequest,
	db: Session = Depends(get_db),
	account: Account = Depends(require_account),
	_csrf=Depends(require_csrf),
):
	settings = required_trip_settings()
	result = preview_owned_trip(db, account, body, settings)
	return success_envelope(result.model_dump(mode="json"))


@router.get(
	"/favorites",
	response_model=SuccessEnvelope[FavoriteCollection],
	responses=common_error_responses(),
)
def get_favorite_routes(
	db: Session = Depends(get_db),
	account: Account = Depends(require_account),
):
	result = list_favorite_routes(db, account.id)
	return success_envelope(result.model_dump(mode="json"))


@router.post(
	"/favorites",
	response_model=SuccessEnvelope[FavoriteItem],
	status_code=201,
	responses=common_error_responses(),
)
def post_favorite_route(
	body: FavoriteRouteCreate,
	response: Response,
	db: Session = Depends(get_db),
	account: Account = Depends(require_account),
	_csrf=Depends(require_csrf),
):
	favorite, created = save_favorite_route(db, account.id, body)
	response.status_code = 201 if created else 200
	return success_envelope({"favorite": favorite.model_dump(mode="json")})
