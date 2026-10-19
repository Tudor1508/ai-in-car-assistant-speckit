# AI In-Car Assistant — SpecKit Edition

A spec-driven rebuild of [AI In-Car Assistant](https://github.com/Tudor1508/AI-InCar-Assistant), an application that helps drivers plan trips around their vehicle, route preferences and remaining fuel or battery range.

This repository uses SpecKit to organize feature requirements, implementation plans and development tasks alongside the application code.

## Features

- **Vehicle accounts and roles:** driver, administrator and producer partner access.
- **Vehicle garage:** save electric and combustion vehicles and view their details.
- **Vehicle status:** enter the current battery or fuel level and see the estimated remaining range.
- **Trip planning:** generate three route alternatives: fastest, balanced and scenic.
- **Interactive maps:** view routes and recommended fuel or charging stops.
- **AI concierge:** ask trip-related questions by voice or text and receive plain-language guidance.
- **Trip history:** review saved trips and route details.
- **Administrator dashboard:** view application usage and manage users, vehicles and producer accounts.
- **Producer dashboard:** review aggregated vehicle and trip activity and download PDF reports.
- **REST API:** explore backend endpoints through Swagger documentation.

## Spec-Driven Development

The project follows a specification-first workflow with SpecKit:

1. Describe and clarify a feature.
2. Create an implementation plan.
3. Break the plan into development tasks.
4. Implement and validate the feature against its specification.

SpecKit-related configuration and instructions are kept in `.specify/` and `.agents/`. Feature specifications and their supporting plans and tasks are organized in `specs/`. The project documentation also includes data model and API contract materials.

## Technology Stack

### Frontend

- Next.js
- React
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

### Database and external services

- SQLite for local development
- PostgreSQL support
- OpenRouteService for route calculation
- OpenStreetMap and Overpass for map data and nearby places

## Project Structure

```text
team3_git-happens/
├── .agents/       Agent instructions
├── .specify/      SpecKit configuration and templates
├── specs/         Feature specifications, plans and tasks
├── backend/       FastAPI API, database models, services, routers and tests
├── frontend/      Next.js application and UI components
├── docs/          Setup, API contract and project documentation
└── README.md
```

## Requirements

Install the following before running the application:

- Git
- Python 3.11 or newer
- Node.js 20 or newer
- npm
- An OpenRouteService API key

SQLite is used by default for local development. PostgreSQL is optional.

## Installation

Clone the repository:

```bash
git clone https://github.com/Tudor1508/ai-in-car-assistant-speckit.git
cd ai-in-car-assistant-speckit
```

### Backend

In a terminal, run:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

If PowerShell blocks virtual environment activation, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Edit `backend/.env` and set the required values:

```env
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRE_MINUTES=10080
OPENROUTESERVICE_API_KEY=your-openrouteservice-api-key
```

For PostgreSQL, configure `DATABASE_URL` using the format documented in the backend configuration.

Apply database migrations:

```powershell
alembic upgrade head
```

### Frontend

Open a second terminal in the project directory and run:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
```

Set the frontend variables in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_USE_MOCK_API=false
```

## Running the Application

Start the backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --port 8000
```

In a second terminal, start the frontend:

```powershell
cd frontend
npm run dev
```

Open the application and API documentation:

- Frontend: <http://localhost:3000>
- Backend API: <http://127.0.0.1:8000>
- Swagger documentation: <http://127.0.0.1:8000/docs>

## Useful Commands

Run backend tests:

```powershell
cd backend
pytest
```

Run frontend linting:

```powershell
cd frontend
npm run lint
```

Check TypeScript:

```powershell
cd frontend
npx tsc --noEmit
```

Create a production build:

```powershell
cd frontend
npm run build
```

## Roadmap

The presentation identifies these areas for future development:

- More precise café and hotel recommendations along a route.
- Personalized concierge advice based on driver preferences.
- Vehicle service reminders and maintenance recommendations.
- Email verification, password reset and social login.

## Security

Never commit `.env` or `.env.local` files, API keys, JWT secrets or database credentials. Use strong, unique secrets for each environment.

## Related Project

This repository is a SpecKit-based rebuild of the original [AI In-Car Assistant](https://github.com/Tudor1508/AI-InCar-Assistant).
