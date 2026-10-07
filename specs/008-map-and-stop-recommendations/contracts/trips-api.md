# Trips API Contract: Feature 008 Extension

## Compatibility and security

Feature 008 extends the existing authenticated `POST /trips/preview` contract in [Feature 007](../../007-trip-planning-dashboard/contracts/trips-api.md). It does not add a new endpoint, provider, or persistence model.

- All existing authentication, owner-scoped vehicle lookup, CSRF/origin checks, strict input validation, coordinate conventions, provider-key isolation, and `{ "data": ... }` success / shared `{ "error": ... }` error envelopes remain in force.
- The frontend calls only the authenticated Drive Wise API using the existing credentialed `apiRequest` wrapper. ORS/OpenPOIService calls remain backend-only.
- `route_preference` is optional. If omitted, the server follows the 007 path and retains the 007 response shape and behavior; no extra preference-comparison or tourist-POI work is triggered.
- When present, the value may be `fastest`, `shortest`, `scenic`, or `all`. The interactive planner sends `all` to generate canonical choices in one request; the three individual values remain supported for compatibility and focused preview clients. Null, unknown, and server-managed fields are rejected through existing validation conventions.
- New preview data is transient. Neither route preferences, candidate options, nor tourist POIs are saved as trip history.

## `POST /trips/preview`

### Request extension

The existing 007 request remains unchanged except for this optional field:

```json
{
  "origin": {
    "label": "Example origin",
    "latitude": 46.77,
    "longitude": 23.59,
    "provider_id": "provider-specific-id"
  },
  "destination": {
    "label": "Example destination",
    "latitude": 45.75,
    "longitude": 21.23,
    "provider_id": "provider-specific-id"
  },
  "vehicle_id": "32-character-lowercase-hex-id",
  "current_level_percent": 60,
  "route_preference": "scenic"
}
```

`route_preference` values:

| Value | Meaning |
|---|---|
| `fastest` | Ask ORS for its complete driving route using the fastest preference. |
  | `shortest` | Ask ORS for its complete driving route using the shortest preference. |
| `scenic` | Compare complete Fastest and Shortest routes, a complete ORS route requested with highways avoided, and any complete ORS alternatives returned for an eligible request. Count returned distinct POI features in categories `attraction` and `viewpoint` for each comparable candidate. Return the distinct routes tied at the maximum count. This compatibility mode is bounded to candidates ORS supplied, not a global optimum. |
| `all` | Calculate Fastest and Shortest, request one complete highways-avoiding route, then compare those and available ORS alternatives for Scenic. Return only the three canonical choices. If multiple candidates tie for the highest attraction count, use the quickest tied route for Scenic. If no attractions are found, Scenic remains available with `attraction_count: 0` and reason `no_attractions_found`. If POI comparison is incomplete or unavailable, Scenic uses the best-scoring checked candidate, or Fastest if no candidate could be checked, and includes the safe reason on the Scenic choice. |

The existing input validation and vehicle/range derivation described in the 007 contract apply unchanged. Scenic candidates are complete origin-to-destination routes; the existing 007 vehicle-compatible stop planner runs for each Scenic option returned. Each option carries its own route, legs, feasibility, energy stops, and attraction recommendations.

### Successful response when `route_preference` is provided

The existing top-level 007 `feasibility`, `vehicle`, `route`, `legs`, and `stops` fields remain present as a compatibility projection of `selected_route_option_id`. The extension adds the preference identity, selected option, candidate options, and `attractions` for that selected option. For `all`, the selected option initially is Fastest. `route_choices` maps Fastest, Shortest, and Scenic to an available option ID or an unavailable reason. Duplicate geometries share one option ID and are represented by `route_labels` on the option. The UI switches choices locally without another preview request.

```json
{
  "data": {
    "route_preference": "scenic",
    "selected_route_option_id": "request-option-1",
    "route_options": [
      {
        "id": "request-option-1",
        "attraction_count": 3,
        "feasibility": { "status": "complete", "message": null },
        "vehicle": {
          "id": "32-character-lowercase-hex-id",
          "current_level_percent": 60,
          "available_range_km": 240,
          "maximum_range_km": 400
        },
        "route": {
          "geometry": { "type": "LineString", "coordinates": [[23.59, 46.77], [23.6, 46.78]] },
          "distance_m": 320000,
          "duration_s": 14400
        },
        "legs": [
          { "sequence": 1, "distance_m": 180000, "duration_s": 8100 },
          { "sequence": 2, "distance_m": 140000, "duration_s": 6300 }
        ],
        "stops": [],
        "attractions": [
          {
            "source_id": "source-id-if-provided",
            "name": "Example viewpoint",
            "category": "viewpoint",
            "latitude": 46.5,
            "longitude": 23.1,
            "sequence": 1,
            "route_progress_m": 125000
          }
        ]
      },
      {
        "id": "request-option-2",
        "attraction_count": 3,
        "feasibility": { "status": "incomplete", "message": "Safe 007 feasibility explanation" },
        "vehicle": {
          "id": "32-character-lowercase-hex-id",
          "current_level_percent": 60,
          "available_range_km": 240,
          "maximum_range_km": 400
        },
        "route": {
          "geometry": { "type": "LineString", "coordinates": [[23.59, 46.77], [23.61, 46.79]] },
          "distance_m": 329000,
          "duration_s": 14700
        },
        "legs": [
          { "sequence": 1, "distance_m": 210000, "duration_s": 8900 }
        ],
        "stops": [],
        "attractions": []
      }
    ],
    "feasibility": { "status": "complete", "message": null },
    "vehicle": {
      "id": "32-character-lowercase-hex-id",
      "current_level_percent": 60,
      "available_range_km": 240,
      "maximum_range_km": 400
    },
    "route": {
      "geometry": { "type": "LineString", "coordinates": [[23.59, 46.77], [23.6, 46.78]] },
      "distance_m": 320000,
      "duration_s": 14400
    },
    "legs": [
      { "sequence": 1, "distance_m": 180000, "duration_s": 8100 },
      { "sequence": 2, "distance_m": 140000, "duration_s": 6300 }
    ],
    "stops": [],
    "attractions": [
      {
        "source_id": "source-id-if-provided",
        "name": "Example viewpoint",
        "category": "viewpoint",
        "latitude": 46.5,
        "longitude": 23.1,
        "sequence": 1,
        "route_progress_m": 125000
      }
    ]
  }
}
```

