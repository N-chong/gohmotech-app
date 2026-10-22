# GoHMoTech Mobile App — AI Project Context

> Paste this entire file into a new AI conversation before asking that AI to modify the project. It describes the repository as it exists on 2026-09-28. When this document and the source code disagree, the source code is authoritative and this document should be updated.

## Copy-ready instruction for another AI

You are working on the **GoHMoTech mobile app**, an authenticated Ionic/Vue client for the GoHMoTech farm owner/client. Read this complete document before changing code. Inspect the relevant source files before implementing a request. Preserve the existing backend contracts, authentication model, connectivity safeguards, Ionic navigation behavior, and visual language. Do not invent API endpoints, simulated telemetry, historical data, or unsupported marketplace features. Never expose tokens, credentials, realtime tickets, or environment secrets. After a change, run the smallest relevant tests plus the full build; report any verification that could not be run.

## 1. Product summary

GoHMoTech is a farm monitoring and control client. It gives authenticated users access to:

- A live farm dashboard with system health, environment readings, feed status, herd count, automation state, and recent alerts.
- Camera discovery, ticket-authenticated live camera streams, and shared AI live-detection status/control.
- Goat inventory search/filtering, owner registration/editing, standardized reference-photo management, and detailed goat profiles with images, weights, health information, vaccination information, and recent activity.
- Farm notifications that can be filtered, expanded, and marked as read.
- Server-paced live BLE goat proximity and receiver tracking snapshots.
- Protected door, light, and feeder actuator status/control.
- Security detection events with authenticated snapshots and confidence/review details.
- Current-state farm intelligence assembled from dashboard, herd, tracking, and security endpoints.
- A token-authenticated marketplace catalog with listing details, protected images, trusted seller identity, Farm Owner/admin listing management, and a seller inbox for inquiries and reservations.

This repository is the **frontend/mobile client only**. The backend, IoT controllers, BLE receivers, cameras, security processing, and persistent farm database are external systems hosted by GoHMoTech.

### Product truth rules

- Display only values returned by the backend or values directly derived from them.
- Do not fabricate sensor readings, device connectivity, historical charts, feed levels, marketplace listings, or command success.
- A WebSocket frame is an invalidation signal; refresh the authoritative HTTP resource instead of treating an arbitrary frame as final state.
- Physical controls must fail closed when either the server or the relevant controller is not confirmed online.
- Marketplace catalog and owner-side seller transactions must come from authenticated mobile endpoints. Mobile access is restricted to active Farm Owner/admin accounts, while buyer marketplace activity remains website-only.
- Environmental reports use completed 30-minute server summaries for bounded 24-hour and 7-day history. Herd distributions use the complete smart-farm inventory, and security quality uses bounded 24-hour/7-day server aggregates.

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

