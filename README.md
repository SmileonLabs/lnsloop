# LNS Loop

Consent-based health research participation, Health Connect / HealthKit contributions, and server-verified points. Android and iPhone share the approved charcoal/mint mobile UI. A Fastify/PostgreSQL API and React operations console are included.

## Workspace

- `apps/patient-mobile`: Expo/React Native application and local Kotlin/Swift health module.
- `apps/api`: authentication, research versions, consent, submissions, encrypted records, points and exports.
- `apps/admin`: research and participant operations.
- `packages/contracts`: shared data validation and interfaces.

Node 24 and pnpm 11.19.0 are recommended. Install from this repository root:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
```

## Local synthetic-data verification

No OAuth account or Docker is required for the isolated test server:

```sh
pnpm dev:test-api
pnpm dev:admin
```

The API runs at localhost:4000 and admin at localhost:5173. Use the explicitly labeled development operator login. Create and publish a **test-only** study before testing participant flows. The test database and encryption key are ephemeral: restarting clears data. Never use real health records with this test server.

For the mobile app, copy its `.env.example` to `.env`, choose the API URL and enable `EXPO_PUBLIC_ENABLE_TEST_AUTH=true` only for this test environment. Android Emulator can access the host API at `http://10.0.2.2:4000`. For browser testing use `http://localhost:4000` and allow that browser origin in the API configuration.

```sh
pnpm --filter lns-loop-patient-mobile start
```

Health APIs require a native build, not Expo Go. Web views do not fabricate sensor data.

## PostgreSQL and Google sign-in

1. Copy root `.env.example` to `.env` and set the local PostgreSQL password.
2. Run `docker compose up -d db`.
3. Copy `apps/api/.env.example` to `apps/api/.env`; set DATABASE_URL and a base64 32-byte DATA_KEY. Generate the key locally with a cryptographically secure generator and retain it securely; changing it makes existing encrypted records unreadable.
4. Configure GOOGLE_CLIENT_IDS, ADMIN_GOOGLE_SUBJECTS and ADMIN_ORIGIN. Google subjects identify approved operators; client requests cannot grant roles.
5. Run `pnpm dev:api`. Database tables are initialized transactionally. API documentation: `http://localhost:4000/openapi.json`.
6. Set the mobile and admin OAuth client IDs in their respective environment files. Register the Android package/signing fingerprints and iOS reversed-client-ID URL scheme in Google Cloud.

OAuth registrations and production hosting were explicitly deferred by the user. Production refuses test auth; absent OAuth configuration returns a setup-pending error.

## Native builds

Android (JDK 17 and Android SDK required):

```sh
pnpm --filter lns-loop-patient-mobile exec expo prebuild --platform android --no-install
cd apps/patient-mobile/android
./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
```

On Windows use `gradlew.bat` and set ANDROID_HOME to the SDK location. Minimum Android API is 28. The workspace uses hoisted dependencies and shortened CMake output paths to avoid Windows path limits. APK output: `apps/patient-mobile/android/app/build/outputs/apk/debug/app-debug.apk`. Debug builds require the Metro server. For an x86_64 emulator build with `-PreactNativeArchitectures=arm64-v8a,x86_64`; use `adb reverse tcp:8081 tcp:8081` when connecting Metro over ADB.

If Windows resolves `localhost` to IPv6 only, start Expo with `--host lan`
and verify `http://127.0.0.1:8081/status` is reachable before launching the APK.
Use this only on a trusted development network.

iPhone, on macOS with Xcode 26.3 (Swift 6.2 or later) and CocoaPods:

```sh
pnpm --filter lns-loop-patient-mobile exec expo prebuild --platform ios
pnpm --filter lns-loop-patient-mobile ios
```

Enable HealthKit capabilities for the app identifier and configure Apple signing for devices. Without Google configuration the reserved placeholder URL scheme is present only to allow project configuration; the login UI remains disabled by its configuration check. A manually triggered **Native validation** GitHub workflow builds Android and the iOS simulator without production credentials.

## Tests and operational notes

```sh
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
pnpm --filter @loop/admin build
pnpm --filter lns-loop-patient-mobile export:web
pnpm --filter lns-loop-patient-mobile exec expo export --platform ios
```

Browser tests build an explicit test-mode web bundle. Re-export without test environment variables before publishing any web artifact. Neither browser tests nor iOS JavaScript exports prove physical HealthKit behavior.

See [implementation, platform differences and remaining configuration](docs/implementation/service.md). Older product documents describe historical proposals; the running service does not hardcode the Melbourne/UC research plan. No deployment or store publication is performed by these commands.
