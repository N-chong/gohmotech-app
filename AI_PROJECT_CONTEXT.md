# GoHMoTech Mobile App — AI Project Context

> Paste this entire file into a new AI conversation before asking that AI to modify the project. It describes the repository as it exists on 2026-09-28. When this document and the source code disagree, the source code is authoritative and this document should be updated.

## Copy-ready instruction for another AI

You are working on the **GoHMoTech mobile app**, an authenticated Ionic/Vue client for goat-farm owners and operators. Read this complete document before changing code. Inspect the relevant source files before implementing a request. Preserve the existing backend contracts, authentication model, connectivity safeguards, Ionic navigation behavior, and visual language. Do not invent API endpoints, simulated telemetry, historical data, or unsupported marketplace features. Never expose tokens, credentials, realtime tickets, or environment secrets. After a change, run the smallest relevant tests plus the full build; report any verification that could not be run.

## 1. Product summary

GoHMoTech is a farm monitoring and control client. It gives authenticated users access to:

- A live farm dashboard with system health, environment readings, feed status, herd count, automation state, and recent alerts.
- Camera discovery and ticket-authenticated live camera streams.
- Goat inventory search/filtering and detailed goat profiles with images, weights, health information, vaccination information, and recent activity.
- Farm notifications that can be filtered, expanded, and marked as read.
- BLE-based goat proximity and receiver tracking snapshots.
- Protected door, light, and feeder actuator status/control.
- Security detection events with authenticated snapshots and confidence/review details.
- Current-state farm intelligence assembled from dashboard, herd, tracking, and security endpoints.
- A marketplace preview/workspace whose authenticated mobile backend integration is not yet implemented.

This repository is the **frontend/mobile client only**. The backend, IoT controllers, BLE receivers, cameras, security processing, and persistent farm database are external systems hosted by GoHMoTech.

### Product truth rules

- Display only values returned by the backend or values directly derived from them.
- Do not fabricate sensor readings, device connectivity, historical charts, feed levels, marketplace listings, or command success.
- A WebSocket frame is an invalidation signal; refresh the authoritative HTTP resource instead of treating an arbitrary frame as final state.
- Physical controls must fail closed when either the server or the relevant controller is not confirmed online.
- Marketplace catalog and transaction data must remain clearly marked unavailable until real authenticated endpoints exist.
- Reports are current snapshots, not historical analytics. Historical curves and date comparisons need real time-series endpoints.

## 2. Technology and build targets

| Area | Technology |
| --- | --- |
| UI framework | Vue 3.5, Composition API, single-file components |
| Mobile UI/navigation | Ionic Vue 9 and Ionic Vue Router |
| Language | TypeScript 5.9 in strict mode |
| Web build | Vite 8 |
| Native bridge | Capacitor 8 |
| Native target | Android (`com.gohmotech.owner`) |
| Native session storage | `@aparajita/capacitor-secure-storage` |
| Icons and feedback | Ionicons and Capacitor Haptics |
| Unit tests | Vitest with jsdom |
| End-to-end tests | Cypress |
| Styling | Ionic CSS plus project-wide CSS variables and `src/theme/app.css` |

Current package version: `1.5.0`. Android uses version name `1.5`, version code `15`, minimum SDK 24, compile/target SDK 36, Android Gradle Plugin 8.13.0, and Gradle 8.14.3.

There is no Pinia/Vuex store. Shared state is implemented with Vue `reactive` objects exposed through `readonly` wrappers.

## 3. Architecture at a glance

```text
App startup
  -> authService.bootstrap()
      -> secure native storage OR browser localStorage
      -> validate saved session against /api/mobile/dashboard/
      -> refresh once on eligible 401 responses
  -> router auth guard
  -> tab layout and route-split pages
      -> typed service modules
          -> central apiRequest() wrapper
              -> GoHMoTech HTTPS API
      -> selected pages open ticket-authenticated WebSockets
          -> RefreshScheduler coalesces event bursts
          -> page reloads authoritative HTTP data
```

Important architectural properties:

- Pages are lazy-loaded through `src/router/index.ts`.
- The five main tabs are Home, Live, Goats, Alerts, and More.
- Secondary pages remain children of `/app` but set `meta.hideTabs: true`. This keeps them in the same Ionic router outlet and preserves correct back navigation.
- All authenticated HTTP behavior is centralized in `src/services/api.ts`.
- Authentication/session orchestration is centralized in `src/services/auth.service.ts` and `src/stores/auth.store.ts`.
- Device connectivity decisions are centralized in `src/stores/device.store.ts`.
- Real-time refresh concurrency is controlled by `src/services/refresh-scheduler.ts` and `src/services/websocket.service.ts`.
- Protected images are fetched as authenticated blobs by `AuthImage.vue`; resulting object URLs are revoked during replacement and unmount.
- `usePaginatedResource.ts` owns DRF page metadata, append/deduplication, one-request-at-a-time behavior, retry state, last-success time, and abort/late-result protection for cached Ionic pages.

