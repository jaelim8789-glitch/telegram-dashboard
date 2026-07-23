# API Sync Guide

## Frontend ¡ê Backend Type Synchronization

The frontend uses **generated types** from the backend's OpenAPI spec, not hand-written types.

## Workflow

1. **Backend** ? Define/update Pydantic models in `telegram-dashboard-backend/app/models/` or `app/schemas/`
2. **Generate OpenAPI spec**:
   ```
   cd telegram-dashboard-backend
   python -c "from app.main import app; import json; open('../openapi.json','w').write(json.dumps(app.openapi(), indent=2))"
   ```
3. **Generate frontend types**:
   ```
   npm run typegen
   ```
   This runs: `npx openapi-typescript openapi.json -o src/lib/api.types.ts`

## Rules

- **NEVER hand-write frontend types for backend responses** ? always use `npm run typegen`
- The backend is the source of truth for the wire format (snake_case)
- If the generated types arent matching, check that:
  1. The backend is running and accessible
  2. `openapi.json` reflects the latest schema (regenerate it)
  3. `api.types.ts` is checked into git (it changes when the API contract changes)

## Troubleshooting

- `openapi.json` contains `{"detail":"Not Found"}` ? the backend isnt running or the endpoint is wrong
- Generated types have `any` fields ? the Pydantic model might use `dict` or `Json` without a schema
- Snake_case in generated types ? this is correct; the wire format is snake_case