Current package version: `2.1.0`. Android release 2.1 uses version name `2.1`, version code `21`, minimum SDK 24, compile/target SDK 36, Android Gradle Plugin 8.13.0, and Gradle 8.14.3.

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
├── docs/android-release.md        # Permanent signing, versioning, build, and update verification
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
| `/login` | Login | Only public route; signs in active farm Owner or administrator accounts. |
| `/app/home` | Dashboard | System/environment/feed/herd/alerts snapshot; sensor WebSocket triggers throttled refreshes. |
| `/app/live` | Live cameras | Displays ticketed camera streams and joins the shared AI detection viewer session; owners/admins can start or stop manual detection. |
| `/app/goats` | Goat inventory | Server-side search and gender/status filters with authoritative facets and paginated infinite loading; owners can register goats, tap to open a profile, or long press for actions. |
| `/app/alerts` | Alerts | Farm-owner-only feed merging farm/security alerts with seller marketplace inquiries, messages, reservations, pickup, and sales; includes filters, unread badges, deep links, and read actions. |
| `/app/more` | More tools | Hub for automation, tracking, reports, security, marketplace, and sign-out. |
| /app/goats/new | Register goat | Owner livestock registration using production model choices and validation. |
| /app/goats/:goatId | Goat profile | Authenticated gallery, weight trend, health/vaccination data, activity timeline, and record/photo management actions. |
| /app/goats/:goatId/photos | Goat photos | Standardized front/left/right/rear/face capture or upload with production quality checks, safe replacement, fallback selection, and deletion. |
| /app/goats/:goatId/edit | Edit goat | Owner editing for identity and care fields; confirmed weight history is protected. |
| `/app/automation` | Automation | Connectivity-aware actuator state and protected physical commands; management permission required in the UI. |
| `/app/feeding` | Feeding | Feed level, automation master state, schedule CRUD, recent events, refill recording, and connectivity-gated manual dispensing. |
| `/app/tracking` | Goat tracking | Server-paced live BLE proximity snapshots with receiver/beacon details and last-good-state fallback. |
| `/app/security` | Security center | Paginated detection timeline, snapshots, confidence, status, and review state. |
| `/app/reports` | Farm intelligence | Current overview, 24-hour/7-day environmental history, complete smart-farm herd distribution, BLE coverage, and authoritative 24-hour/7-day security aggregates. Uses partial results if a source fails. |
| /app/marketplace | Marketplace | Paginated trusted catalog with search, availability filters, sorting, and authenticated images. |
| `/app/marketplace/:listingId` | Listing details | Gallery, livestock record, verified seller identity/location, pricing, pickup terms, and owner management link when applicable. |
| `/app/marketplace/manage` | Manage listings | Farm Owner/admin draft creation, price/description editing, optimized photo upload, cover selection, safe deletion, and photo-gated publish/unpublish actions. |
| `/app/marketplace/inbox` | Seller inbox | Farm Owner/admin buyer conversations, unread counts, reservations, pickup coordination, and sale completion. |
| `/app/marketplace/conversations/:conversationId` | Transaction conversation | Owner seller view of participant-only message history, text or verified-image replies, active reservation, and close/reopen controls. |

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
| `GET` | `/api/mobile/environment-history/?hours=24|168` | Completed 30-minute temperature, humidity, and light summaries for the dashboard environmental device. |
| `GET` | `/api/mobile/live-detection/` | Current shared live-detection mode, viewer count, schedule, and latest detections. |
| `POST` | `/api/mobile/live-detection/` | Viewer heartbeat/leave and permission-gated manual start/stop actions. |
| GET/POST | /api/mobile/goats/?page={n}&search={encoded}&gender=...&status=... | Server-filtered smart-farm inventory with complete search-scoped facets, plus owner goat registration; community marketplace animals are excluded. |
| GET | /api/mobile/goats/options/ | Model-driven breed, gender, health, and vaccination choices for livestock forms. |
| `GET` | `/api/mobile/report-summary/?hours=24|168` | Complete smart-farm herd distributions plus bounded security review aggregates. |
| `GET/PUT` | `/api/mobile/goats/{encodedGoatId}/` | Full goat detail and owner editing; editing cannot overwrite confirmed weight. |
| `POST` | `/api/mobile/goats/{encodedGoatId}/images/` | Validate and create or replace one standardized reference-photo angle. |
| `POST` | `/api/mobile/goats/{encodedGoatId}/images/{imageId}/` | Select the fallback photo or safely delete a photo from that goat. |
| `GET` | `/api/mobile/cameras/` | Paginated camera configuration/status. |
| `GET` | `/api/mobile/cameras/{id}/stream/?quality=55&fps=8&width=640&ticket=...` | Ticket-authenticated live stream. |
| `GET` | `/api/mobile/tracking/` | Smart-farm-only BLE receiver/proximity snapshot with a bounded client polling interval. |
| `GET` | `/api/mobile/marketplace/listings/` | Paginated trusted listings with search, availability filters, and sorting. |
| `GET` | `/api/mobile/marketplace/listings/{id}/` | Listing gallery, livestock details, verified seller identity, and manager capability. |
| `GET` | `/api/mobile/marketplace/images/{id}/` | Token-authenticated image restricted to a public or manageable listing. |
| `GET/POST` | `/api/mobile/marketplace/manage/` | Owner/admin managed-listing snapshot and draft creation. |
| `PATCH/POST` | `/api/mobile/marketplace/manage/{id}/` | Owner/admin listing edits and publish/unpublish actions. |
| `POST` | `/api/mobile/marketplace/manage/{id}/images/` | Upload up to six optimized listing photos per request, within the 10-photo goat limit. |
| `POST` | `/api/mobile/marketplace/manage/{id}/images/{imageId}/` | Select the listing cover or safely delete an owner-app-uploaded photo. |
| `GET` | `/api/mobile/marketplace/seller/conversations/` | Owner/admin seller inbox with unread counts and active reservations. |
| `GET/POST` | `/api/mobile/marketplace/seller/conversations/{id}/` | Private thread, read tracking, text or verified-image replies, and close/reopen. |
| `GET` | `/api/mobile/marketplace/seller/reservations/` | Managed Smart Farm reservation history and available actions. |
| `POST` | `/api/mobile/marketplace/seller/reservations/{id}/` | Accept/reject/cancel, pickup coordination, and sale completion through marketplace services. |
| `GET` | `/api/mobile/notifications/` | Farm-owner-only paginated feed merging farm alerts and owner seller activity, with complete category facets and unread totals. |
| `GET` | `/api/mobile/notifications/summary/` | Farm-owner-only unread totals and complete inbox category facets for global UI. |
| `POST` | `/api/mobile/notifications/{source}/{id}/` | Mark one authorized farm or owner marketplace notification read. |
| `POST` | `/api/mobile/notifications/read-all/` | Mark all farm alerts and owner seller notifications read. |
| `GET` | `/api/mobile/marketplace/messages/{id}/image/` | Token-authenticated private attachment restricted to conversation participants. |
| `GET` | `/iot/api/actuators/` | Actuator list, state, mode, and connectivity metadata. |
| `POST` | `/iot/api/actuators/{id}/control/` | Send a confirmed actuator state command. |
| `GET/POST/PUT/DELETE` | `/feeding/api/config/`, `/feeding/api/schedules/`, `/feeding/api/levels/`, `/feeding/api/logs/` | Feeding configuration, schedule management, fill telemetry, feed history, refill, and manual-feed actions. |
| `GET` | `/security/api/notifications/?page={n}&ordering=-created_at` | Notifications. |
| `POST` | `/security/api/notifications/{id}/mark_read/` | Mark a notification read. |
| `GET` | `/security/api/detections/?page={n}&ordering=-detected_at` | Paginated security detections with server-wide high-confidence and review-state KPIs. |

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

