# AI Quest — Production Sprint 5: Admin Puzzle Panel (2026-06-24)

## Goal
Add an Admin-managed image puzzle so the activity operator can upload a puzzle picture and choose how many pieces it contains.

## Implemented

### 1. Admin Puzzle tab
Added a new Admin tab: `פאזל`.

The panel supports per-event puzzle management:
- Select event.
- Upload puzzle image.
- Choose piece count.
- Preview current puzzle image.
- Save puzzle settings.

### 2. Event-level puzzle configuration
Each event can now store:
```json
{
  "puzzleConfig": {
    "pieceCount": 12,
    "imageUrl": "api/uploads/puzzles/...",
    "imageName": "..."
  }
}
```

Default puzzle config was added to the main event seed/data.

### 3. Puzzle image upload API
Added admin-only upload endpoint:

```http
POST /api/admin/events/:id/puzzle-image
```

Requirements:
- Admin code required.
- Accepts multipart form-data.
- Field `image`: png/jpg/jpeg/webp/svg.
- Field `pieceCount`: 1–48.

Uploaded files are stored under:
```text
server/uploads/puzzles/
```

Served through:
```text
api/uploads/puzzles/<file>
```

### 4. Repository support
Added:
- `uploadPuzzleImage(eventId, file, pieceCount)` in API repository.
- Local demo fallback stores the piece count and image metadata without real file upload.

### 5. Student puzzle rendering
Student UI now checks `cfg.event.puzzleConfig`.

If no image is uploaded:
- Keeps the old digital pieces display: `חלק 1`, `חלק 2`, etc.

If an image exists:
- Renders the uploaded image as a grid puzzle.
- The number of grid cells equals `pieceCount`.
- Revealed pieces are based on collected puzzle pieces from approved instructor checkpoints.
- Locked pieces show a numbered placeholder.

The image puzzle appears in:
- Student model bag.
- Final mission summary screen.

### 6. Styling
Added CSS for:
- Admin puzzle preview.
- Image puzzle grid.
- Locked/revealed puzzle pieces.
- Mobile-friendly layout.

### 7. Cache busting
Updated frontend cache version:
- `20260624-production-sprint5`

## Files changed
- `server.mjs`
- `server/data/events.json`
- `src/data/data-sources/local/seed.js`
- `src/data/repositories/ApiRepositories.js`
- `src/data/repositories/Repositories.js`
- `src/presentation/admin/AdminApp.js`
- `src/presentation/student/StudentApp.js`
- `styles.css`
- `index.html`
- `tests/api-flow.test.mjs`
- `tests/static-mobile.test.mjs`

## QA
Command:
```bash
npm test
```

Result:
- 37/37 tests passed.

New coverage:
- Admin puzzle upload requires admin code.
- Puzzle image upload persists event puzzle config.
- Uploaded puzzle image is served from `/api/uploads/puzzles/...`.
- Admin dashboard exposes Puzzle tab and puzzle form.
- API repository exposes `uploadPuzzleImage`.
- Student CSS supports image puzzle rendering.

## Operational note
Because `server.mjs` changed, the live Node server must be restarted/reloaded for puzzle image upload and serving to work in production.
