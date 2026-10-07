import httpx

from src.vehicles import image_provider


class FakeResponse:
    def __init__(self, payload, status_code=200, headers=None):
        self._payload = payload
        self.status_code = status_code
        self.headers = headers or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("upstream detail", request=None, response=None)

    def json(self):
        return self._payload


class FakeClient:
    def __init__(self, responses, observed):
        self.responses = iter(responses)
        self.observed = observed

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def get(self, url, *, params):
        self.observed.append((url, params))
        return next(self.responses)


def payloads(title="File:Audi A5 2020.jpg", license_name="CC BY-SA 4.0", name="Audi", model="A5", year=2020, description=None):
    search_responses = [FakeResponse({
        "query": {"search": [{"title": title, "snippet": f"{name} {model} model year {year}"}]}
    }) for _ in image_provider._commons_search_queries(name, model, year)]
    return search_responses + [FakeResponse({
            "query": {"pages": [{
                "title": title,
                "imageinfo": [{
                    "url": "https://upload.wikimedia.org/wikipedia/commons/a/a1/audi.jpg",
                    "mime": "image/jpeg",
                    "mediatype": "BITMAP",
                    "extmetadata": {
                        "Artist": {"value": "<a>Jane Driver</a>"},
                        "LicenseShortName": {"value": f"<span>{license_name}</span>"},
                        "LicenseUrl": {"value": "https://creativecommons.org/licenses/by-sa/4.0/"},
                        "ImageDescription": {"value": description or f"{name} {model} passenger car {year}"},
                    },
                }],
                "categories": [{"title": "Category:Automobiles by make"}],
            }]}
        })]


def use_responses(monkeypatch, responses):
    observed = []
    responses = iter(responses)
    monkeypatch.setattr(
        image_provider.httpx,
        "Client",
        lambda **_kwargs: FakeClient(responses, observed),
    )
    image_provider.clear_image_search_cache()
    return observed


def test_search_returns_verified_image_and_attribution(monkeypatch):
    observed = use_responses(monkeypatch, payloads())

    image = image_provider.search_vehicle_image("Audi", "A5", 2020)

    assert image is not None
    assert image.file_title == "File:Audi A5 2020.jpg"
    assert image.creator == "Jane Driver"
    assert image.license_name == "CC BY-SA 4.0"
    assert image.license_url == "https://creativecommons.org/licenses/by-sa/4.0/"
    assert image.match_kind == "exact"
    assert image.file_page_url.startswith("https://commons.wikimedia.org/wiki/File:")
    assert len(observed) == 2
    assert observed[0][1]["srnamespace"] == 6
    assert observed[0][1]["format"] == "json"
    assert observed[-1][1]["prop"] == "imageinfo|categories"


def test_search_query_removes_literal_punctuation_and_duplicate_year(monkeypatch):
    model = "A5 Sportback 40 TFSI (F5, 2020)"
    title = "File:Audi A5 Sportback 40 TFSI (F5, 2020) (52914443203).jpg"
    observed = use_responses(
        monkeypatch,
        payloads(title=title, name="Audi", model=model, year=2020),
    )

    image = image_provider.search_vehicle_image("Audi", model, 2020)

    assert image is not None
    assert observed[0][1]["srsearch"] == "audi a5 sportback 40 tfsi"


def test_supported_vehicle_fixtures_meet_the_documented_match_threshold(monkeypatch):
    supported = [
        ("Audi", "A5", 2020),
        ("Audi", "Q5", 2021),
        ("BMW", "3 Series", 2019),
        ("BMW", "X5", 2022),
        ("Tesla", "Model 3", 2023),
        ("Tesla", "Model S", 2020),
        ("Toyota", "Corolla", 2018),
        ("Volvo", "XC60", 2024),
        ("Skoda", "Octavia", 2021),
        ("Ford", "Focus", 2017),
    ]
    responses = [
        response
        for name, model, year in supported
        for response in payloads(
            title=f"File:{name} {model} {year}.jpg",
            name=name,
            model=model,
            year=year,
        )
    ]
    use_responses(monkeypatch, responses)

    matches = [
        image_provider.search_vehicle_image(name, model, year)
        for name, model, year in supported
    ]

    assert sum(match is not None for match in matches) / len(supported) >= 0.9