- `MobileUser`: identity, `admin | farm_owner` role, `farm_access`, and `manage_farm`.
- `DashboardData`: generated timestamp; server/controller and IoT/camera counts; temperature/humidity/light with independent 30-minute sensor freshness; feed percentage/low state; registered-goat count; door/light summaries; recent alerts.
- `EnvironmentHistory`: bounded range, source device, and timestamped average/minimum/maximum/sample-count points for temperature, humidity, and light.
- `LiveDetectionStatus`: shared inference mode/running/viewer state, schedule, selected camera, and latest goat/person detections.
- `Goat`: identity, tag, breed, gender, age, weight, health/status, last detection, and cover image.
- `GoatDetail`: Goat plus birth/markings/notes/vaccination fields, image collection, and weight history.
- `Camera`: identity, type/location, active/status, connection/error timestamps.
- `Notification`: severity/type/source, read/resolved state, description, timestamp, and optional event URL.
- `Actuator`: door/light/feeder state and mode plus controller/device connectivity metadata.
- `TrackingSnapshot`: summary counts, goat/beacon/receiver proximity rows, freshness timeouts, and the server polling interval.
- `Detection`: timestamp, optional snapshot, source/type, confidence, status, and review state.
- `ApiPage<T>`: DRF-style `count`, `next`, `previous`, and `results`.

Treat missing/null telemetry as unknown and render the existing em dash or explanatory empty state. Do not coerce unknown values to zero unless the product meaning explicitly requires it.

## 11. UI and design system

The app intentionally uses one high-contrast light theme. Dark mode is not enabled.

- Global tokens are in `src/theme/variables.css`.
- Most app styling is in `src/theme/app.css`.
- Readability overrides keep body copy near 15px, controls and labels at least 14px, micro-labels at least 12px, form fields at 16px, and page titles at 20px.
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

Production release signing is configured through ignored local
`android/signing.properties` values (or private Gradle properties). Release
builds fail when the permanent signing key is unavailable and never fall back
to debug signing. See `docs/android-release.md` before building or distributing
an APK.

## 13. Existing test coverage

Unit tests currently cover:

