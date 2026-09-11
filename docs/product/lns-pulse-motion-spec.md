# LNS Pulse Motion Specification

> Product scope note (2026-09-11): Read the [LNS Loop product brief](lns-loop-product-brief.md) first for current product scope. This document specifies the Pulse PoC; its 72-hour flow and example rewards do not define the 12-week UC study protocol.

- Status: implementation-ready v1.0
- Scope: patient mobile app, `Change detected` → `72-hour Pulse` → `Change capsule`
- Reference: `design/lns-loop-pulse-concept-v3.png`
- Product shell: **LNS Loop**
- Feature name: **LNS Pulse**

## 1. Purpose

This document specifies the motion, haptics, optional sound, copy, state transitions, and completion rules for the three-screen LNS Pulse flow. It is the implementation source of truth for this flow.

The signature motion language is:

> **Pulse → Trace → Seal**
> A change pulses once, traces a calm 72-hour path, and settles into a saved change capsule.

The motion must communicate causality without making a health change feel like an emergency, a diagnosis, or a financial game.

### 1.1 Product feeling

- Calm attention, not alarm
- Gentle momentum, not countdown pressure
- Closure and contribution, not celebration of a health outcome
- Premium and sensory, but never constantly moving

### 1.2 Non-goals

- Do not imply that a detected change is clinically good or bad unless an approved rule explicitly says so.
- Do not imply diagnosis, treatment advice, or medical urgency through motion alone.
- Do not use coin showers, confetti, slot-machine motion, price tickers, or trading sounds.
- Do not put medical or identity data in an animation event payload.
- Do not block interaction until an entrance animation finishes.

## 2. Shared motion system

### 2.1 Signature geometry

One visual signal persists conceptually across all three screens:

1. **Pulse:** a small luminous point and one expanding halo on the change-detection screen.
2. **Trace:** that point becomes the current-day anchor on the 72-hour progress loop.
3. **Seal:** the completed loop compresses into the outline of the change capsule.

The same accent order is retained throughout the flow:

- Teal: verified or completed
- Coral: current action or current change
- Lilac: future or supporting context

Red is reserved for a separately approved clinical-safety state. It must not be used for ordinary time pressure, incomplete tasks, or reward errors.

### 2.2 Duration tokens

| Token | Value | Use |
|---|---:|---|
| `motion.none` | `0ms` | Static state and test mode |
| `motion.press` | `90ms` | Button/card press-in |
| `motion.micro` | `160ms` | Icon, label, and number replacement |
| `motion.state` | `220ms` | Small state transition |
| `motion.enter` | `280ms` | Text and row entrance |
| `motion.card` | `320ms` | Card entrance/expansion |
| `motion.shared` | `440ms` | Shared signal/shape transition between screens |
| `motion.pulse` | `520ms` | One radial pulse |
| `motion.trace` | `600ms` | One-time line or ring reveal |
| `motion.signature` | `760ms` | Maximum normal first-view signature sequence |
| `motion.ribbonDraw` | `900ms` | Change-detected cubic-path trim per ribbon |
| `motion.ribbonStagger` | `80ms` | Delay between the three change-detected ribbons |
| `motion.loading` | `1200ms` | Loading-opacity cycle only |

An individual screen's actionable UI entrance should finish within `800ms`. The change-detected decorative ribbon tail is the single exception: three `900ms` trims staggered by `80ms` finish at `1060ms`, without delaying content or interaction. The UI must accept taps as soon as the route and required data are ready.

### 2.3 Easing tokens

| Token | Value | Use |
|---|---|---|
| `ease.standard` | `cubic-bezier(.2, 0, 0, 1)` | Micro state changes |
| `ease.softOut` | `cubic-bezier(.22, 1, .36, 1)` | Entrances and settling |
| `ease.shared` | `cubic-bezier(.65, 0, .35, 1)` | Shape continuity between screens |
| `ease.exit` | `cubic-bezier(.4, 0, 1, 1)` | Exits |
| `spring.pressRelease` | stiffness `260`, damping `26`, mass `1` | Button release only |

Do not use an overshooting spring on health values, progress, status chips, or reward amounts.

### 2.4 Transform limits

- Standard entrance translation: `8px` vertically
- Maximum decorative translation: `16px`
- Press scale: `1 → 0.98`
- Standard reveal scale: `0.96 → 1`
- Signal point reveal: `0.8 → 1`
- Halo scale: `1 → 1.7`
- No full-screen parallax
- No decorative rotation loops
- No more than three staggered items; stagger interval `40–50ms`, except the three change-detected ribbons which use `80ms`