## 4. Repository map

```text
.
├── src/
│   ├── App.vue                    # Startup/session gate and root router outlet
│   ├── main.ts                    # Vue, Ionic, router, and global CSS setup
│   ├── router/index.ts            # Routes, lazy loading, auth guard
│   ├── layouts/TabsLayout.vue     # Five-tab shell and quick-actions sheet
│   ├── pages/                     # Actual application screens
│   ├── components/                # Shared UI and state components
│   ├── composables/               # Network state and reusable paginated loading
│   ├── services/                  # HTTP, auth, WebSocket, scheduling, domain APIs
│   ├── stores/                    # Auth state and device-connectivity state
│   ├── types/api.ts               # Shared backend response types
│   ├── utils/format.ts            # Relative time and title-case formatting
│   └── theme/                     # Design tokens and global application styles
├── tests/
│   ├── unit/                      # Contracts, auth, concurrency, and utilities
│   └── e2e/                       # Cypress navigation coverage
├── android/                       # Generated/customized Capacitor Android project
├── public/                        # Logo and favicon assets
├── capacitor.config.ts            # App ID/name and `dist` web directory
├── vite.config.ts                 # Vue, aliases, test config, and dev proxies
├── cypress.config.ts              # Cypress base URL and paths
└── package.json                   # Scripts and dependencies
```

`src/views/HomePage.vue` is an unused Ionic starter view. The active dashboard is `src/pages/HomePage.vue`. Do not accidentally edit or import the starter view.

## 5. Navigation and screens

| Route | Screen | Notes |
| --- | --- | --- |
| `/login` | Login | Only public route; checks farm-server availability and signs in. |
| `/app/home` | Dashboard | System/environment/feed/herd/alerts snapshot; sensor WebSocket triggers throttled refreshes. |
| `/app/live` | Live cameras | Gets configured cameras, requests a short-lived stream ticket, and displays the selected MJPEG/image stream. |
| `/app/goats` | Goat inventory | Backend search plus local gender/status filters, paginated infinite loading; tap opens profile, long press opens an action sheet. |
| `/app/alerts` | Alerts | Paginated infinite loading; filter by critical/warning/information; expand and mark unread items as read. |
| `/app/more` | More tools | Hub for automation, tracking, reports, security, marketplace, and sign-out. |
| `/app/goats/:goatId` | Goat profile | Authenticated gallery, weight trend, health/vaccination data, and activity timeline. |
| `/app/automation` | Automation | Connectivity-aware actuator state and protected physical commands; management permission required in the UI. |
| `/app/tracking` | Goat tracking | Latest BLE proximity snapshot and receiver/beacon details. |
| `/app/security` | Security center | Paginated detection timeline, snapshots, confidence, status, and review state. |
| `/app/reports` | Farm intelligence | Current overview, herd distribution, BLE coverage, and security quality. Uses partial results if a source fails. |
| `/app/marketplace` | Marketplace | Honest preview/workspace; catalog and transaction feeds are explicitly not connected. |

Legacy top-level secondary paths redirect into `/app/...`. Unknown routes redirect to `/app/home`.

## 6. Backend and environment contract

### Base URL

The client reads `VITE_API_BASE_URL` and removes a trailing slash.

- Development `.env`: base URL is empty, so browser requests are same-origin and Vite proxies `/api`, `/iot`, `/security`, and `/media` to `https://gohmotech.site`.
- Production `.env.production`: `VITE_API_BASE_URL=https://gohmotech.site`.
- WebSockets derive their base by replacing `http` with `ws` on the configured API base or current origin.

Do not hard-code a different host in page components. Do not commit credentials or tokens to any environment file. Client-side `VITE_*` variables are bundled and are never secret.

