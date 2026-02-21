# Expense Manager — Web

React + Vite + TypeScript frontend for the Expense Manager API.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Starts the dev server (default `http://localhost:5173`). Set `VITE_API_BASE_URL` if the API runs elsewhere (e.g. `http://localhost:8000`).

## API client (OpenAPI)

Types and the typed client are generated from the API’s OpenAPI spec.

- **Generate:** With the API running, run:
  ```bash
  npm run generate:api
  ```
  This fetches `http://localhost:8000/openapi.json` and writes `src/api/schema.d.ts`. To use another URL, set `OPENAPI_SPEC_URL` (e.g. `OPENAPI_SPEC_URL=http://localhost:8080 npm run generate:api`).

- **Placeholder:** If you have not run codegen yet, `src/api/schema.d.ts` is a minimal placeholder so the app builds. Run `generate:api` when the API is available to get full type safety.

## Build

```bash
npm run build
```

## Environment

| Variable              | Description                    | Default              |
|-----------------------|--------------------------------|----------------------|
| `VITE_API_BASE_URL`   | Backend API base URL           | `http://localhost:8000` |
| `OPENAPI_SPEC_URL`    | OpenAPI spec URL for codegen   | `http://localhost:8000` |