### 2.5 Replay and deduplication

Every signature animation is event-based, not render-based. A component re-render must never replay it.

Persist these values per user and Pulse flow:

- `detection_motion_seen_at`
- `mission_started_motion_seen_at`
- `mission_completion_motion_seen_at`
- `capsule_seal_motion_seen_at`
- `last_success_haptic_event_id`

Mark a first-view animation as seen when it starts, not when it ends. If the app backgrounds, rotates, or loses the route during playback, the next visit shows the settled state instead of replaying the sequence.

A single domain event must have a stable `event_id`. Haptic, sound, analytics, and success motion must be deduplicated by that ID.

## 3. Haptic and sound policy

### 3.1 Haptic map

| Event | Haptic | Rule |
|---|---|---|
| New detection shown for the first time in foreground | `light` | Once per detection; never on revisit |
| Start recording | `selection` | After a successful tap acknowledgement |
| Individual required task verified | `light` | After server confirmation, not optimistic tap |
| Final required task completes the mission | `success` | Replaces the individual-task haptic |
| Capsule seals | `success` | Only if a success haptic was not already emitted for the same completion event |
| User-triggered action fails | `error` | At most once per failed attempt |
| Time warning or mission expiry | None | Never repeat or vibrate for pressure |
| Screen entrance/revisit/loading | None | Decorative motion does not generate haptics |

Respect OS-level haptic settings. Haptics are not a substitute for visible text and icons.

### 3.2 Success-haptic deduplication

Mission completion and capsule creation can occur close together. Emit only one success haptic when:

- the two states share the same `completion_event_id`; or
- a success haptic occurred less than `2,000ms` earlier.

### 3.3 Sound

- Sound effects default to **off**.
- No sound is allowed for change detection, countdown milestones, task reminders, loading, or errors.
- If the user explicitly enables sound effects, play one soft, non-financial completion chime of `≤400ms` when the mission is confirmed complete or the capsule seals.
- Never play both a mission-completion chime and a capsule-seal chime for the same event.
- Do not use coin, cash register, ticking clock, heartbeat, or medical-monitor sounds.

## 4. Reduced Motion

Reduced Motion is active when either condition is true:

- the OS accessibility setting requests reduced motion; or
- the user enables the app-level Reduce Motion preference.

The app-level preference may enable more reduction than the OS setting, never less.

When active:

- Remove shared-element transforms, path drawing, radial pulses, particle movement, ribbon movement, parallax, and capsule morphing.
- Replace screen entrances with a single `120–150ms` opacity fade.
- Replace state changes with an icon/text/color swap or `100–120ms` crossfade.
- Update countdown values without spatial movement.
- Keep the same content, reading order, timing truth, and tap targets.
- Keep haptic behavior governed separately by system haptic settings.
- Do not delay content to preserve the original animation timeline.

## 5. Shared loading, failure, and navigation behavior

### 5.1 Loading

If required data is not available within `150ms`, show a layout-stable skeleton. The skeleton may run a subtle opacity cycle:

- Opacity: `0.56 → 0.78 → 0.56`
- Duration: `1200ms`
- Easing: `ease.standard`
- No horizontal shimmer
- Reduced Motion: static opacity `0.68`

Decorative hero artwork must not animate until the data state is known.

While the Skia module or CanvasKit is being lazy-loaded in `full` or `reduced` mode, reserve the final artwork height with an empty, non-accessible placeholder. Do not render straight-line or approximate artwork that would visibly snap into the final cubic paths after Skia mounts. An explicit `static` build may still use its documented React Native fallback.

### 5.2 Failure

- Do not shake the card or flash red.
- Crossfade the affected region to an inline message in `motion.state`.
- Preserve completed user inputs.
- Trigger `error` haptic only after a user-initiated action fails.
- Automatic retries produce no haptic or sound.

### 5.3 Back gesture and interruption

- Interactive back gestures take control of the transition immediately.
- Cancel pending decorative sequences when a route loses focus.
- Never fire completion haptics, sound, or analytics after the user has left the route.
- On return, render the current persisted domain state rather than resuming a partial animation.

## 6. Screen 1 — Change detected

### 6.1 Route and purpose

- Suggested route ID: `pulse/change-detected`
- Purpose: explain that an unusual personal-data pattern was noticed and invite a short 72-hour record.
- Desired feeling: curiosity and agency, not warning.

### 6.2 Implementation copy

