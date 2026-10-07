"""Conservative, attribution-preserving lookups against Wikimedia Commons."""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
import re
from threading import BoundedSemaphore, Lock
import time
from urllib.parse import quote, urlparse

import httpx

COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = (
    "DriveWiseVehicleImagePreview/1.0 "
    "(https://gitlab.endava.com/techfest/team3_git-happens)"
)
_SEARCH_LIMIT = 5
_TIMEOUT = httpx.Timeout(connect=1.0, read=2.5, write=1.0, pool=1.0)
_CACHE_TTL_SECONDS = 300
_NEGATIVE_CACHE_TTL_SECONDS = 30
_CACHE_MAX_ITEMS = 256
_MAX_CONCURRENT_LOOKUPS = 2
_MAX_RETRY_AFTER_SECONDS = 300
_cache: OrderedDict[tuple[str, str, int], tuple[float, CommonsVehicleImage | None]] = OrderedDict()
_cache_lock = Lock()
_network_slots = BoundedSemaphore(_MAX_CONCURRENT_LOOKUPS)
_cooldown_lock = Lock()
_rate_limit_until = 0.0


@dataclass(frozen=True)
class CommonsVehicleImage:
    file_title: str
    image_url: str
    file_page_url: str
    creator: str
    license_name: str
    license_url: str
    match_kind: str = "exact"

    def as_response(self) -> dict[str, str]:
        return {
            "provider": "wikimedia_commons",
            "file_title": self.file_title,
            "image_url": self.image_url,
            "file_page_url": self.file_page_url,
            "creator": self.creator,
            "license_name": self.license_name,
            "license_url": self.license_url,
            "match_kind": self.match_kind,
        }