### HTTP endpoints currently used

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/mobile/auth/login/` | Exchange username/password for access token, optional refresh token, and user. |
| `POST` | `/api/mobile/auth/refresh/` | Refresh an expired access token. |
| `POST` | `/api/mobile/auth/logout/` | Server logout; local logout still completes if it fails. |
| `POST` | `/api/mobile/auth/realtime-ticket/` | Obtain a short-lived ticket for `websocket` or a specific `camera`. |
| `GET` | `/api/mobile/dashboard/` | Current farm/system/dashboard snapshot. |
| `GET` | `/api/mobile/goats/?page={n}&search={encoded}` | Paginated/searchable goat inventory. |
| `GET` | `/api/mobile/goats/{encodedGoatId}/` | Full goat detail. |
| `GET` | `/api/mobile/cameras/` | Paginated camera configuration/status. |
| `GET` | `/api/mobile/cameras/{id}/stream/?quality=55&fps=8&width=640&ticket=...` | Ticket-authenticated live stream. |
| `GET` | `/api/mobile/tracking/` | Latest BLE receiver/proximity snapshot. |
| `GET` | `/iot/api/actuators/` | Actuator list, state, mode, and connectivity metadata. |
| `POST` | `/iot/api/actuators/{id}/control/` | Send a confirmed actuator state command. |
| `GET` | `/security/api/notifications/?page={n}&ordering=-created_at` | Notifications. |
| `POST` | `/security/api/notifications/{id}/mark_read/` | Mark a notification read. |
| `GET` | `/security/api/detections/?page={n}&ordering=-detected_at` | Security detections. |

WebSocket URL shape: `/ws/{channel}/?ticket={encodedTicket}`. `FarmSocket` supports `sensors`, `alerts`, `feeding`, and `detections`, but the current Home and Automation pages are the active users and both listen to `sensors`.

Preserve URL encoding for search strings, goat IDs, and tickets. Do not log camera or WebSocket tickets.

## 7. Authentication and security behavior

Authentication state can be `bootstrapping`, `authenticated`, `anonymous`, `offline`, or `expired`.

1. `App.vue` calls `authService.bootstrap()` on mount.
2. Native builds read `mobile.auth.session.v2` from secure storage with the `gohmotech_` prefix and `afterFirstUnlockThisDeviceOnly` access.
3. Browser builds use `localStorage` for the current session.
4. A one-time migration reads the former `gohmotech.mobile.session` entry from `sessionStorage`, persists it in the current store, and removes the old entry.
5. A restored session is validated with the dashboard endpoint.
6. Eligible `401` responses share one refresh operation, then each original request retries once.
7. Network/server/timeout/rate-limit failures during bootstrap produce an offline state rather than deleting a potentially valid session.
8. Invalid/expired authentication clears tokens, user data, API in-flight state, WebSockets, and device state.
9. Logout always clears local private state even when the server is unreachable.

Requests use `Authorization: Token <access-token>`. Never change the scheme without a coordinated backend change.

The router provides client-side access control, and `manage_farm` hides/locks automation controls. These checks improve UX but are not a security boundary: the backend must continue enforcing authentication, farm scope, role permissions, and actuator authorization.

## 8. HTTP, concurrency, and lifecycle rules

`apiRequest()` provides:

- JSON `Accept` and conditional `Content-Type` headers.
- A 15-second timeout.
- Consistent network errors using `ApiError` with status `0`.
- Server connectivity updates in the device store.
- Automatic shared authentication recovery on eligible `401` responses.
- Deduplication of simultaneous identical authenticated `GET` requests without explicit abort signals.

Do not bypass this wrapper for normal domain calls. The existing login server-health `OPTIONS` check is a deliberate lightweight exception.

`RefreshScheduler` ensures each page has at most one active refresh. Event bursts are reduced to one running refresh plus one queued refresh after the configured minimum interval. Home uses 5 seconds; Automation uses 3 seconds.

Ionic tabs cache page instances. Pages that own streams, WebSockets, timers, or active requests must use Ionic view lifecycle hooks (`onIonViewDidEnter` and `onIonViewDidLeave`) and also clean up on unmount where appropriate. Cleanup includes:

- Closing `FarmSocket` instances.
- Stopping `RefreshScheduler` timers.
- Aborting in-progress requests.
- Clearing intervals and timeouts.
- Invalidating late async results with an active flag or generation counter.
- Revoking blob object URLs.

## 9. Device connectivity and physical-control rules

Connectivity is modeled at four levels: server, main controller, feeder controller, and individual actuators.

- Door and light default to the main-controller role.
- Feeder defaults to the feeder-controller role.
- Explicit `controller_role`/`controller_type` metadata takes precedence.
- Backend booleans and normalized states such as online/connected/active/ready are accepted.
- `canControlActuator()` returns true only when the server and applicable actuator/controller are confirmed online.
- Offline commands are rejected locally with `DeviceUnavailableError` and are not queued.
- Before a physical command, the page shows a confirmation dialog.
- A returned `device_online: false` or failed/error/timeout result is treated as an unconfirmed command, not success.
- UI success is shown only after the backend confirms the command.

Maintain these fail-closed semantics for every future physical operation.

## 10. Important response models

The exact TypeScript contracts live in `src/types/api.ts` and the domain service files. Key shapes are:

- `MobileUser`: identity, `admin | farm_owner | farm_operator` role, `farm_access`, and `manage_farm`.
- `DashboardData`: generated timestamp; server/controller and IoT/camera counts; temperature/humidity/light; feed percentage/low state; registered-goat count; door/light summaries; recent alerts.
- `Goat`: identity, tag, breed, gender, age, weight, health/status, last detection, and cover image.
- `GoatDetail`: Goat plus birth/markings/notes/vaccination fields, image collection, and weight history.
- `Camera`: identity, type/location, active/status, connection/error timestamps.
- `Notification`: severity/type/source, read/resolved state, description, timestamp, and optional event URL.
- `Actuator`: door/light/feeder state and mode plus controller/device connectivity metadata.
- `TrackingSnapshot`: summary counts and goat/beacon/receiver proximity rows.
- `Detection`: timestamp, optional snapshot, source/type, confidence, status, and review state.
- `ApiPage<T>`: DRF-style `count`, `next`, `previous`, and `results`.

Treat missing/null telemetry as unknown and render the existing em dash or explanatory empty state. Do not coerce unknown values to zero unless the product meaning explicitly requires it.

## 11. UI and design system

The app intentionally uses one high-contrast light theme. Dark mode is not enabled.

- Global tokens are in `src/theme/variables.css`.
- Most app styling is in `src/theme/app.css`.
- Primary brand colors are emerald/green, navy, cyan, blue, gold, and danger coral.
- The visual language combines white operational cards with darker technical/monitoring surfaces, strong uppercase micro-labels, generous rounded corners, restrained glows, and short motion.
- Reuse `StatePanel` for loading/error/empty states, `AuthImage` for protected images, `AppBackButton` for secondary screens, and the existing Ionic/haptic patterns.
- Keep touch targets accessible, preserve `aria-label`/live-region behavior, and do not rely on color alone for state.
- Haptic calls must remain non-blocking and safely ignored when unsupported.
- Add reusable colors, radii, shadows, and timing values to theme variables rather than scattering new literals.

## 12. Local development

Prerequisites: a current Node/npm version compatible with the checked-in dependencies. Native builds additionally need a compatible JDK, Android SDK 36, and Android build tools. Exact Node and JDK versions are not pinned in this repository.

```powershell
npm install
npm run dev
```

Vite serves the web client at its printed local URL, normally `http://localhost:5173`. Development API requests use the configured Vite proxies.