| Element | Exact Korean copy |
|---|---|
| Product header | `LNS Loop` |
| Eyebrow | `LNS PULSE` |
| Headline | `변화의 순간이 열렸어요` |
| Supporting copy | `평소와 다른 흐름이 기록되고 있어요.` |
| Signal 1 | `수면 변화` |
| Signal 2 | `증상 기록` |
| Signal 3 | `병원 기록 확인` |
| Mission title | `72시간 변화 기록` |
| Mission description | `하루 30초면 충분해요.` |
| Primary CTA | `기록 시작하기` |
| Primary CTA, starting | `기록을 준비하고 있어요` |
| Safety footer | `이 알림은 진단이 아니에요.` |
| Loading | `변화를 확인하고 있어요` |
| Load failure | `지금은 변화를 불러오지 못했어요.` |
| Retry CTA | `다시 시도하기` |
| Start failure | `기록을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.` |

The three signal labels are data-driven. Hide a signal card if that signal is not actually present. Do not invent a third signal to balance the layout.

### 6.3 Screen states

| State | Entry condition | Render |
|---|---|---|
| `loading` | Detection payload unavailable after `150ms` | Stable skeleton and loading copy |
| `first_reveal` | Valid unseen detection | Full Pulse entrance once |
| `settled` | Detection already seen | Final composition with short route fade and ambient loop |
| `starting` | CTA pressed and mission creation pending | CTA label `기록을 준비하고 있어요`; controls remain stable |
| `start_error` | Mission creation failed | Inline failure copy and `다시 시도하기` |
| `resolved` | Detection no longer eligible | Do not show stale CTA; route to current Pulse state |

### 6.4 First-reveal timeline

Run only when `state=first_reveal`, route is focused, data is valid, and Reduced Motion is off.

| Time | Element | Animation |
|---:|---|---|
| `0–160ms` | Navigation chrome | Opacity `0 → 1`, no translation |
| `60–340ms` | Eyebrow, headline, supporting copy | Opacity `0 → 1`, translateY `8 → 0`, `ease.softOut`; `45ms` stagger |
| `0–900ms` | Upper background ribbon | Draw the completed cubic path with `end: 0 → 1`; geometry stays fixed |
| `80–980ms` | Middle background ribbon | Draw the completed cubic path with `end: 0 → 1`; geometry stays fixed |
| `160–1060ms` | Lower background ribbon | Draw the completed cubic path with `end: 0 → 1`; geometry stays fixed |
| `240–420ms` | Focal signal point | Scale `0.8 → 1`, opacity `0 → 1` |
| `1060–1580ms` | Focal halo | After all three ribbons finish, scale `1 → 1.7`, opacity `0.18 → 0`, one pulse only |
| `330–650ms` | Signal cards | Opacity `0 → 1`, translateY `8 → 0`, `50ms` stagger |
| `440–760ms` | Mission invitation card | Opacity `0 → 1`, translateY `10 → 0`, scale `0.98 → 1` |
| `570–790ms` | Primary CTA and safety footer | Opacity `0 → 1` |

Each ribbon must be revealed only by trimming along its already completed cubic path. Do not morph, straighten, translate, or otherwise change its geometry during the first reveal, and do not let a luminous draw head run ahead of the trim front. After all three ribbons reach `end=1`, apply one short elastic recoil of approximately `1.5px`, then settle into a continuous `0.5–0.9px` low-amplitude wobble while the route is focused and the app is active. Keep every ribbon endpoint and the shared join point fixed; only internal cubic control points may move.

Start the narrow, color-tinted fluorescent shimmer only after all three ribbons have finished revealing at `1060ms`; its close bloom may then breathe gently. The focal point breathes over `4–5s`, and at most two tiny particles orbit the join point. This motion is decorative and must never imply a different measurement or progress value. Avoid flashes, abrupt resets, large white areas, or high-frequency noise.

### 6.5 CTA interaction and transition to Screen 2

Trigger: user taps `기록 시작하기`.

1. Press the CTA to scale `0.98` over `90ms`.
2. Release with `spring.pressRelease`.
3. Emit `selection` haptic after the tap is accepted.
4. Request or retrieve the server-owned mission.
5. Navigate only when a stable `mission_id`, `started_at`, and `expires_at` are available.
6. Carry the focal signal point into Screen 2 as shared element `pulse-signal-anchor` over `440ms`.

If the request exceeds `500ms`, update the CTA copy to `기록을 준비하고 있어요`. Do not use an indeterminate full-screen loader.

### 6.6 Accessibility announcement

On first reveal, announce after the route title:

> `평소와 다른 흐름이 기록되고 있어요. 이 알림은 진단이 아닙니다.`

