# AI In-Car Assistant

AI In-Car Assistant is a full-stack trip-planning application for drivers. It combines route planning, vehicle management, range-aware stop recommendations, interactive maps and an AI travel assistant in one dashboard.

## Main features

- User registration, login, JWT authentication and profile management.
- Vehicle management for electric, combustion and hybrid vehicles.
- Fuel, battery and range information for each vehicle.
- Trip planning with fastest, shortest/balanced and scenic route options.
- Optional family-friendly stop recommendations.
- Interactive Leaflet map with route geometry, markers and recommended stops.
- Charging station, fuel station and tourist attraction suggestions along the route.
- Attraction details loaded from the map when available.
- Estimated distance, duration, cost and arrival range.
- Saved routes, frequently used routes and trip history.
- AI Concierge for questions about the planned journey.
- Light and dark themes.
- Administrator dashboard for users, vehicles, statistics and producer accounts.
- Producer dashboard with aggregated vehicle and route reports.
- FastAPI Swagger documentation.

## Application preview

### Authentication

#### Login

![Login page](docs/images/login.png)

#### Registration

![Registration page](docs/images/register.png)

### Main dashboard

The dashboard brings together trip planning, vehicle selection, route preferences and the interactive map.

![Main dashboard](docs/images/dashboard.png)

### Planning a route

Users can enter the origin and destination, choose the route type and select a vehicle.

![Plan a route](docs/images/plan_route.png)

Before planning, the application collects the current fuel level, battery level or available range of the selected vehicle.

![Set fuel or battery level](docs/images/set_fuel_or_battery.png)

After planning, the map displays the route, recommended stops and route details.

![Example route](docs/images/route_example.png)

### AI Concierge

The AI Concierge can answer questions about the planned journey and provide travel-related assistance.

![AI Concierge](docs/images/chatbot.png)

### User pages

![My vehicles](docs/images/my_vehicles.png)

![Trip history](docs/images/trip_history.png)

![Profile](docs/images/profile.png)

### Administration

Administrators can review application statistics and manage users, vehicles and producer accounts.

![Administrator dashboard](docs/images/admin_dashboard.png)

## Technology stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Material UI
- Tailwind CSS
- Leaflet and React Leaflet

### Backend

- Python 3.11+
- FastAPI
- SQLAlchemy
- Pydantic
- Alembic
- JWT authentication
- Argon2 password hashing

### External services

- OpenRouteService for route calculation and route geometry.
- OpenStreetMap and Overpass for map and nearby-place data.
- Geoapify for place and attraction data when configured.
- OpenAI for the AI Concierge.

## Project structure

```text
AI-InCar-Assistant/
├── backend/       FastAPI application, database, migrations, services, routers and tests
├── frontend/      Next.js application and UI components
├── docs/          Setup, API contract and project documentation
├── package.json   Root project configuration
└── README.md
```

## Requirements

- Git
- Python 3.11 or newer
- Node.js 20 or newer
- npm
- An OpenRouteService API key
- An OpenAI API key for the AI Concierge

The default local database is SQLite. PostgreSQL is also supported through `DATABASE_URL`.

## Local installation

### 1. Backend

From the project root, open a terminal and run:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If PowerShell blocks activation for the current terminal session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Create `backend/.env` with values for the local environment:

```env
DATABASE_URL=sqlite:///./data/app.db
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRE_MINUTES=10080
OPENROUTESERVICE_API_KEY=your-openrouteservice-api-key
OPENAI_API_KEY=your-openai-api-key
GEOAPIFY_API_KEY=your-geoapify-api-key
```

`DATABASE_URL` can be omitted to use the default SQLite database. For PostgreSQL, use for example:

```env
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/ai_incar_assistant
```

Apply all migrations:

```powershell
python -m alembic upgrade heads
```

### 2. Frontend

Open a second terminal in the project root:

```powershell
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_USE_MOCK_API=false
```

The frontend API URL must use the same port on which the backend is running.

## Running the application

Start the backend in the first terminal:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --port 8000
```

Start the frontend in the second terminal:

```powershell
cd frontend
npm run dev
```

Open:

- Application: http://localhost:3000
- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs

## Useful commands

Frontend type checking:

```powershell
cd frontend
npx tsc --noEmit
```

Frontend linting:

```powershell
npm run lint
```

Frontend production build:

```powershell
npm run build
```

Backend tests:

```powershell
cd backend
pytest
```

Create a new migration after a database model change:

```powershell
cd backend
python -m alembic revision --autogenerate -m "describe the change"
python -m alembic upgrade heads
```

## API overview

The API includes endpoints for:

- authentication, registration, profile and password management;
- vehicles and vehicle status;
- trip preview, trip planning and trip history;
- saved routes;
- attraction details and recommended stops;
- AI Concierge chat;
- administrator statistics and management;
- producer reports.

The complete schemas and endpoint documentation are available in Swagger at `/docs`. The repository also contains [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md).

## Troubleshooting

- **Routes cannot be calculated:** verify `OPENROUTESERVICE_API_KEY` and check whether the provider is available.
- **The frontend cannot reach the backend:** check that the backend is running and that `NEXT_PUBLIC_API_BASE_URL` uses the same port.
- **Login or database column errors:** run `python -m alembic upgrade heads` from `backend`.
- **AI Concierge is unavailable:** verify `OPENAI_API_KEY` and the backend logs.
- **Some attractions or stops are missing:** external OpenStreetMap, Overpass or Geoapify services may be rate-limited or temporarily unavailable.
- **Port 8000 is occupied:** start the backend on another port and update `NEXT_PUBLIC_API_BASE_URL` accordingly.
- **The map is blank:** check the browser console and network connection, then verify that the route provider returned route geometry.

## Security

Never commit the following files or values:

- `.env` and `.env.local` files;
- API keys;
- JWT secrets;
- database credentials.

Use a strong, unique `JWT_SECRET` for every environment.

## Additional documentation

- [`docs/SETUP.md`](docs/SETUP.md) - local setup instructions
- [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md) - API contract and integration details
- [`docs/SPRINT-2-INTEGRATION.md`](docs/SPRINT-2-INTEGRATION.md) - integration flow and verification checklist
- [`docs/PROJECT.md`](docs/PROJECT.md) - project information

## Project status

The application is currently in a demo-ready state. The `dev` branch is used as the integration branch for the current application flow.