- Formatting helpers.
- Legacy session migration/restoration.
- Successful login, rejected credentials, and network failures.
- Camera ticket/stream URL and actuator-control contracts.
- Refusal to send commands to offline actuators.
- Goat search/detail URL encoding, owner registration/editing payloads, server-defined form/photo choices, and standardized multipart photo actions.
- Tracking, detection, notification, and mark-read contracts.
- Secondary route nesting and hidden-tab metadata.
- Refresh burst coalescing, queued-refresh cancellation, and active-request bounds.
- Central identical-GET deduplication.
- Single refresh for simultaneous `401` responses.
- WebSocket connection ownership, pending-ticket cancellation, and reconnect cleanup.
- DRF page metadata, append/deduplication, end-of-list behavior, concurrent request suppression, criteria reset, failed-next-page preservation/retry, stale refresh preservation, and cached-page abort behavior.
- Online/offline/unknown/synchronizing banner states, stale timestamps, and retry actions.
- Actuator refusal when either the device/controller or farm server is offline.
- Feeding snapshot aggregation and manual-feed request payloads.
- Marketplace catalog, protected owner management, multipart listing-photo upload/actions, secure seller message attachments, seller conversations, reservation actions, and pickup coordination contracts.

Cypress specs use intercepted APIs and cover login/dashboard entry, goat pagination/profile navigation, alert pagination/mark-as-read, security pagination/back navigation, camera loading, and online/offline automation behavior. They remain frontend workflow tests rather than backend integration tests.

When changing a service contract, concurrency mechanism, route topology, or session behavior, update/add a unit test. When changing a core user journey, add or update a Cypress test with intercepted backend calls.

## 14. Known limitations and intentional placeholders

- The unified notification center is intentionally restricted to farm-owner/client accounts and merges farm alerts with notifications addressed to the owner seller account.
- Environmental data is the only report domain with a mobile time-series API. Herd reporting is a complete current snapshot; security provides complete bounded aggregates but not a plotted event time series.
- The generic Automation actuator card does not include fill telemetry; the dedicated Feeding screen reads the real feed-level endpoint and matches it to the feeder device.
- Tracking refreshes from server snapshots at the bounded advertised interval; BLE proximity remains receiver-based and must not be presented as GPS or exact animated coordinates.

- The browser stores sessions in `localStorage`; native builds use secure storage.
- Goat registration/editing covers the core livestock record, while standardized photos have their own validated workflow. BLE assignment, status changes, and confirmed weight entries remain separate and are not silently changed by profile editing.
- Push notifications are not configured by this client unless a native google-services.json and related backend work are added.
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
| Camera/live detection issue | `src/pages/LivePage.vue`, `src/services/camera.service.ts`, `src/services/live-detection.service.ts` |
| Goat data/profile issue | `src/pages/GoatsPage.vue`, `src/pages/GoatRecordPage.vue`, `src/pages/GoatPhotosPage.vue`, `src/pages/GoatDetailPage.vue`, `src/services/goat.service.ts`, `src/types/api.ts` |
| Alerts/security issue | `src/pages/AlertsPage.vue`, `src/pages/SecurityPage.vue`, `src/services/alert.service.ts`, `src/services/security.service.ts` |
| BLE tracking issue | `src/pages/TrackingPage.vue`, `src/services/tracking.service.ts`, `src/services/tracking-poller.ts` |
| Automation/device issue | `src/pages/AutomationPage.vue`, `src/services/automation.service.ts`, `src/stores/device.store.ts` |
| Feeding issue | `src/pages/FeedingPage.vue`, `src/services/feeding.service.ts`, `src/services/automation.service.ts`, `src/stores/device.store.ts` |
| Marketplace issue | `src/pages/MarketplacePage.vue`, `src/pages/MarketplaceDetailPage.vue`, `src/pages/MarketplaceManagePage.vue`, `src/pages/MarketplaceSellerInboxPage.vue`, `src/pages/MarketplaceConversationPage.vue`, `src/services/marketplace.service.ts` |
| Navigation/back issue | `src/router/index.ts`, `src/layouts/TabsLayout.vue`, `src/components/AppBackButton.vue` |
| Styling/design issue | `src/theme/variables.css`, `src/theme/app.css`, relevant Vue template |
| Android packaging issue | `capacitor.config.ts`, `android/app/build.gradle`, `android/variables.gradle`, `android/app/src/main/AndroidManifest.xml` |

## 17. Definition of done

A change is complete only when it preserves real backend truth, handles loading/empty/error/offline states, respects role and connectivity constraints, cleans up owned resources, maintains Ionic navigation behavior, and passes proportionate automated verification. A visually convincing screen backed by invented data or an unconfirmed physical command is not complete.