Decorative ribbons, particles, and halo are hidden from the accessibility tree.

### 6.7 Reduced Motion replacement

- Render all final elements with one `150ms` opacity fade.
- Render all three ribbons immediately as their completed cubic curves; do not draw, recoil, wobble, shimmer, or emit a halo.
- Do not use a shared-element transition on CTA; use a route crossfade of `150ms`.
- Keep the safety footer visible without waiting for any sequence.

### 6.8 Completion conditions

The screen animation is complete when all first-reveal animations settle or are cancelled by navigation.

The product step is complete only when:

- the user taps the primary CTA;
- the backend returns a valid mission with authoritative UTC timestamps;
- the app persists `mission_id` and the mission state locally; and
- navigation to Screen 2 succeeds.

Animation completion alone must not mark the mission as started.

## 7. Screen 2 — 72-hour Pulse mission

### 7.1 Route and purpose

- Suggested route ID: `pulse/mission/:missionId`
- Purpose: show time remaining, today's required actions, verified context, and the completion reward.
- Desired feeling: calm momentum, never countdown anxiety.

### 7.2 Implementation copy

| Element/state | Exact Korean copy |
|---|---|
| Product header | `LNS Loop` |
| Eyebrow | `72시간 PULSE` |
| Remaining time | `{remainingHours}시간 남음` |
| Day completed | `DAY {dayNumber}` / `완료` |
| Current day | `DAY {dayNumber}` / `오늘` |
| Future day | `DAY {dayNumber}` |
| Section title | `오늘의 기록` |
| Task 1 | `30초 증상 체크` |
| Task 2 | `웨어러블 자동 연결` |
| Verified context | `약물 변경 확인됨` |
| Reward label | `완성 보상` |
| Reward amount | `+{rewardAmount} LNS` |
| Primary CTA, not started | `오늘 기록하기` |
| Primary CTA, partially complete | `기록 계속하기` |
| Primary CTA, verification pending | `기록 확인 중` |
| Primary CTA, today complete | `오늘 기록 완료` |
| Footer | `완벽하게 기록하지 않아도 괜찮아요.` |
| Loading | `오늘의 기록을 불러오고 있어요` |
| Offline | `연결되면 기록을 안전하게 보낼게요.` |
| Task failure | `기록을 저장하지 못했어요. 입력한 내용은 그대로 보관했어요.` |
| Retry CTA | `다시 보내기` |
| Expired title | `이번 기록 기간이 끝났어요` |
| Expired supporting copy | `괜찮아요. 완료한 기록과 보상은 그대로 남아 있어요.` |
| Expired CTA | `완료한 기록 보기` |

`rewardAmount`, `remainingHours`, task requirements, and verification labels are server-driven. Never hardcode `42` or `12` from the concept image.

### 7.3 Authoritative time rules

- `expires_at` is a server UTC timestamp.
- Derive display time from server-adjusted time, not raw device clock alone.
- Display whole hours using ceiling semantics while more than one hour remains.
- Below one hour, display `{remainingMinutes}분 남음`.
- At zero, transition to `expired` once; do not show a negative value.
- Update the number with a `160ms` opacity crossfade only when the displayed unit changes.
- Do not animate every second.
- The circular trace represents completed mission progress, not elapsed clock time.

### 7.4 Screen states

| State | Entry condition | Render |
|---|---|---|
| `loading` | Mission payload unavailable after `150ms` | Layout-stable skeleton |
| `active_first_entry` | Valid active mission entered from Screen 1 | Shared Trace entrance |
| `active_settled` | Active mission revisited | Static loop with short route fade |
| `task_editing` | User is completing a task | Preserve ring and time state |
| `task_submitting` | Local task submission pending | Task-level pending state only |
| `task_verifying` | Server accepted but not verified | `확인 중` on the affected row |
| `day_complete` | All required tasks for current day verified | Day node changes to complete |
| `mission_verifying` | All tasks submitted but final verification pending | CTA `기록 확인 중`; no success motion |
| `mission_complete` | Server confirms mission complete | Run completion transition once |
| `offline_queued` | Submission stored locally without network | Show offline copy; do not mark verified |
| `expired` | Authoritative time reaches zero before completion | Neutral expired state |
| `load_error` | Mission cannot be loaded | Inline retry state |

### 7.5 First-entry Trace timeline

Run only when entering with an unseen `mission_started` event and Reduced Motion is off.

