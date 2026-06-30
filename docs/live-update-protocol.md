# AI Quest — Live Update Protocol

## Rule
For every live change, always update and verify both sides:

1. Frontend/static files
2. Node API server code
3. Server restart/reload
4. Live smoke tests

Do not assume a frontend-only change is enough. The production app depends on the Node JSON API server for team state, submissions, photos, checkpoints, AI helper, and admin/instructor actions.

## Why
A previous issue happened because the HTML/JS frontend was updated, but the live Node API process was still running old code in memory. The result: new UI buttons called API routes that did not exist yet on the running server and returned `not_found`.

## Mandatory steps after code changes

### 1. Run local tests
```bash
cd package/ai-quest-app
npm test
```

### 2. Bump cache-busting
Update `index.html` query string for `styles.css` and `src/app/main.js`, e.g.
```html
?v=YYYYMMDD-short-description
```

### 3. Restart live Node API process
Restart the app server that runs:
```bash
npm start
# internally: node server.mjs
```

### 4. Verify live API health
```bash
curl -i https://opal.hai.tech/apps/eduapp/ai-quest/api/health
```
Expected:
- HTTP 200
- JSON with `ok: true`, `storage: json`

### 5. Verify frontend cache version
```bash
curl -i https://opal.hai.tech/apps/eduapp/ai-quest/
```
Expected:
- HTML includes the latest cache-busting version.

### 6. Smoke-test changed flows live
Depending on the change, test relevant live endpoints. Examples:

- Event code:
```bash
curl -i https://opal.hai.tech/apps/eduapp/ai-quest/api/events/by-code/GAVYAM
```

- AI helper:
```bash
POST /api/teams/:id/ai-helper
```

- Company completion:
```bash
POST /api/teams/:id/complete-company
```

- Photo delete:
```bash
POST /api/submissions/:id/delete
```

- Pause game:
```bash
POST /api/events/:id/pause
```

## Assistant operating rule
When changing AI Quest live behavior, always treat deployment as frontend + API together unless explicitly told this is local-only work.

Final response to user should include:
- local tests result
- live API health result
- live smoke test result for changed features
- whether a restart was performed