def test_association_rechecks_the_current_candidate_instead_of_trusting_preview_cache(monkeypatch):
    observed = use_responses(
        monkeypatch,
        payloads() + payloads(title="File:Audi A5 2020 newer.jpg"),
    )
    preview = image_provider.search_vehicle_image("Audi", "A5", 2020)
    assert preview is not None
    assert preview.file_title == "File:Audi A5 2020.jpg"

    resolved = image_provider.resolve_vehicle_image(
        "Audi", "A5", 2020, "File:Audi A5 2020.jpg"
    )
    assert resolved is None
    assert len(observed) == 4


def test_search_accepts_year_span_and_keeps_year_as_a_soft_preference(monkeypatch):
    span = "File:Audi A5 (2017-2020).jpg"
    use_responses(monkeypatch, payloads(title=span))
    assert image_provider.search_vehicle_image("Audi", "A5", 2019) is not None

    generation_only = "File:Audi A5 B9.jpg"
    use_responses(monkeypatch, payloads(title=generation_only, description="Audi A5 B9"))
    similar = image_provider.search_vehicle_image("Audi", "A5", 2019)
    assert similar is not None and similar.match_kind == "similar"


def test_search_selects_a_ranked_same_model_match_even_when_results_tie(monkeypatch):
    responses = [FakeResponse({
        "query": {"search": [
            {"title": "File:Audi A5 2020 front.jpg", "snippet": "Audi A5 2020"},
            {"title": "File:Audi A5 2020 side.jpg", "snippet": "Audi A5 2020"},
        ]}
    })]
    imageinfo = payloads()[1]._payload["query"]["pages"][0]["imageinfo"][0]
    responses.append(FakeResponse({"query": {"pages": [
        {"title": "File:Audi A5 2020 front.jpg", "imageinfo": [imageinfo]},
        {"title": "File:Audi A5 2020 side.jpg", "imageinfo": [imageinfo]},
    ]}}))
    use_responses(monkeypatch, responses)
    tied = image_provider.search_vehicle_image("Audi", "A5", 2020)
    assert tied is not None
    assert tied.file_title == "File:Audi A5 2020 front.jpg"

    use_responses(monkeypatch, payloads(title="File:Audi A5 2018.jpg", description="Audi A5 2018"))
    wrong_year = image_provider.search_vehicle_image("Audi", "A5", 2020)
    assert wrong_year is not None and wrong_year.match_kind == "similar"


def test_search_normalizes_compact_model_names_and_accepts_missing_year(monkeypatch):
    use_responses(monkeypatch, payloads(
        title="File:Tesla Model3 electric car.jpg",
        name="Tesla",
        model="Model 3",
        year=2020,
        description="Tesla Model3 electric car",
    ))
    image = image_provider.search_vehicle_image("Tesla", "Model3", 2020)
    assert image is not None
    assert image.match_kind == "similar"


def test_search_translates_romanian_bmw_series_names_for_commons(monkeypatch):
    observed = use_responses(monkeypatch, payloads(
        title="File:BMW 4 Series 2020.jpg",
        name="BMW",
        model="4 Series",
        year=2020,
        description="BMW 4 Series 2020 coupe",
    ))

    image = image_provider.search_vehicle_image("BMW", "Seria 4", 2020)

    assert image is not None
    assert image.match_kind == "exact"
    assert observed[0][1]["srsearch"] == "bmw 4 series"


def test_search_prefers_confirmed_model_year_over_a_model_only_candidate(monkeypatch):
    candidate_pages = []
    for title, description in (
        ("File:Tesla Model 3 electric.jpg", "Tesla Model 3 electric car"),
        ("File:Tesla Model 3 2020.jpg", "Tesla Model 3 2020 electric car"),
    ):
        details = payloads(
            title=title,
            name="Tesla",
            model="Model 3",
            year=2020,
            description=description,
        )[-1]._payload["query"]["pages"][0]["imageinfo"][0]
        candidate_pages.append({"title": title, "imageinfo": [details]})
    responses = [
        FakeResponse({"query": {"search": [
            {"title": page["title"]} for page in candidate_pages
        ]}}),
        FakeResponse({"query": {"pages": candidate_pages}}),
    ]
    use_responses(monkeypatch, responses)

    image = image_provider.search_vehicle_image("Tesla", "Model3", 2020)

    assert image is not None
    assert image.file_title == "File:Tesla Model 3 2020.jpg"
    assert image.match_kind == "exact"