| Time | Element | Animation |
|---:|---|---|
| `0–440ms` | Shared signal anchor | Move/morph from Screen 1 focal point to the current-day node, `ease.shared` |
| `60–660ms` | Mission loop | Reveal only the current real progress arc, never animate from false zero, `ease.softOut` |
| `100–380ms` | Eyebrow and remaining time | Opacity `0 → 1`, translateY `8 → 0` |
| `260–540ms` | Day labels | Opacity `0 → 1`, `45ms` stagger |
| `360–680ms` | Today's-record card | Opacity `0 → 1`, translateY `10 → 0` |
| `430–760ms` | Task rows | Opacity `0 → 1`, translateY `8 → 0`, `45ms` stagger for first three rows |
| `560–780ms` | CTA and footer | Opacity `0 → 1` |

After entrance, keep the data progress and current node position fixed to authoritative values. A short highlight may travel only across the completed arc over `6–8s`, fading to zero at both ends of its loop so the reset is invisible. The current-node halo and center haze may breathe slowly, but may not change the apparent progress or pulse faster than `4s`.

### 7.6 Task-row interaction

#### Press

- Scale the pressed row `1 → 0.985` over `90ms`.
- Restore it over `160ms` using `ease.standard`.
- Do not emit completion haptic on press.

#### Submission pending

- Keep the row in place.
- Replace the trailing arrow with a three-dot opacity loader.
- Use loading copy `보내는 중` for screen readers.
- Do not advance the trace or display a check.

#### Server verified

1. Morph the leading status icon into a check over `180ms`.
2. Lower the completed row's visual emphasis over `200ms`; do not remove it.
3. Advance only the verified portion of the loop over `320ms`.
4. Move the next required row upward by no more than `4px` over `240ms`.
5. Emit `light` haptic, unless this verification completes the mission.
6. Announce `{taskTitle} 완료` to assistive technology.

#### Submission failed

- Return the row to its editable state with a `220ms` crossfade.
- Preserve all entered data.
- Show the task-failure copy inline.
- Emit one `error` haptic because the failed action was user initiated.

### 7.7 Day completion

When all required tasks for a day are server-verified:

- Close that day's trace segment over `320ms`.
- Change the node label to `완료` over `160ms`.
- Use one `light` haptic unless the whole mission is also complete.
- Do not play sound.
- Optional tasks do not block day completion unless the study protocol marks them required.

### 7.8 Time-threshold changes

| Threshold | Visual treatment | Haptic/sound |
|---|---|---|
| More than 24 hours | Standard teal/coral state | None |
| 24 hours or less | Current node and time label fade to warm amber over `300ms` | None |
| 6 hours or less | Add explicit text `기록할 시간이 조금 남아 있어요.`; no pulsing | None |
| Expired | Fade active accent to neutral slate over `300ms`; show expired copy | None |

Do not use red unless the product introduces a separately reviewed clinical emergency state. Time remaining is not a clinical emergency.

### 7.9 Mission completion

Trigger only when the server returns `mission.status=completed` and every required task is `verified`.

1. Close the final gap in the loop over `260ms`.
2. Emit one soft halo from the completed loop over `480ms`.
3. Crossfade the CTA to `오늘 기록 완료` over `220ms`.
4. Emit one `success` haptic.
5. If sound effects are enabled, play the optional completion chime once.
6. Begin the transition to Screen 3 only after `capsule.status=ready`, or show the capsule-generation state.

Do not wait for reward transfer to mark the mission complete. Mission completion and reward confirmation are separate states.

### 7.10 Expiry

Trigger from authoritative server-adjusted time.

- Do not collapse, drain, shake, or break the loop.
- Crossfade to a neutral ring and expired copy over `300ms`.
- Preserve verified day segments.
- Keep accrued, verified rewards visible.
- Emit no haptic and no sound.
- Disable new task submission, but allow locally queued pre-expiry submissions to reconcile according to backend policy.

### 7.11 Accessibility announcement

On settled entry, announce:

> `72시간 변화 기록. {remainingHours}시간 남음. 오늘 완료할 항목 {requiredTaskCount}개.`

When less than one hour remains, substitute minutes. Decorative loop artwork and particles are hidden from the accessibility tree.

### 7.12 Reduced Motion replacement

- Replace the shared signal transition and ring draw with a `150ms` whole-screen fade.
- Render the correct progress ring immediately.
- Replace task verification with an immediate check icon plus `100ms` color crossfade.
- Do not move the next task row.
- Replace mission completion with a static completed ring and success icon; haptic policy remains unchanged.

### 7.13 Completion conditions

A day is complete only when all server-designated required tasks for that day are `verified`.