Useful commands:

```powershell
npm run build
npm run lint
npm run test:unit -- --run
npm run preview
```

`npm run test:unit` without `-- --run` starts Vitest in watch mode in an interactive terminal.

For Cypress, start the Vite server separately, then run:

```powershell
npm run test:e2e
```

### Android build

After changing web code or Capacitor dependencies:

```powershell
npm run build
npx cap sync android
Push-Location android
.\gradlew.bat assembleDebug
Pop-Location
```

The Android app packages the contents of `dist`. Do not assume a web build automatically updates the native project; run the Capacitor sync step.

## 13. Existing test coverage

Unit tests currently cover:

- Formatting helpers.
- Legacy session migration/restoration.
- Successful login, rejected credentials, and network failures.
- Camera ticket/stream URL and actuator-control contracts.
- Refusal to send commands to offline actuators.
- Goat search/detail URL encoding.
- Tracking, detection, notification, and mark-read contracts.
- Secondary route nesting and hidden-tab metadata.
- Refresh burst coalescing, queued-refresh cancellation, and active-request bounds.
- Central identical-GET deduplication.
- Single refresh for simultaneous `401` responses.
- WebSocket connection ownership, pending-ticket cancellation, and reconnect cleanup.
- DRF page metadata, append/deduplication, end-of-list behavior, concurrent request suppression, criteria reset, failed-next-page preservation/retry, stale refresh preservation, and cached-page abort behavior.
- Online/offline/unknown/synchronizing banner states, stale timestamps, and retry actions.
- Actuator refusal when either the device/controller or farm server is offline.

