# LNS Loop service implementation

## Current scope

The 2026-09-21 user instruction supersedes the historical Melbourne/UC proposal. Studies are configured by operators; the production application has no default disease, country, participant count, reward amount or research protocol. The approved charcoal/mint/silver design is retained.

User flow: Google identity → study description → versioned consent → configured eligibility questions → Health Connect / Apple Health connection → contribution preview or home one-touch submission → server review → points ledger. Home, Research, Points and Profile are real Expo Router tabs. Survey drafts and offline health submissions use native encrypted storage. The old Pulse and LoopPreview sources are archived and not entrypoints.

## Components

- `apps/patient-mobile`: Expo 57, React Native; Korean/English; feature screens under `src/loop/screens`.
- `apps/api`: Fastify, Google identity verification, opaque expiring sessions, PostgreSQL via Drizzle SQL, AES-256-GCM encryption for health payloads and eligibility answers.
- `apps/admin`: React/Vite operations UI; Google Identity Services login; research versions, questionnaires, reviews, points adjustments, retention-aware deletion, scoped exports.
- `packages/contracts`: shared Zod validation and health provider interfaces. API rejects unexpected health value fields and inappropriate types/periods.
- `modules/loop-health`: local Expo module. Kotlin uses Health Connect, WorkManager and Android Keystore. Swift uses HealthKit, observer queries, Keychain and CryptoKit.

## Data and points

Studies have localized text, recipient, start/end instants, collection types, consent text, retention days, period length, reward rules, eligibility questions and survey questions. Periods are anchored to the configured study start instant; they are not device-clock calendar days. Pending versions do not replace the active version until publication. A newly published version requires renewed consent.

Submissions are unique for user/study/activity/period. An enrollment row lock, DB uniqueness and transactions prevent simultaneous retries from producing multiple awards. The server computes points; it never accepts a client-provided award. Manual review supports approved, needs-correction and rejected states. Needs-correction submissions can be replaced for the same period without creating a new award. Approved awards require an explicit adjustment entry with an event ID and reason.

Research withdrawal stops new submissions and excludes the participant from new exports, while keeping existing points. Historical recipient downloads cannot be technically recalled. Retention policy is tied to the submitted study version. Deletion requests revoke sessions and stop sharing immediately; an operator can delete records only after applicable retention periods expire. A deployment must supply its approved policy rather than assuming this technical retention rule is a legal determination.

Rankings use opted-in nicknames and confirmed point totals. Ties share a rank. Exports contain study-scoped HMAC pseudonyms, payloads and provenance, not email or Google identity. Export authorization is checked again at download, with a 10-minute expiry and audit events.

## Platform semantics

Android: steps, distance, energy, exercise, sleep, heart rate, resting HR, RMSSD HRV, height, weight, body fat, blood pressure, glucose, oxygen saturation, respiratory rate, temperature, nutrition and hydration. Runtime availability and read permissions are checked. Historical and background permissions are separate. Cumulative step summaries use the platform aggregation API; raw overlapping records remain source-attributed, not naively summed. Sleep/heart/workout records spanning a submission boundary are clipped with explicit metadata; cumulative numeric records are not prorated.

iPhone: HealthKit read-only quantities, workouts, sleep categories, blood-pressure correlations, dietary quantities and water. HRV uses SDNN and is explicitly distinguished from Android RMSSD. Total-calorie data is not claimed as an equivalent HealthKit record type. Permissions on iOS cannot be inferred from a successful prompt; the connection UI reports recently readable records instead of claiming read authorization. A lack of results is not proof of denial or a zero measurement.

Automatic sharing is opt-in per study, checked by both client and server. Android uses periodic WorkManager work; iOS uses HealthKit observer delivery. Neither guarantees execution at a fixed time. The worker verifies current enrollment, consent version, publication status and automatic setting before reading/uploading. Sessions expire after seven days: reauthentication is required; this initial implementation does not silently refresh a Google session in background.

Only a study's listed types and valid period are transmitted. No health-data writes, GPS routes, reproductive-health data, hospital direct connections or medical-document uploads are included. Source metadata identifies provenance, not proof of clinical accuracy or fraud-proof hardware attestation.

## External configuration postponed by user

- Google Cloud web/Android/iOS OAuth registrations and Android signing certificate fingerprints.
- Production domain, hosting region, database credentials and encryption-key management/rotation.
- Real research documents, recipients, inclusion criteria, reward amounts, ethics approval and store health declarations.
- Final terms/privacy URL and support contact.
- Apple signing team/provisioning for physical devices and distribution.

Missing configuration is not replaced by a production mock. Test authentication requires explicit server and app configuration and is refused by the production server. `test-server.ts` is a separate, localhost-only, volatile synthetic-data server.

## Validation and limits

Verified locally: SQL integration tests using PGlite/PostgreSQL semantics; concurrent retries, access control, scope validation, corrections, consent versions, points adjustments, withdrawal, deletion retention and export expiry. Playwright exercises operator study creation/publication/review and mobile-web participation/survey/points. TypeScript and web/iOS JavaScript exports are checked. Android arm64 debug APK compiled successfully, including the Kotlin module.

2026-09-22 Android emulator check (API 36.1, x86_64): universal debug APK
installed and launched; explicit test login and research API worked; the native
Health Connect permission dialog requested only the test study's steps scope;
granting it updated the connection state. Empty records showed the no-data
explanation and disabled submission. No personal health records were used.
Android CI also compiled commit `689bfc3` successfully. The permission contract
was corrected to use ActivityResultRegistry (required on Android 14+) and the
subsequent local APK was rebuilt and exercised.

Native CI run [35619445006](https://github.com/SmileonLabs/lnsloop/actions/runs/35619445006)
passed for both platforms at commit `689bfc3`: Android arm64 debug APK and
iOS Simulator Debug app built with Xcode 26.3, including the local Kotlin/Swift
health modules. iOS compilation required the exact-version Expo JSI compatibility
patch documented in `patches/README.md`. This is an unsigned simulator build,
not a signed iPhone distribution or an on-device HealthKit test.

Not equivalent to completed device verification: PGlite tests are not a deployed PostgreSQL performance test; browser tests do not exercise Health Connect or HealthKit sensors. Physical Android/iPhone permission prompts, background behavior, TalkBack/VoiceOver and real Google sign-in remain dependent on devices/credentials. Windows cannot generate/build the iOS native project; the successful Apple native compilation was performed by the GitHub Actions macOS workflow, not inferred from a JavaScript export.

Security-sensitive follow-up before deployment: establish backup/recovery and key rotation, approved consent/retention documents and monitoring without health payload logging. Health-data collection in production remains subject to the platform policies and approved research configuration discussed with the user.