The mission is complete only when:

- `mission.status=completed` is received from the backend;
- all required task IDs are `verified`;
- the completion event has a stable `completion_event_id`; and
- the final progress state is persisted locally.

The following do **not** complete the mission:

- a tap on a task row;
- local form submission alone;
- an offline-queued request;
- an optimistic client checkmark;
- reaching the end of the entrance animation; or
- reward confirmation by itself.

## 8. Screen 3 — Change capsule

### 8.1 Route and purpose

- Suggested route ID: `pulse/capsule/:capsuleId`
- Purpose: preserve the verified before/change/after story, show validated insights, and acknowledge research contribution.
- Desired feeling: relief, meaning, and quiet closure.

The capsule should read as a translucent record vessel or time capsule, not as a two-tone pharmaceutical pill.

### 8.2 Implementation copy

| Element/state | Exact Korean copy |
|---|---|
| Product header | `LNS Loop` |
| Screen title | `변화 캡슐` |
| Verification badge | `병원 기록 확인됨` |
| Timeline point 1 | `변화 전` |
| Timeline point 2 | `약물 변경` |
| Timeline point 3 | `변화 후` |
| Insight 1, validated recovery | `수면 리듬 회복` |
| Insight 1, neutral fallback | `수면 리듬 변화` |
| Insight 2 | `복통 변화 기록` |
| Contribution confirmed | `연구 기여가 완료됐어요` |
| Reward confirmed | `+{rewardAmount} LNS` |
| Primary CTA | `내 변화 보기` |
| Privacy footer, implementation copy | `이름과 연락처를 뺀 연구용 기록으로 전달돼요.` |
| Capsule generation title | `변화 캡슐을 만들고 있어요` |
| Capsule generation supporting copy | `확인된 기록을 안전하게 정리하는 중이에요.` |
| Reward pending | `보상 확인 중` |
| Load failure | `지금은 변화 캡슐을 불러오지 못했어요.` |
| Retry CTA | `다시 시도하기` |

The concept-image footer `개인정보 없이 연구에 전달돼요.` is deprecated for implementation because health data can remain regulated personal information even when direct identifiers are removed. Use the implementation copy above unless compliance approves a more precise jurisdiction-specific alternative.

Display `수면 리듬 회복` only when an approved, versioned interpretation rule has established recovery relative to baseline. Otherwise display `수면 리듬 변화`. Motion must never infer recovery.

### 8.3 Screen states

| State | Entry condition | Render |
|---|---|---|
| `generating` | Mission complete but capsule not ready | Static vessel placeholder and generation copy |
| `ready_first_reveal` | Capsule ready and seal animation unseen | Full Seal sequence once |
| `ready_settled` | Capsule already viewed | Final static capsule with short route fade |
| `reward_pending` | Capsule ready, reward not confirmed | Contribution card shows `보상 확인 중`; no LNS amount |
| `reward_confirmed` | Reward amount and transaction state confirmed | Show contribution and amount |
| `details_opening` | User taps primary CTA | Container transition to detail |
| `load_error` | Capsule cannot be loaded | Inline failure and retry |

The verification badge is shown only when the backend supplies a verified hospital-record source for this capsule. Hide the badge completely otherwise; do not replace it with a visually equivalent claim.

### 8.4 First-reveal Seal timeline

Run only when `capsule.status=ready`, the seal event is unseen, the route is focused, and Reduced Motion is off.

| Time | Element | Animation |
|---:|---|---|
| `0–440ms` | Completed mission loop | Shared transform into capsule outline, `ease.shared` |
| `100–620ms` | Internal teal/coral/lilac ribbons | Masked reveal along the capsule interior; then transition into slow ambient drift |
| `180–500ms` | Up to three record fragments | Translate no more than `16px` toward the vessel and fade into it |
| `340–580ms` | Capsule opening seam | Close the final gap over `240ms` |
| `390–670ms` | Verification badge and timeline | Opacity `0 → 1`; timeline nodes stagger by `45ms` |
| `460–740ms` | Insight cards | Opacity `0 → 1`, translateY `8 → 0`, `45ms` stagger |
| `540–760ms` | Contribution card, CTA, privacy footer | Opacity `0 → 1` |

After sealing, run one surface highlight over `280ms`, then keep each internal ribbon's endpoints fixed while its cubic control points interpolate by no more than `3px` on offset `8–10s` curves. A narrow tinted fluorescent band may cross the strands, and two low-opacity radial color fields may drift slowly under the glass surface. Up to two dim particles may rise inside the mask and fade fully before their positions reset. The outline may breathe within a narrow opacity range. Do not add flashing sparkles, broad white bands, fast bobbing, or motion that escapes the capsule mask.

