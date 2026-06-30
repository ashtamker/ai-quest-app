# AI Quest — Checkpoint Design Notes

Date: 2026-06-24

## User clarification

- Food break should happen only once during the activity.
- Checkpoints are not just game milestones; their main purpose is instructional control:
  - make sure teams are not just wandering around the park
  - verify they are actually progressing in the mission
  - create periodic contact between teams and instructor
- At checkpoints, teams should physically/operationally return to the instructor.
- The continuation mechanism is not final yet:
  - option A: instructor gives a continuation code
  - option B: instructor gives a puzzle piece
  - option C: digital puzzle piece collected in-app
- A promising direction: digital puzzle pieces. Teams collect pieces through checkpoints and assemble the final puzzle at the end after building/improving the AI model.

## Proposed interpretation

Checkpoints should be implemented as gated progression points:

1. Team completes required progress threshold.
2. App asks team to return to instructor.
3. Instructor verifies progress and either approves or sends team back.
4. On approval, app grants:
   - next-stage access
   - optional continuation code confirmation
   - optional digital puzzle piece
5. At the end, the improved model + all collected puzzle pieces unlock the final screen/challenge.

## Food checkpoint

Food/restaurant checkpoint should be a one-time special checkpoint:

- Story framing: “גם בהייטק צריך לעצור, להיטען ולחזור חדים.”
- Task: photograph one restaurant/cafe logo in the park.
- Instructor can review/approve it like other photo checks.
- It should not repeat in every checkpoint.

## Implementation recommendation

Start with a checkpoint engine that supports different checkpoint types:

- `instructor_code`
- `instructor_approval`
- `food_photo`
- `digital_puzzle_piece`

For MVP, implement:

- progress thresholds by duration
- one food checkpoint
- instructor approval
- digital puzzle piece grant on approval
- final puzzle placeholder/screen

Avoid finalizing whether puzzle is physical or digital until UX is reviewed, but structure data so either can work.
