# Admin Delete Events + Runtime Cleanup — 2026-06-28

## Request
- Add an Admin option to delete other events.
- Deleting an event should also free server/data space by removing related runtime records and uploaded files.

## Implementation
- Added Admin button: `מחק אירוע` in the event editor tools.
- Button is disabled for active events to prevent deleting the live/current event by mistake.
- Added double confirmation in the Admin UI:
  1. Browser confirm explaining that teams, scores, photos and checkpoints will be removed.
  2. Prompt requiring exact text: `מחיקה`.
- Added protected API route:
  - `POST /api/admin/events/:id/delete`
  - also supports `DELETE /api/admin/events/:id`
- Admin code required.
- Server refuses to delete:
  - the last remaining event (`cannot_delete_last_event`)
  - an active event (`cannot_delete_active_event`)

## Cleanup performed
When an inactive event is deleted:
- Deletes the event record.
- Deletes teams for that event.
- Deletes submissions/photos records for those teams.
- Deletes checkpoint request records for those teams.
- Deletes instructor messages for that event.
- Deletes uploaded logo/checkpoint/puzzle files only when no remaining event/runtime record references the same URL.
- Closes any live SSE event streams for the deleted event.

## QA
- `npm test` passed: 45/45.
- Added isolated API test verifying:
  - active event deletion is blocked.
  - inactive event deletion succeeds.
  - related teams/submissions are removed.
  - uploaded photo file is removed from disk.
- Live cache version: `20260628-admin-delete-events-cleanup`.
- Live Node API restarted.
- Live smoke verified `/api/health`, cache version, Admin source markers, and safe active-delete block returning `400 cannot_delete_active_event`.