### 8.5 Seal haptic and sound

At the moment the capsule seam closes:

- emit `success` haptic only if the same `completion_event_id` has not already produced one; and
- play the optional completion chime only when sound effects are enabled and the same event has not already produced it.

Opening a previously completed capsule never emits success feedback.

### 8.6 Reward reveal

- Reveal the reward only after `reward.status=confirmed`.
- Fade in the LNS mark with scale `0.96 → 1` over `180ms`.
- Fade in `+{rewardAmount} LNS` over `220ms` without counting through intermediate numbers.
- Do not animate live fiat value or token price on this screen.
- If the reward is pending, show `보상 확인 중` and no placeholder amount.
- A later transition from pending to confirmed may use the same `180–220ms` reveal and one `light` haptic, but not a second success haptic.

### 8.7 Timeline and insight rules

- The three timeline points appear left to right: `변화 전` → `약물 변경` → `변화 후`.
- The line may reveal once over `320ms`; its nodes follow at `45ms` intervals.
- Never show `약물 변경` unless that event is verified by the configured source policy.
- Insight charts draw once over `320ms` from left to right only after their values are ready.
- Revisited capsules show static charts.
- Chart motion does not change scale or exaggerate variation.
- Decorative chart points are hidden from the accessibility tree; the card exposes a plain-language summary.

### 8.8 Primary CTA

Trigger: user taps `내 변화 보기`.

1. Press button to `0.98` over `90ms` and release over `160ms`.
2. Expand the capsule card into the change-detail view using a `340ms` container transform.
3. Move capsule artwork no more than `6px`; do not rotate it.
4. Reveal up to three summary sections with a `45ms` stagger.
5. Keep focus on the destination heading for screen-reader users.

Reduced Motion uses a `150ms` route crossfade with no shape transform.

### 8.9 Accessibility announcement

When the capsule is ready and reward confirmed, announce:

> `변화 캡슐 완성. {rewardAmount} LNS 보상이 확정되었습니다.`

When reward is pending, announce:

> `변화 캡슐 완성. 보상을 확인하고 있습니다.`

Decorative vessel ribbons, glow, particles, and rings are hidden from the accessibility tree.

### 8.10 Reduced Motion replacement

- Show the completed capsule illustration without morphing, fragment travel, line drawing, highlight sweep, or particles.
- Fade the title, capsule, timeline, insights, contribution card, CTA, and footer in together over `150ms`.
- Reveal a newly confirmed reward with text/icon replacement and a `100ms` opacity fade.
- Keep all verification and conditional-copy rules unchanged.

### 8.11 Completion conditions

The capsule is ready only when:

- `capsule.status=ready` is received from the backend;
- its before/change/after data references are available;
- every displayed verification badge and insight has a valid source state; and
- `capsule_id` and `capsule_version` are persisted locally.

Research contribution is complete only when the backend explicitly returns the corresponding contribution status. Reward is complete only when `reward.status=confirmed`; a completed mission alone must not display a confirmed LNS amount.

The Seal animation is complete when its final visual state settles or is cancelled. Animation completion must not mutate capsule, contribution, or reward domain status.

## 9. Cross-screen transition contract

| From | To | Shared element | Duration | Fallback |
|---|---|---|---:|---|
| Change detected | 72-hour mission | `pulse-signal-anchor` point → current-day node | `440ms` | `150ms` crossfade |
| 72-hour mission | Change capsule | completed loop → capsule outline | `440ms` | `150ms` crossfade |
| Change capsule | Change detail | capsule card → detail header/card | `340ms` | `150ms` crossfade |

Use a shared transition only when both source and destination layouts are measured and ready. If either is unavailable, use the fallback crossfade; never delay navigation to wait for decorative geometry.

## 10. Analytics events

Analytics must describe product interaction, not frame-level animation callbacks. Do not include raw symptoms, diagnosis, medication names, hospital names, identity values, wallet addresses, or free text.

| Event | Required properties |
|---|---|
| `pulse_detection_viewed` | `detection_id`, `first_view`, `reduced_motion` |
| `pulse_mission_start_requested` | `detection_id` |
| `pulse_mission_started` | `mission_id`, `start_source` |
| `pulse_task_submission_requested` | `mission_id`, `task_type` |
| `pulse_task_verified` | `mission_id`, `task_type`, `day_number` |
| `pulse_mission_completed` | `mission_id`, `completion_event_id` |
| `pulse_mission_expired` | `mission_id`, `verified_task_count` |
| `pulse_capsule_viewed` | `capsule_id`, `first_view`, `reward_state`, `reduced_motion` |
| `pulse_capsule_detail_opened` | `capsule_id` |