def test_search_rejects_disallowed_license_and_untrusted_urls(monkeypatch):
    use_responses(monkeypatch, payloads(license_name="CC BY-NC 4.0"))
    assert image_provider.search_vehicle_image("Audi", "A5", 2020) is None


def test_search_rejects_missing_attribution_or_license_metadata(monkeypatch):
    missing_metadata = payloads()
    del missing_metadata[1]._payload["query"]["pages"][0]["imageinfo"][0]["extmetadata"]["Artist"]
    use_responses(monkeypatch, missing_metadata)
    assert image_provider.search_vehicle_image("Audi", "A5", 2020) is None

    missing_license = payloads()
    del missing_license[1]._payload["query"]["pages"][0]["imageinfo"][0]["extmetadata"]["LicenseUrl"]
    use_responses(monkeypatch, missing_license)
    assert image_provider.search_vehicle_image("Audi", "A5", 2020) is None


def test_search_rejects_toys_models_and_non_vehicle_results(monkeypatch):
    for description, categories in (
        ("Audi A5 toy car", [{"title": "Category:Toy cars"}]),
        ("Audi A5 scale model", [{"title": "Category:Model cars"}]),
        ("Audi A5 logo", [{"title": "Category:Automobile logos"}]),
        ("Audi A5", []),
    ):
        responses = payloads(description=description)
        responses[-1]._payload["query"]["pages"][0]["categories"] = categories
        use_responses(monkeypatch, responses)
        assert image_provider.search_vehicle_image("Audi", "A5", 2020) is None

def test_search_handles_api_errors_malformed_responses_and_honors_retry_after(monkeypatch):
    rate_limited = FakeResponse({}, status_code=429, headers={"Retry-After": "60"})
    observed = use_responses(monkeypatch, [rate_limited])
    assert image_provider.search_vehicle_image("Audi", "A5", 2020) is None
    assert image_provider.search_vehicle_image("BMW", "3 Series", 2020) is None
    assert len(observed) == 1

    use_responses(monkeypatch, [FakeResponse({"error": {"code": "badvalue"}})])
    assert image_provider.search_vehicle_image("Audi", "A5", 2020) is None

    use_responses(monkeypatch, [FakeResponse({"query": {"search": "not-a-list"}})])
    assert image_provider.search_vehicle_image("Audi", "A5", 2020) is None

    malicious = payloads()
    malicious[1]._payload["query"]["pages"][0]["imageinfo"][0]["url"] = "https://attacker.example/image.jpg"
    use_responses(monkeypatch, malicious)
    assert image_provider.search_vehicle_image("Audi", "A5", 2020) is None


def test_search_accepts_official_wikimedia_thumbnail_host(monkeypatch):
    responses = payloads()
    info = responses[1]._payload["query"]["pages"][0]["imageinfo"][0]
    info["thumburl"] = "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/audi.jpg/640px-audi.jpg"
    use_responses(monkeypatch, responses)

    image = image_provider.search_vehicle_image("Audi", "A5", 2020)

    assert image is not None
    assert image.image_url.startswith("https://thumb.wikimedia.org/wikipedia/commons/thumb/")


def test_search_failure_is_non_blocking_and_client_uses_timeout_and_user_agent(monkeypatch):
    observed = {}

    class FailedClient(FakeClient):
        def get(self, *_args, **_kwargs):
            raise httpx.ReadTimeout("private upstream detail")

    def create_client(**kwargs):
        observed.update(kwargs)
        return FailedClient([], [])

    monkeypatch.setattr(image_provider.httpx, "Client", create_client)
    image_provider.clear_image_search_cache()

    assert image_provider.search_vehicle_image("Audi", "A5", 2020) is None
    assert observed["timeout"].read > 0
    assert "User-Agent" in observed["headers"]