Cypress specs use intercepted APIs and cover login/dashboard entry, goat pagination/profile navigation, alert pagination/mark-as-read, security pagination/back navigation, camera loading, and online/offline automation behavior. They remain frontend workflow tests rather than backend integration tests.

When changing a service contract, concurrency mechanism, route topology, or session behavior, update/add a unit test. When changing a core user journey, add or update a Cypress test with intercepted backend calls.

## 14. Known limitations and intentional placeholders

- Marketplace browse/activity feeds have no mobile API integration.
- Reports show current loaded records only; there is no historical time-series API.
- Feeder actuator details do not include fill telemetry from the actuator endpoint.
- Tracking is a fetched snapshot, not a continuously animated position feed.
- Inventory, notification, and detection screens paginate incrementally; their category/gender/status counts reflect records loaded into the current client view rather than server-wide filtered totals because no server-side category/filter contract exists.
- The browser stores sessions in `localStorage`; native builds use secure storage.
- Push notifications are not configured by this client unless a native `google-services.json` and related backend work are added.
- E2E coverage is narrow.
- `src/theme/app.css` is large and global; check existing selectors before adding new styles.

Do not silently hide these limitations with mock values. Either preserve the explanatory UI or implement a real, tested backend contract.

## 15. Safe-change checklist for AI contributors

Before editing:

1. Read this document and the exact page/service/store involved.
2. Check `git status` and preserve unrelated user changes.
3. Trace the existing endpoint and response type instead of guessing.
4. Decide whether the page is Ionic-cached and what cleanup it owns.

While editing:

1. Keep API calls in `src/services`, shared response shapes in `src/types` or the domain service, and shared state in the existing stores.
2. Preserve token auth, one-time refresh/retry behavior, URL encoding, timeouts, and GET deduplication.
3. Never put access tokens or realtime tickets in logs, persistent URLs, screenshots, test output, or documentation.
4. Use backend truth and honest empty/error/loading states.
5. Keep physical control protected by permission, confirmation, and connectivity checks. Backend authorization remains mandatory.
6. Reuse the current components, theme tokens, router nesting, and lifecycle patterns.
7. Clean up sockets, schedulers, requests, timers, and object URLs.
8. Avoid editing generated `dist` output directly; change `src` and rebuild.

After editing:

1. Run `npm run test:unit -- --run`.
2. Run `npm run build`.
3. Run `npm run lint` for source changes.
4. Run or update Cypress for changed navigation/user journeys.
5. For Android/native changes, run Capacitor sync and `assembleDebug`.
6. State exactly what was tested and any test that could not be run.
7. Update this file if architecture, routes, endpoints, setup, capabilities, or limitations changed.

## 16. High-value files to read for common tasks

| Task | Start here |
| --- | --- |
| Login/session issue | `src/App.vue`, `src/services/auth.service.ts`, `src/stores/auth.store.ts`, `src/services/api.ts`, `src/pages/LoginPage.vue` |
| API error/retry issue | `src/services/api.ts`, `src/services/auth.service.ts` |
| Dashboard/realtime issue | `src/pages/HomePage.vue`, `src/services/dashboard.service.ts`, `src/services/refresh-scheduler.ts`, `src/services/websocket.service.ts` |
| Camera issue | `src/pages/LivePage.vue`, `src/services/camera.service.ts` |
| Goat data/profile issue | `src/pages/GoatsPage.vue`, `src/pages/GoatDetailPage.vue`, `src/services/goat.service.ts`, `src/types/api.ts` |
| Alerts/security issue | `src/pages/AlertsPage.vue`, `src/pages/SecurityPage.vue`, `src/services/alert.service.ts`, `src/services/security.service.ts` |
| BLE tracking issue | `src/pages/TrackingPage.vue`, `src/services/tracking.service.ts` |
| Automation/device issue | `src/pages/AutomationPage.vue`, `src/services/automation.service.ts`, `src/stores/device.store.ts` |
| Navigation/back issue | `src/router/index.ts`, `src/layouts/TabsLayout.vue`, `src/components/AppBackButton.vue` |
| Styling/design issue | `src/theme/variables.css`, `src/theme/app.css`, relevant Vue template |
| Android packaging issue | `capacitor.config.ts`, `android/app/build.gradle`, `android/variables.gradle`, `android/app/src/main/AndroidManifest.xml` |

## 17. Definition of done

A change is complete only when it preserves real backend truth, handles loading/empty/error/offline states, respects role and connectivity constraints, cleans up owned resources, maintains Ionic navigation behavior, and passes proportionate automated verification. A visually convincing screen backed by invented data or an unconfirmed physical command is not complete.