Use opaque IDs. The analytics system must not be the source of truth for replay prevention or completion state.

## 11. Accessibility and content safeguards

- Minimum tap target: `44×44pt` on iOS and `48×48dp` on Android.
- Maintain WCAG AA text contrast in both glow and non-glow regions.
- Do not place body copy directly over moving ribbons.
- Dynamic Type/font scaling must not clip countdown, reward, or CTA text.
- Focus order follows: header → status/time → content → primary CTA → safety/privacy footer.
- Do not move screen-reader focus during decorative transitions.
- Notifications outside the app must use neutral copy such as `새로운 기록 요청이 있어요`; they must not expose a condition or medication on the lock screen.
- A safety or clinical alert is a separate product state and must not reuse the coral countdown treatment without clinical review.

## 12. Acceptance checklist

### 12.1 All screens

- [ ] Motion uses the shared duration/easing tokens.
- [ ] No animation blocks a ready CTA.
- [ ] Signature animation runs once per stable domain event, not once per render.
- [ ] Revisit renders the settled state.
- [ ] Backgrounding, rotation, and back gestures do not replay or orphan feedback.
- [ ] OS and in-app Reduced Motion settings are honored.
- [ ] Reduced Motion preserves all content and completion semantics.
- [ ] Decorative elements are excluded from the accessibility tree.
- [ ] No medical/identity data is emitted in analytics or animation logs.
- [ ] Sound defaults off and never exposes a health state.
- [ ] Haptic feedback is deduplicated.

### 12.2 Change detected

- [ ] A cold load never shows straight ribbons before the final cubic paths appear.
- [ ] The three fixed-geometry cubic paths trim over `900ms` each with an `80ms` stagger and finish by `1060ms`.
- [ ] Elastic recoil begins only after all three ribbons are complete, stays near `1.5px`, and settles to a `0.5–0.9px` wobble with endpoints and the shared join fixed.
- [ ] Fluorescent shimmer starts only after all three ribbon reveals finish.
- [ ] Reduced Motion shows the three completed curves without draw, recoil, wobble, shimmer, or halo motion.
- [ ] The halo pulses once; the later ambient motion stays low-energy and decorative.
- [ ] Only real source signals are displayed.
- [ ] `이 알림은 진단이 아니에요.` is visible on first paint after data load.
- [ ] CTA navigation waits for a valid mission, not for animation completion.
- [ ] Start failure preserves the page and provides retry.

### 12.3 72-hour mission

- [ ] Countdown uses server-adjusted time and never becomes negative.
- [ ] The ring represents verified progress, not elapsed time.
- [ ] Task checks and ring advancement occur only after server verification.
- [ ] Offline submissions are visibly queued and not marked verified.
- [ ] The last task produces one success feedback event, not light plus success.
- [ ] Expiry is neutral and preserves accrued verified work.
- [ ] No countdown tick, shake, flash, or repeated vibration exists.

### 12.4 Change capsule

- [ ] Seal motion runs only for a ready, unseen capsule.
- [ ] The capsule does not continuously rotate, bob, or sparkle.
- [ ] Verification badge appears only for verified hospital-record data.
- [ ] `수면 리듬 회복` is guarded by an approved interpretation rule.
- [ ] Pending rewards never display a fabricated amount.
- [ ] Confirmed LNS amount is server-driven and does not count up.
- [ ] Implementation privacy copy is used instead of the deprecated mockup phrase.

## 13. Definition of Done

The LNS Pulse motion implementation is done when:

1. All three screens implement every applicable state in this document.
2. Pulse → Trace → Seal continuity works on supported iOS and Android devices, with crossfade fallback when shared geometry is unavailable.
3. Domain completion depends exclusively on backend-confirmed states; animation callbacks never create business state.
4. Haptic and optional sound behavior is event-deduplicated and respects system/user preferences.
5. Reduced Motion has been manually verified for every route and state.
6. Revisit, app background/foreground, device rotation, offline queue, expired mission, failed submission, reward pending, and reward confirmed have automated or documented QA coverage.
7. The flow maintains smooth interaction on the project's minimum supported low-end Android device and current supported iPhone baseline.
8. Product, design, accessibility, clinical/content, and engineering reviewers approve the acceptance checklist.