class _TextOnly(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def _plain_text(value: object) -> str:
    if not isinstance(value, str):
        return ""
    parser = _TextOnly()
    try:
        parser.feed(value)
        parser.close()
    except Exception:
        return ""
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip()


def _normalized(value: str) -> str:
    # Commons titles commonly write identifiers as both "Model3" and "Model 3".
    separated = re.sub(r"(?<=[a-z]{2})(?=\d)|(?<=\d)(?=[a-z])", " ", value.casefold())
    return " ".join(re.findall(r"[\w]+", separated, flags=re.UNICODE))


def _model_terms(model: str) -> list[str]:
    # Parenthetical trim/engine details and a repeated year should not be required
    # to identify the actual model (e.g. "A5 Sportback 40 TFSI (F5, 2020)").
    value = re.sub(r"\([^)]*\)", " ", model)
    tokens = _normalized(value).split()
    tokens = [token for token in tokens if not re.fullmatch(r"(?:18|19|20)\d{2}", token)]
    # BMW models are usually titled "4 Series" on Commons, while Romanian
    # forms commonly say "Seria 4". Canonicalize both to the Commons wording.
    if len(tokens) >= 2 and tokens[0] in {"seria", "series"} and tokens[1].isdigit():
        tokens[:2] = [tokens[1], "series"]
    elif len(tokens) >= 2 and tokens[0].isdigit() and tokens[1] == "seria":
        tokens[1] = "series"
    return tokens


def _model_core(model: str) -> str:
    return " ".join(_model_terms(model)[:2])


def _commons_search_query(name: str, model: str, year: int | None = None) -> str:
    """Build a punctuation-free query; omit year so older/model-only photos surface."""
    del year  # Year is a ranking preference, not a hard search requirement.
    tokens = _normalized(f"{name} {model}").split()
    unique_tokens: list[str] = []
    seen: set[str] = set()
    for token in tokens:
        normalized = token.casefold()
        if normalized not in seen:
            seen.add(normalized)
            unique_tokens.append(token)
    return " ".join(unique_tokens)


def _commons_search_queries(name: str, model: str, year: int) -> list[str]:
    del year
    variants = [" ".join(_model_terms(model)), _model_core(model)]
    queries: list[str] = []
    for variant in variants:
        query = _commons_search_query(name, variant)
        if query and query not in queries:
            queries.append(query)
    return queries


def _contains_phrase(text: str, phrase: str) -> bool:
    normalized_text = f" {_normalized(text)} "
    normalized_phrase = f" {_normalized(phrase)} "
    return normalized_phrase != "  " and normalized_phrase in normalized_text


def _year_rank(title: str, object_name: str, year: int) -> int:
    exact_sources = f"{title} {object_name}"
    if re.search(rf"(?<!\d){year}(?!\d)", exact_sources):
        return 2
    years_text = f"{title} {object_name}"
    for start, end in re.findall(
        r"(?<!\d)((?:18|19|20)\d{2})\s*[-–—]\s*((?:18|19|20)\d{2})(?!\d)",
        years_text,
    ):
        if int(start) <= year <= int(end):
            return 1
    if re.search(r"(?<!\d)(?:18|19|20)\d{2}(?!\d)", years_text):
        return -1  # known different year is usable only as a clearly similar image
    return 0  # no year evidence


def _allowed_license(name: str, license_url: str) -> bool:
    normalized_name = re.sub(r"\s+", " ", name.strip()).casefold()
    parsed = urlparse(license_url)
    if parsed.scheme != "https" or parsed.username or parsed.password or parsed.port:
        return False
    if parsed.hostname not in {"creativecommons.org", "www.creativecommons.org"}:
        return False
    path = parsed.path.rstrip("/").casefold()
    if normalized_name in {"cc0", "cc0 1.0", "cc0 1.0 universal"}:
        return path == "/publicdomain/zero/1.0"
    match = re.fullmatch(r"cc by(-sa)? (1\.0|2\.0|2\.5|3\.0|4\.0)", normalized_name)
    if not match:
        return False
    flavor = "by-sa" if match.group(1) else "by"
    version = match.group(2)
    return path == f"/licenses/{flavor}/{version}"


def _safe_https_url(value: object, allowed_hosts: set[str]) -> str | None:
    if not isinstance(value, str) or len(value) > 2048:
        return None
    parsed = urlparse(value)
    if (
        parsed.scheme != "https"
        or parsed.hostname not in allowed_hosts
        or parsed.username
        or parsed.password
        or parsed.port
    ):
        return None
    return value


def _file_page_url(title: str) -> str:
    return "https://commons.wikimedia.org/wiki/" + quote(
        title.replace(" ", "_"), safe=":()'!,._-"
    )


def _read_cache(key: tuple[str, str, int]) -> tuple[bool, CommonsVehicleImage | None]:
    now = time.monotonic()
    with _cache_lock:
        cached = _cache.get(key)
        if cached is None:
            return False, None
        expires_at, image = cached
        if expires_at <= now:
            del _cache[key]
            return False, None
        _cache.move_to_end(key)
        return True, image


def _write_cache(key: tuple[str, str, int], image: CommonsVehicleImage | None) -> None:
    ttl = _CACHE_TTL_SECONDS if image is not None else _NEGATIVE_CACHE_TTL_SECONDS
    with _cache_lock:
        _cache[key] = (time.monotonic() + ttl, image)
        _cache.move_to_end(key)
        while len(_cache) > _CACHE_MAX_ITEMS:
            _cache.popitem(last=False)


def clear_image_search_cache() -> None:
    """Clear process-local metadata cache; intended for deterministic tests."""
    global _rate_limit_until
    with _cache_lock:
        _cache.clear()
    with _cooldown_lock:
        _rate_limit_until = 0.0


def _api_get(client: httpx.Client, params: dict[str, object]) -> dict:
    response = client.get(COMMONS_API_URL, params=params)
    try:
        response.raise_for_status()
    except httpx.HTTPStatusError:
        if getattr(response, "status_code", None) == 429:
            _record_rate_limit(response)
        raise
    payload = response.json()
    if not isinstance(payload, dict) or "error" in payload:
        raise ValueError("Invalid Commons API response")
    return payload


def _record_rate_limit(response: httpx.Response) -> None:
    """Honor Retry-After for later lookups without delaying the current save."""
    global _rate_limit_until
    headers = getattr(response, "headers", {})
    retry_after = headers.get("Retry-After") if headers else None
    delay: float | None = None
    if isinstance(retry_after, str):
        try:
            delay = float(retry_after)
        except ValueError:
            try:
                retry_at = parsedate_to_datetime(retry_after)
                if retry_at.tzinfo is None:
                    retry_at = retry_at.replace(tzinfo=timezone.utc)
                delay = (retry_at - datetime.now(timezone.utc)).total_seconds()
            except (TypeError, ValueError, OverflowError):
                delay = None
    if delay is None:
        delay = _NEGATIVE_CACHE_TTL_SECONDS
    delay = min(max(delay, 0.0), _MAX_RETRY_AFTER_SECONDS)
    with _cooldown_lock:
        _rate_limit_until = max(_rate_limit_until, time.monotonic() + delay)


def _rate_limit_active() -> bool:
    with _cooldown_lock:
        return _rate_limit_until > time.monotonic()


def _candidate_image(page: dict, name: str, model: str, year: int) -> tuple[tuple[int, int, int], CommonsVehicleImage] | None:
    title = page.get("title")
    if not isinstance(title, str) or not title.startswith("File:"):
        return None
    imageinfo = page.get("imageinfo")
    if not isinstance(imageinfo, list) or not imageinfo or not isinstance(imageinfo[0], dict):
        return None
    info = imageinfo[0]
    mime = info.get("mime")
    if mime not in {"image/jpeg", "image/png", "image/webp"} or info.get("mediatype") != "BITMAP":
        return None

    extmetadata = info.get("extmetadata")
    if not isinstance(extmetadata, dict):
        return None

    def metadata_text(key: str) -> str:
        field = extmetadata.get(key)
        return _plain_text(field.get("value")) if isinstance(field, dict) else ""

    object_name = metadata_text("ObjectName")
    description = metadata_text("ImageDescription")
    categories = page.get("categories")
    categories = categories if isinstance(categories, list) else []
    category_text = " ".join(
        category.get("title", "")
        for category in categories
        if isinstance(category, dict) and isinstance(category.get("title"), str)
    )
    identity_text = f"{title} {object_name} {description}"
    evidence_text = f"{identity_text} {category_text}"
    core = _model_core(model)
    if not _contains_phrase(identity_text, name) or not core or not _contains_phrase(identity_text, core):
        return None
    # Commons search also returns toys, scale models, illustrations, and logos.
    # Accept only records whose own text/categories identify a real automobile.
    normalized_evidence = _normalized(evidence_text)
    excluded_evidence = (
        "toy", "toys", "toy car", "model car", "scale model", "scale models",
        "miniature", "miniatures", "diecast", "die-cast", "lego", "remote control",
        "rc car", "model kit", "logo", "badge", "emblem", "poster", "illustration",
        "drawing", "cartoon", "rendering", "3d model",
    )
    if any(_contains_phrase(normalized_evidence, term) for term in excluded_evidence):
        return None
    positive_evidence = (
        "car", "cars", "automobile", "automobiles", "motor car", "motor cars",
        "motor vehicle", "motor vehicles", "passenger vehicle", "passenger car",
        "sedan", "saloon", "coupe", "coupé", "hatchback", "convertible", "roadster",
        "station wagon", "estate car", "suv", "crossover", "sports car", "electric car",
        "category:cars", "category:automobiles", "category:vehicles",
    )
    if not any(_contains_phrase(normalized_evidence, term) for term in positive_evidence):
        return None

    year_rank = _year_rank(title, object_name, year)
    full_model_match = int(_contains_phrase(identity_text, " ".join(_model_terms(model))))

    creator = metadata_text("Artist") or metadata_text("Credit")
    license_name = metadata_text("LicenseShortName")
    license_url_value = extmetadata.get("LicenseUrl")
    license_url_raw = license_url_value.get("value") if isinstance(license_url_value, dict) else None
    license_url = _plain_text(license_url_raw)
    if not creator or not license_name or not _allowed_license(license_name, license_url):
        return None

    image_url = _safe_https_url(
        info.get("thumburl") or info.get("url"),
        {"upload.wikimedia.org", "thumb.wikimedia.org"},
    )
    if image_url is None:
        return None
    match_kind = "exact" if full_model_match and year_rank >= 1 else "similar"
    return (int(match_kind == "exact"), year_rank, full_model_match), CommonsVehicleImage(
        file_title=title,
        image_url=image_url,
        file_page_url=_file_page_url(title),
        creator=creator[:512],
        license_name=license_name[:160],
        license_url=license_url,
        match_kind=match_kind,
    )


def _search_vehicle_image(name: str, model: str, year: int) -> CommonsVehicleImage | None:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    with httpx.Client(timeout=_TIMEOUT, headers=headers, follow_redirects=False) as client:
        titles: list[str] = []
        for query in _commons_search_queries(name, model, year):
            search_payload = _api_get(client, {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srnamespace": 6,
                "srlimit": _SEARCH_LIMIT,
                "format": "json",
                "formatversion": 2,
                "utf8": 1,
            })
            results = search_payload.get("query", {}).get("search", [])
            if not isinstance(results, list):
                continue
            for result in results:
                title = result.get("title") if isinstance(result, dict) else None
                if isinstance(title, str) and title.startswith("File:") and title not in titles:
                    titles.append(title)
        if not titles:
            return None

        image_payload = _api_get(client, {
            "action": "query",
            "prop": "imageinfo|categories",
            "titles": "|".join(titles),
            "cllimit": 50,
            "clshow": "!hidden",
            "iiprop": "url|mime|mediatype|extmetadata",
            "iiurlwidth": 640,
            "iiextmetadatafilter": "Artist|Credit|LicenseShortName|LicenseUrl|ObjectName|ImageDescription",
            "iiextmetadatalanguage": "en",
            "format": "json",
            "formatversion": 2,
            "utf8": 1,
        })
        pages = image_payload.get("query", {}).get("pages", [])
        if not isinstance(pages, list):
            return None
        candidates = [
            candidate
            for page in pages
            if isinstance(page, dict)
            if (candidate := _candidate_image(page, name, model, year)) is not None
        ]
        if not candidates:
            return None
        # Search API relevance gives a stable tie-breaker. A same-model image is
        # useful even when year metadata is absent; the UI explicitly labels it.
        candidates.sort(key=lambda candidate: candidate[0], reverse=True)
        return candidates[0][1]


def search_vehicle_image(
    name: str, model: str, year: int, *, refresh: bool = False
) -> CommonsVehicleImage | None:
    """Return a license-checked exact or clearly labeled similar model image.

    External/provider failures are deliberately reduced to the generic-fallback
    outcome so image discovery cannot block vehicle management.
    """
    clean_name = " ".join(name.split())[:80]
    clean_model = " ".join(model.split())[:80]
    key = (_normalized(clean_name), _normalized(clean_model), year)
    if not clean_name or not clean_model or not (1886 <= year <= 9999):
        return None
    if not refresh:
        found, cached = _read_cache(key)
        if found:
            return cached
    if _rate_limit_active():
        _write_cache(key, None)
        return None
    try:
        with _network_slots:
            if _rate_limit_active():
                image = None
            else:
                image = _search_vehicle_image(clean_name, clean_model, year)
    except (httpx.HTTPError, ValueError, TypeError, KeyError, IndexError):
        image = None
    except Exception:
        # Treat provider/parser failures as unavailable, but do not leak details.
        image = None
    _write_cache(key, image)
    return image


def resolve_vehicle_image(
    name: str,
    model: str,
    year: int,
    file_title: str | None,
) -> CommonsVehicleImage | None:
    """Resolve a submitted Commons file title only if it is the current best match."""
    if not file_title:
        return None
    # Recheck both candidate membership and current license/attribution metadata
    # before persisting; a preview cache must not authorize an old file title.
    image = search_vehicle_image(name, model, year, refresh=True)
    if image is None or image.file_title != file_title:
        return None
    return image