The example's names, identifiers, coordinates, and metrics are illustrative schema values, not test fixtures or promised live results. `source_id` and `name` are optional and are returned only when OpenPOIService supplies them. `category` is `attraction` or `viewpoint` when the response identifies it. A recommendation includes usable source coordinates so it can be represented on the map. `route_progress_m` is the position along the returned route measured from its origin, not a road detour distance to the attraction. Recommendations are ordered by this progress value. No description, rating, hours, availability, or visit state is synthesized.

`route_options` contains:

- One option for Fastest or Shortest.
- For Scenic, all distinct candidates tied at the greatest distinct returned POI-feature count. `attraction_count` is the count used for that comparison. Distinct source feature IDs are counted once; where no source ID is supplied, each returned feature is treated as its own feature. No name/proximity-based deduplication is performed.
- A request-scoped opaque `id`; IDs are not stable across previews and must not be persisted or used as historical identifiers.
- For `all`, at most three canonical route geometries are returned. `route_labels` identifies which of Fastest, Shortest, and Scenic each option represents. ORS alternatives used to score Scenic are not exposed as separate choices.

For route options, `route`, `legs`, and `stops` follow 007 meanings. The route geometry and distance/duration include any 007 energy-stop routing behavior for that option. `attractions` remain a separate recommendation collection; they do not alter geometry or feasibility and are excluded from `stops` and energy-stop counts. The response's `duration_s` is estimated driving time and excludes stop dwell time.

### Empty attractions

For the interactive `all` mode, zero POIs do not disable Scenic: the quickest candidate among the zero-score routes remains available with `attraction_count: 0` and reason `no_attractions_found`. If POI retrieval fails or is limited, use the best-scoring candidate whose POIs were returned; if none were returned, use Fastest and set a safe reason such as `poi_geometry_limit` or `provider_unavailable`. Incomplete POI coverage is disclosed to the user.

### Scenic unavailable

When the request is valid but a Scenic comparison cannot be completed, return HTTP 422 with the existing error envelope and code `route_preference_unavailable`. Do not return a Fastest/Shortest route as a Scenic success.

For each complete Scenic candidate within ORS's 500 km projected linestring maximum, adapt the tourist POI query buffer to fit ORS's 50 km2 maximum area. Use `min(configured_corridor_m, 2000, 25000000 / projected_route_length_m)`, where the existing projected-length estimate is used for the area calculation and the 500 km preflight. This adaptive buffer applies only to the `attraction` and `viewpoint` POI request. Keep the configured 007 fuel/charging query buffer unchanged. The reduced buffer may omit attractions farther from long routes. Do not split route linestrings to bypass a provider limit.

```json
{
  "error": {
    "code": "route_preference_unavailable",
    "message": "Scenic recommendations are unavailable for this route. Choose Fastest or Shortest.",
    "details": [
      { "preference": "scenic", "reason": "no_distinct_candidates" }
    ],
    "request_id": "request-id"
  }
}
```

Safe `details.reason` values are `no_distinct_candidates`, `poi_geometry_limit`, `poi_results_incomplete`, or `candidate_comparison_unavailable`. The message gives a plain-language explanation and offers Fastest/Shortest. No raw ORS/OpenPOIService message or credential is exposed. A provider timeout, rate limit, malformed response, or outage continues to use the existing safe provider error mapping (502/503); it is not represented as a successful empty result.

Do not return a Scenic success if a candidate's whole geometry exceeds OpenPOIService's documented 500 km projected linestring limit, its query exceeds other applicable provider limits, or the configured POI result limit is reached and could have truncated the feature list. Do not query by splitting the route into segments. Fastest and Shortest remain usable for these trips.

### Result and loading state requirements

- The API returns the selected preference and selected route option with the same geometry/metrics/legs/feasibility/stops/attractions. The frontend must not combine fields from different options.
- The frontend may choose another returned Scenic option locally. It updates the map, summary, feasibility, energy-stop list, and attraction list together.
- In `all` mode, empty or partial tourist results do not disable Scenic when a route exists; the Scenic choice includes a safe coverage reason. A routing provider failure still uses the existing provider error mapping; incomplete energy feasibility remains the existing 007 status.

## Unchanged 007 endpoints

`GET /trips/places`, `GET /trips/favorites`, and `POST /trips/favorites` remain as documented in the 007 API contract. No trip-history endpoint or persistence is added.
