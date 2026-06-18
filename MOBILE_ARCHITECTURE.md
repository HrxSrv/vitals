# Vithos Mobile — Architecture & Build Guide

> **Purpose of this document.** This is the single source of truth for building the **Vithos mobile app** (React Native + Expo + NativeWind). It is written to be implemented **screen-by-screen by a smaller coding model**. Every section is concrete: exact file paths, exact dependencies, exact data flow. When in doubt, the coding model should follow this document literally and copy the patterns shown.
>
> **Product:** Vithos turns lab-report PDFs into an AI-powered family health tracker. Upload a PDF → backend OCR + AI extracts biomarkers → builds a "Living Health Markdown" (LHM) per person → dashboard snapshot, trend charts, and a streaming AI chat. Multi-profile (family) throughout.
>
> **Repo note:** The product is **Vithos**; the repo is historically named `vitals`. Backend lives in `vitals/` (Node/Express), the web app in `vitals/frontend/` (Next.js 14). This mobile app is a **new client** against the same backend API. Treat the web frontend as the reference implementation for behavior; treat this doc as the reference for mobile-specific decisions.

---

## 0. The Golden Rules (read first)

1. **The backend already exists and does not change** — except for ONE small additive endpoint for push tokens (see §12). Do not invent new endpoints. The full API contract is in §6.
2. **Profile-scoping is everywhere.** Almost every data call takes a `profileId`. There is a single global "active profile" the user switches between. Get it from the profile store (§4) and pass it down. Never hardcode.
3. **Auth = Supabase JWT.** Every API call carries `Authorization: Bearer <token>`. The token comes from the Supabase session, refreshed automatically by the SDK. The API client attaches it (§7).
4. **Three things are genuinely different from the web** and have dedicated solutions: streaming chat (§8.3), secure token storage (§8.1), and push notifications (§12). Everything else is a straight port.
5. **Build in the order given in §15.** Each phase is independently runnable and testable. Do not skip ahead.
6. **UI will be refined from Figma.** The structure in this doc (navigation, state, data, component boundaries) is final and UI-agnostic. Pixel-level styling comes from Figma via the MCP workflow in §11 — do that per-screen, last.

---

## 1. Tech Stack (pinned)

| Concern | Choice | Why |
|---|---|---|
| Runtime/build | **Expo SDK 53** (managed workflow) | Matches current ecosystem; OTA, EAS Build, dev client. |
| Language | **TypeScript** (strict) | Parity with web; fewer runtime errors for a small model. |
| Navigation | **Expo Router v5** (file-based) | Mirrors Next.js App Router the web uses — same mental model, typed routes, less boilerplate. |
| Styling | **NativeWind v4** + Tailwind 3 | Reuse the web's Tailwind token vocabulary almost verbatim. |
| Server state | **TanStack Query v5** | Identical hook patterns to web; caching, polling, invalidation. |
| Client state | **Zustand v5** | Auth + active-profile, same as web. |
| Auth/backend SDK | **@supabase/supabase-js v2** | Same auth provider as web. |
| Secure storage | **expo-secure-store** + **@react-native-async-storage/async-storage** | JWT session storage (see §8.1 — SecureStore size limit caveat). |
| Forms | **react-hook-form v7** + **zod v3** + **@hookform/resolvers** | Direct port of web validators. |
| Chat streaming | **react-native-sse** | RN has no `fetch().body.getReader()`; this lib does POST + headers + body + named SSE events. (§8.3) |
| Charts | **react-native-gifted-charts** (or `victory-native`) | Recharts has no RN build; this is the closest line-chart API with ref ranges. (§9.5) |
| File upload | **expo-document-picker** + **expo-file-system** | Pick PDF, upload via multipart. (§9.4) |
| Markdown render | **react-native-markdown-display** | Chat answers + LHM are markdown. |
| Push | **expo-notifications** + **expo-device** | Report-done notifications. (§12) |
| Icons | **lucide-react-native** | Same icon set as web. |
| Dates | **date-fns v3** | Direct port. |
| OAuth | **expo-auth-session** / **expo-web-browser** + deep linking | Google sign-in. (§8.2) |
| Testing | **Jest + @testing-library/react-native** (unit/component), **Maestro** (E2E) | See §13. |

> **Version guard for the coding model:** install via `npx expo install <pkg>` (NOT raw `npm install`) for anything with a native module, so Expo picks SDK-53-compatible versions. NativeWind v5 exists but targets SDK 54+ — **stay on NativeWind v4 for SDK 53**.

---

## 2. The Four Hard Problems (solved up front)

These are the only parts where "just copy the web app" fails. Solve them once, in the plumbing, so screen code stays trivial.

### 2.1 Streaming chat → `react-native-sse`
React Native's `fetch` does not expose a readable stream body, so the web's `response.body.getReader()` SSE parser **cannot be ported**. Use `react-native-sse`, which supports `POST` with custom headers + body and dispatches the backend's named events (`session`, `message`, `done`, `error`). Full implementation in §8.3.

### 2.2 Token storage → SecureStore size limit
`expo-secure-store` caps values at **2048 bytes**, but a Supabase session exceeds that. Solution: a **chunking storage adapter** that splits the session across multiple SecureStore keys (simplest, no extra crypto deps). Full adapter in §8.1.

### 2.3 Google OAuth → deep linking
Mobile OAuth can't use a web redirect. Use `expo-auth-session` to open the system browser and capture the redirect back into the app via a custom scheme (`vithos://`). Full flow in §8.2.

### 2.4 "Report is processing" feedback → polling + push
Two layers: (a) while the app is open, TanStack Query **polls** report status every few seconds; (b) for when the app is backgrounded/closed, **Expo push notifications** fire on completion (needs one new backend endpoint, §12). Full design in §9.4 and §12.

---

## 3. Project Structure

New Expo project (separate from the existing `mobile/` folder, which is being ignored). Recommended location: a fresh `vithos-mobile/` directory.

```
vithos-mobile/
├── app/                          # Expo Router routes (file = screen). See §5.
│   ├── _layout.tsx               # Root: providers (Query, Auth gate, SafeArea), font load, splash
│   ├── index.tsx                 # Entry redirect → /(auth)/login or /(tabs)/home based on session
│   ├── (auth)/
│   │   ├── _layout.tsx           # Stack; redirects to /(tabs)/home if already authed
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── check-email.tsx
│   └── (tabs)/
│       ├── _layout.tsx           # Bottom tab navigator (Home, Reports, Trends, Chat, Profile)
│       ├── home.tsx              # Dashboard
│       ├── reports/
│       │   ├── index.tsx         # Reports list
│       │   └── [id].tsx          # Report detail
│       ├── trends.tsx
│       ├── chat.tsx
│       └── profile.tsx           # Account + profiles management
├── src/
│   ├── api/
│   │   ├── client.ts             # fetch wrapper + Bearer injection + error normalization (§7)
│   │   ├── endpoints.ts          # one typed function per endpoint (§7)
│   │   ├── chat.stream.ts        # react-native-sse streaming (§8.3)
│   │   └── types.ts              # API request/response TS types (mirror §6)
│   ├── auth/
│   │   ├── supabase.ts           # Supabase client + SecureStore chunk adapter (§8.1)
│   │   └── google.ts             # OAuth via expo-auth-session (§8.2)
│   ├── store/
│   │   ├── authStore.ts          # Zustand: user/session (§4)
│   │   └── profileStore.ts       # Zustand: activeProfileId, persisted (§4)
│   ├── hooks/                    # TanStack Query hooks, 1 file per domain (§4)
│   │   ├── useDashboard.ts
│   │   ├── useProfiles.ts
│   │   ├── useReports.ts
│   │   ├── useTrends.ts
│   │   ├── useChat.ts            # wraps streaming + cache (§8.3)
│   │   ├── useUsage.ts
│   │   └── useNotifications.ts
│   ├── components/               # Presentational components (§5 lists per screen)
│   │   ├── ui/                   # Button, Card, Badge, Sheet, Field, Avatar, Spinner
│   │   ├── dashboard/            # HealthSummaryCard, BiomarkerGrid, BiomarkerCard, UsageCard
│   │   ├── reports/              # ReportCard, UploadSheet, PdfViewer
│   │   ├── trends/               # BiomarkerTrendChart
│   │   ├── chat/                 # ChatMessage, ChatInput, QuickQuestions, SessionsSheet
│   │   └── profile/              # ProfileCard, ProfileForm, ProfileSwitcher
│   ├── lib/
│   │   ├── validators.ts         # zod schemas (port of web)
│   │   ├── formatters.ts         # date/value formatting (date-fns)
│   │   ├── status.ts             # biomarker status → color/label mapping
│   │   └── push.ts               # expo-notifications register + handlers (§12)
│   └── theme/
│       └── tokens.ts             # design tokens mirrored from tailwind.config (§10)
├── assets/                       # fonts (Crimson Pro, Nunito), icon, splash
├── global.css                    # Tailwind directives (NativeWind)
├── tailwind.config.js            # ported tokens (§10)
├── babel.config.js               # nativewind/babel + reanimated
├── metro.config.js               # withNativeWind
├── app.json / app.config.ts      # scheme "vithos", plugins, push config
├── nativewind-env.d.ts
└── .env / app config extra       # API_URL, SUPABASE_URL, SUPABASE_ANON_KEY
```

**Boundary rule for the coding model:** `app/` files are thin — they read hooks + stores and compose components. All data logic lives in `src/hooks` and `src/api`. All visuals live in `src/components`. A screen file should rarely exceed ~120 lines.

---

## 4. State Management

Two layers, exactly like the web app.

### 4.1 Zustand — client state

**`authStore.ts`**
```
state:   user: { id, email, name } | null
         status: 'loading' | 'authed' | 'anon'
actions: setSession(session) | clear()
```
Populated by an `onAuthStateChange` subscription set up in the root layout (§8.1). Not persisted manually — Supabase persists the session via the storage adapter.

**`profileStore.ts`** (persisted to AsyncStorage, key `vithos-active-profile`)
```
state:   activeProfileId: string | null
actions: setActiveProfile(id) | clear()
selector: getActiveProfile(profiles[]) ->
            1) profile matching activeProfileId, else
            2) profile where isDefault, else
            3) profiles[0], else null
```
> The selector is critical: screens call `useProfiles()` then resolve the active profile through this selector so there's always a sensible default after login.

### 4.2 TanStack Query — server state

QueryClient defaults: `staleTime: 60_000`, `retry: 1`. Configure in root layout.

**Query key convention** (use these exact keys so invalidation is consistent):

| Hook | Key | Endpoint | Notes |
|---|---|---|---|
| `useProfiles()` | `['profiles']` | `GET /profiles` | |
| `useDashboard(pid)` | `['dashboard', pid]` | `GET /dashboard?profile_id=` | **`refetchInterval: 5000` while any report is processing** (drives the "Analyzing…" state). |
| `useUsage()` | `['usage']` | `GET /dashboard/usage` | |
| `useReports(pid)` | `['reports', pid]` | `GET /reports?profileId=` | poll while any item is `pending/processing` (§9.4). |
| `useReport(id)` | `['report', id]` | `GET /reports/:id` | |
| `useTrends(pid)` | `['trends', pid]` | `GET /biomarkers/trends?profileId=` | |
| `useChatSessions(pid)` | `['chatSessions', pid]` | `GET /chat/sessions?profileId=` | |
| `useChatSession(id)` | `['chatSession', id]` | `GET /chat/sessions/:id` | messages + meta |
| `useNotifications()` | `['notifications']` | `GET /settings/notifications` | |

**Mutations** (each invalidates the listed keys on success):
- `useCreateProfile` / `useUpdateProfile` / `useDeleteProfile` / `useSetDefaultProfile` → invalidate `['profiles']`.
- `useUploadReport` → invalidate `['reports', pid]`, `['dashboard', pid]`, `['usage']`.
- `useDeleteReport` → invalidate `['reports', pid]`, `['dashboard', pid]`.
- `useCreateChatSession` / `useRenameChatSession` / `useDeleteChatSession` → invalidate `['chatSessions', pid]` (delete uses optimistic update + rollback).
- `useUpdateNotifications` → invalidate `['notifications']`.

`useChat` is special (streaming, not a plain query) — see §8.3.

---

## 5. Navigation Map (Expo Router)

```
/                       index.tsx        → redirect based on auth status
/(auth)/login           login.tsx        email+password + "Continue with Google"
/(auth)/signup          signup.tsx       name/email/password (zod), → check-email
/(auth)/check-email     check-email.tsx  "confirm your email" notice
/(tabs)                 tab bar          5 tabs, only reachable when authed
  /(tabs)/home          home.tsx         Dashboard (default tab)
  /(tabs)/reports       reports/index    Reports list  + upload entry
  /(tabs)/reports/[id]  reports/[id]     Report detail
  /(tabs)/trends        trends.tsx       Trend charts
  /(tabs)/chat          chat.tsx         AI chat (streaming)
  /(tabs)/profile       profile.tsx      Account + family profiles + settings
```

**Auth gating** is done in two layouts:
- `app/(auth)/_layout.tsx`: if `status === 'authed'` → `Redirect` to `/(tabs)/home`.
- `app/(tabs)/_layout.tsx`: if `status === 'anon'` → `Redirect` to `/(auth)/login`. While `status === 'loading'`, render the splash/spinner (don't flash login).

**Active profile** is global (in the store), shown via a `ProfileSwitcher` in the header of Home/Trends/Chat. Switching it changes the `profileId` fed to every hook → all tabs update.

Static pages (privacy/terms/help) from web are low priority — add as simple modal routes later if needed; not required for v1.

---

## 6. Backend API Contract (authoritative)

Base URL: `${API_URL}` where `API_URL` ends in `/api` (e.g. `http://<lan-ip>:8000/api` in dev, prod URL otherwise). All authed routes require `Authorization: Bearer <supabaseAccessToken>`.

> ⚠️ **Dev networking:** a physical device cannot reach `localhost`. Use the machine's LAN IP (`http://192.168.x.x:8000/api`) or a tunnel. Put it in env (§14).

**Error envelope (all errors):**
```json
{ "error": { "code": "STRING_CODE", "message": "human text", "details": [ { "path": "...", "message": "..." } ] } }
```
Codes the client handles specially: `AUTHENTICATION_ERROR`(401)→ sign out + go to login; `QUOTA_EXCEEDED`(429)→ show "monthly limit reached" + usage; `VALIDATION_ERROR`(400)→ map `details[].path` to form fields.

### Auth
- `GET /auth/session` → `{ user: { id, email, name? } }`. (Validates the bearer token.)

### Profiles
- `GET /profiles` → `{ profiles: Profile[] }`
- `POST /profiles` body `{ name, relationship, dob?, gender? }` → `201 { profile }`. First profile auto-`isDefault`.
- `GET /profiles/:id` → `{ profile }`
- `PATCH /profiles/:id` body (any subset) → `{ profile }`
- `PATCH /profiles/:id/default` → `{ message }`
- `DELETE /profiles/:id` → `204`

`Profile = { id, userId, name, relationship: 'self'|'mother'|'father'|'spouse'|'grandmother'|'grandfather'|'other', dob: string|null, gender: 'male'|'female'|'other'|null, isDefault, createdAt }`

### Reports
- `GET /reports?profileId=UUID` → `{ reports: Report[] }`
- `POST /reports` **multipart/form-data**: field `file` (PDF, ≤10MB), `profileId`, `reportDate?` → `201 { report }`. May return **429 `QUOTA_EXCEEDED`**.
- `GET /reports/:id` → `{ report: Report & { rawOcrMarkdown?, biomarkers: Biomarker[] } }`
- `GET /reports/:id/download` → `{ url }` (signed S3 URL, valid ~1h — open in viewer/browser)
- `DELETE /reports/:id` → `204`

`Report = { id, profileId, fileUrl, reportDate, processingStatus: 'pending'|'processing'|'done'|'failed', uploadedAt }`
`Biomarker = { id, reportId, name, nameNormalized, category, value, unit, reportDate, createdAt }`

### Dashboard
- `GET /dashboard?profile_id=UUID` → `{ profile, summary:{ totalReports, latestReportDate, biomarkerCount }, latestBiomarkers: { biomarker, definition, status }[], lhm: { markdown, version, lastUpdatedAt, ... } | null }`. (Server-cached ~10 min.)
- `GET /dashboard/all` → `{ dashboards: [...] }`
- `GET /dashboard/usage` → `{ used, limit, month }`

`status ∈ 'normal'|'borderline'|'high'|'low'`. `definition` carries `displayName, category, unit, refRangeLow, refRangeHigh, criticalLow, criticalHigh, description`.

### Biomarkers
- `GET /biomarkers/trends?profileId=UUID` → `{ trends: { nameNormalized, displayName, category, unit, refRangeLow, refRangeHigh, history: { date, value, status }[] }[] }`. Only biomarkers with **2+ points** are returned.
- `GET /biomarkers/trend?profile_id=UUID&biomarker=NAME` → single-biomarker series (optional/detail use).

### Chat (SSE)
- `POST /chat` body `{ message, profileId?, sessionId?, useVectorSearch? }` → **`text/event-stream`**. Events:
  - `event: session` `data: { sessionId, profileId, title, created }`
  - `event: connected` `data: { status }`
  - `event: message` `data: { chunk }`  (repeated)
  - `event: done` `data: { status }`
  - `event: error` `data: { error: { code, message } }`
- `GET /chat/sessions?profileId=UUID` → `{ sessions: Session[] }`
- `POST /chat/sessions` body `{ profileId, title? }` → `201 { session }`
- `GET /chat/sessions/:id` → `{ session, messages: { id, role:'user'|'assistant', content, isPartial, createdAt }[] }`
- `PATCH /chat/sessions/:id` body `{ title }` → `{ session }`
- `DELETE /chat/sessions/:id` → `204`

`Session = { id, profileId, title: string|null, createdAt, lastMessageAt }`

### Settings / misc
- `GET /settings/notifications` → `{ preferences: { emailDigestEnabled, digestFrequency:'monthly'|'quarterly', reportReadyEmailEnabled, lastSentAt } }`
- `PATCH /settings/notifications` body (subset) → `{ preferences }`
- `POST /contact` (no auth) `{ name, email, message }` → `{ ok }`
- `GET /slots` (no auth) → `{ remaining }`

### NEW endpoint to add for push (see §12)
- `POST /devices` body `{ expoPushToken, platform }` → `{ ok }` (registers token for the authed user). Additive; spec in §12.

---

## 7. API Client Layer

Single thin `fetch` wrapper (no axios needed on mobile). It (1) prefixes base URL, (2) injects the Bearer token from the live Supabase session, (3) normalizes the error envelope, (4) handles 401 by signing out.

```ts
// src/api/client.ts  (pattern — coding model implements fully)
import { supabase } from '@/auth/supabase';

const BASE = process.env.EXPO_PUBLIC_API_URL!; // ends in /api

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = {
    ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(await authHeader()),
    ...init.headers,
  };
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401) { await supabase.auth.signOut(); throw new ApiError('AUTHENTICATION_ERROR', 'Session expired'); }
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(json?.error?.code ?? 'INTERNAL_ERROR', json?.error?.message ?? 'Request failed', json?.error?.details);
  return json as T;
}
```
`endpoints.ts` exports one typed function per row in §6, e.g. `getDashboard(profileId)`, `uploadReport(formData)`, `listSessions(profileId)`. Hooks call these. **File upload uses `FormData`** — do NOT set `Content-Type` manually (let RN set the multipart boundary).

> Streaming `POST /chat` does **not** go through `api()` — it uses the SSE client in §8.3 because it needs an event stream, not a JSON body.

---

## 8. Auth, Secure Storage & Streaming (the plumbing)

### 8.1 Supabase client + SecureStore chunk adapter

```ts
// src/auth/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// SecureStore caps values at 2048 bytes; Supabase sessions are larger.
// Chunk the value across numbered keys.
const CHUNK = 2000;
const ChunkedSecureStore = {
  getItem: async (k: string) => {
    const meta = await SecureStore.getItemAsync(k);
    if (!meta) return null;
    const n = Number(meta);
    if (!Number.isInteger(n)) return meta;               // legacy single value
    let out = '';
    for (let i = 0; i < n; i++) out += (await SecureStore.getItemAsync(`${k}.${i}`)) ?? '';
    return out;
  },
  setItem: async (k: string, v: string) => {
    const parts = v.match(new RegExp(`.{1,${CHUNK}}`, 'g')) ?? [];
    await SecureStore.setItemAsync(k, String(parts.length));
    await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${k}.${i}`, p)));
  },
  removeItem: async (k: string) => {
    const meta = await SecureStore.getItemAsync(k);
    const n = Number(meta);
    if (Number.isInteger(n)) for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${k}.${i}`);
    await SecureStore.deleteItemAsync(k);
  },
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storage: ChunkedSecureStore, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } }
);
```

**Session lifecycle (root layout `app/_layout.tsx`):**
```
on mount: supabase.auth.getSession() → set authStore (loading→authed/anon)
subscribe: supabase.auth.onAuthStateChange((_e, session) => authStore.setSession(session))
also: register AppState listener → supabase.auth.startAutoRefresh()/stopAutoRefresh() on foreground/background
after first authed session: ensure a default profile exists (call useProfiles; if empty, the user creates one — see §9.6 onboarding)
```

### 8.2 Google OAuth (deep link)
```
1. app.json: "scheme": "vithos"
2. In Supabase dashboard → Auth → URL config, add redirect: vithos://auth/callback
3. Flow:
   const redirectTo = makeRedirectUri({ scheme: 'vithos', path: 'auth/callback' });
   const { data } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true }});
   const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
   if (res.type === 'success') { parse access_token & refresh_token from res.url; supabase.auth.setSession({...}); }
```
Email/password: `supabase.auth.signInWithPassword`. Signup: `supabase.auth.signUp({ email, password, options:{ data:{ name }, emailRedirectTo: 'vithos://auth/callback' }})` → route to `check-email`.

### 8.3 Streaming chat client (`react-native-sse`)
```ts
// src/api/chat.stream.ts
import EventSource from 'react-native-sse';
import { supabase } from '@/auth/supabase';

type Cb = { onSession?(s:{sessionId:string;title:string|null;created:boolean}):void;
            onChunk(c:string):void; onDone():void; onError(e:Error):void; };

export async function streamChat(
  body: { message: string; profileId?: string; sessionId?: string },
  cb: Cb,
) {
  const { data } = await supabase.auth.getSession();
  const es = new EventSource(`${process.env.EXPO_PUBLIC_API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
    body: JSON.stringify(body),
    pollingInterval: 0,            // disable auto-reconnect; this is a one-shot stream
  });
  es.addEventListener('session', (e) => cb.onSession?.(JSON.parse(e.data!)));
  es.addEventListener('message', (e) => { const p = JSON.parse(e.data!); if (p.chunk) cb.onChunk(p.chunk); });
  es.addEventListener('done',    () => { cb.onDone(); es.close(); });
  es.addEventListener('error',   (e:any) => { cb.onError(new Error(e?.message ?? 'stream error')); es.close(); });
  return () => es.close();         // caller can abort
}
```

**`useChat` hook** (the cache-merge pattern, ported from web):
```
state: pendingUser, streamingAssistant, isStreaming, error, activeSessionId
sendMessage(text):
  1. push optimistic user bubble + empty assistant bubble; isStreaming = true
  2. streamChat({ message, profileId, sessionId: activeSessionId }, callbacks)
     onSession: if created → setActiveSessionId(sessionId); invalidate ['chatSessions', pid]
     onChunk:   streamingAssistant.content += chunk     (re-render)
     onDone:    isStreaming=false; invalidate ['chatSession', activeSessionId]  (server replaces optimistic bubbles)
     onError:   isStreaming=false; surface error; keep partial text
displayed messages = [...persisted(from useChatSession), pendingUser?, streamingAssistant?]
```

---

## 9. Screen Specifications

Each screen lists: **route · data (hooks) · components · key states · interactions**. The coding model builds one screen at a time, top to bottom in §15 order. UI styling is filled from Figma (§11) at the end of each screen.

### 9.1 Login / Signup / Check-email — `app/(auth)/*`
- **Data:** none (auth store + Supabase directly).
- **Components:** `Field` (label+input+error), `Button`, Google button.
- **Login:** zod `{ email, password>=6 }`; `signInWithPassword`; on error show message; "Continue with Google" → §8.2; link to signup.
- **Signup:** zod `{ name>=2, email, password (>=8, 1 upper, 1 digit), confirm match }`; `signUp`; → `check-email?email=`.
- **Check-email:** static notice + "open mail app" + back to login.
- **States:** submitting (disable + spinner), field errors, top-level auth error.

### 9.2 Home / Dashboard — `app/(tabs)/home.tsx`
- **Data:** `useProfiles()` → active profile via store selector; `useDashboard(pid)`; `useUsage()`.
- **Components:** header with `ProfileSwitcher` + upload icon; `HealthSummaryCard` (name, relationship, alert count, stats: reports/last-check/biomarker count or "Analyzing…" when processing); `BiomarkerGrid` (up to 6 `BiomarkerCard`s: status badge + value + unit + ref range + trend arrow); "Health Summary" button → opens LHM markdown sheet; "Recent Reports" (last 3 `ReportCard`s); `UsageCard` (ring progress, "X pages left").
- **States:** loading (skeletons), empty (no profile → onboarding CTA; no reports → upload CTA), processing (dashboard polls every 5s while a report is `pending/processing`).
- **Interactions:** tap biomarker → trends tab focused on it (optional); tap report → detail; upload → §9.4 sheet.

### 9.3 Reports list + detail — `app/(tabs)/reports/index.tsx`, `[id].tsx`
- **List data:** `useReports(pid)`. Group by month (`date-fns`). Each `ReportCard`: date block, title, biomarker count, status badge (`Pending/Processing/Ready/Failed`), view-PDF action. **Poll the query (`refetchInterval`) while any item is pending/processing**; stop when all settled.
- **Detail data:** `useReport(id)` → biomarkers grouped by category + status; "View PDF" → `getReportDownload(id)` → open URL in `PdfViewer`/browser; delete (confirm) → `useDeleteReport`.
- **States:** loading, empty (upload CTA), failed report (show retry/delete).

### 9.4 Upload flow — `UploadSheet` (invoked from Home & Reports)
- **Pick:** `expo-document-picker` (`type: 'application/pdf'`, size guard ≤10MB).
- **Submit:** build `FormData` { file, profileId, reportDate? }; `useUploadReport` (no manual Content-Type). Show upload progress (use `expo-file-system` `createUploadTask` for progress, or a determinate spinner).
- **After success:** invalidate reports+dashboard+usage; toast "Uploaded — analyzing…"; the list/dashboard polling then flips status to Ready. If push is enabled, a notification also fires on completion (§12).
- **Errors:** `QUOTA_EXCEEDED` → "You've hit this month's free limit (used/limit)"; wrong type/size → inline.

### 9.5 Trends — `app/(tabs)/trends.tsx`
- **Data:** `useTrends(pid)` (only biomarkers with 2+ points).
- **Components:** category sections; `BiomarkerTrendChart` per biomarker — line series over dates, **dashed reference-range lines** (low/high), point color by latest status, header (name, unit, ref range, latest value, reading count).
- **Charting:** `react-native-gifted-charts` `LineChart` (supports reference lines + custom dot colors). Map `history[]` → `{ value, label: format(date) }`; add ref lines from `refRangeLow/High`.
- **States:** loading, empty ("upload 2+ reports to see trends").

### 9.6 Chat — `app/(tabs)/chat.tsx`
- **Data:** `useChatSessions(pid)`, `useChatSession(activeSessionId)`, `useChat(pid, sessionId)` (§8.3).
- **Components:** header with `ProfileSwitcher` + sessions button (opens `SessionsSheet`: list/new/rename/delete); message list (`ChatMessage`: user right/sage bubble, assistant left/markdown via `react-native-markdown-display`, streaming caret while `isStreaming`); `QuickQuestions` chips; `ChatInput` (auto-grow, Enter/send, disabled while streaming or no profile).
- **Behavior:** open most recent session for the profile on mount; `sessionId=null` = new chat (backend creates + emits `session`). Switching profile resets to that profile's sessions.
- **States:** empty (intro + quick questions), streaming (caret + disabled input), error (inline, keep partial).

### 9.7 Profile / Account — `app/(tabs)/profile.tsx`
- **Data:** `authStore.user`; `useProfiles()`; mutations for CRUD/default; `useNotifications()` + update.
- **Components:** account card (avatar, name, email, **Sign out**); notification settings (email digest toggle, frequency monthly/quarterly, report-ready toggle) → `useUpdateNotifications`; **Health Profiles** list (`ProfileCard`: name, relationship, age from dob; edit/delete/set-default); "Add profile" → `ProfileForm` sheet (relationship select, name w/ relationship-aware placeholder, optional DOB picker, gender). Links: privacy/terms/help.
- **Validation:** zod `profileSchema` (relationship enum, name>=2, dob optional, gender optional). **Empty dob is allowed** (backend accepts empty/absent).
- **Onboarding:** if `profiles` is empty after login, route the user here (or a focused first-run sheet) to create their first "self" profile before the dashboard is useful.

---

## 10. Design System → NativeWind

Port the web's `tailwind.config.ts` tokens into `tailwind.config.js`. These are final values (Figma may add/adjust, but start here).

```js
// tailwind.config.js (NativeWind v4)
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {
    colors: {
      primary:  { 50:'#f0f7f1',100:'#d9eedd',200:'#b5debb',300:'#87c793',400:'#5aac6a',500:'#3d9150',600:'#2e7340',700:'#275c35',800:'#22492c',900:'#1c3c24', DEFAULT:'#3d9150' },
      accent:   { 50:'#fdf3f0',100:'#fae4dd',200:'#f5c9bb',300:'#eda490',400:'#e07a5f',500:'#d45e40',600:'#b84530', DEFAULT:'#d45e40' },
      warning:  { 50:'#fffbeb',100:'#fef3c7',500:'#f59e0b',600:'#d97706', DEFAULT:'#f59e0b' },
      status:   { normal:'#3d9150', borderline:'#f59e0b', high:'#e07a5f', low:'#e07a5f' },
      background:'#FAFAF7', foreground:'#1E2D3D',
      card:'#FFFFFF', muted:'#F3F4EF', mutedfg:'#6B7280', border:'#E5E7E0',
    },
    fontFamily: { display:['CrimsonPro'], sans:['Nunito'] },
    borderRadius: { sm:'6px', md:'8px', lg:'10px' },
  }},
};
```
- **Fonts:** load Crimson Pro (display/headings) + Nunito (body) via `expo-font` in root layout; gate splash until loaded.
- **Mobile container:** the web's `max-w-[480px]` shell is irrelevant on a phone — use full width + `SafeAreaView`. Keep the look (cream bg, sage primary, terracotta for alerts/CTAs).
- **`src/theme/tokens.ts`** exports the same values as JS constants for places NativeWind can't reach (chart colors, status→color in `lib/status.ts`, navigation bar tint).
- **Status mapping** (`lib/status.ts`): `normal→primary.500`, `borderline→warning`, `high/low→accent` + label + (optional) trend arrow.

---

## 11. Figma → Code Workflow (MCP)

**When:** only after a screen's structure/data/components are built and runnable with placeholder styling. Style **one screen at a time** from its Figma frame.

**Setup (once):**
1. Install the official Figma plugin/MCP for Claude Code: `claude plugin install figma@claude-plugins-official` (remote MCP server — the recommended option), then enable it via `/plugin` → Installed. Alternatively the **desktop** server: Figma desktop app → open file → Dev Mode → enable MCP server in the right sidebar.
2. The MCP is **selection-based**: it reads whatever frame/layer is selected in Figma.

**Per-screen loop (the coding model does this):**
1. User selects the target frame in Figma (e.g. "Dashboard").
2. Ask the MCP for that selection's **design context** — layout, spacing, colors, text styles, and any component/variable references (Code Connect).
3. **Map tokens, don't hardcode:** translate Figma colors/spacing to the NativeWind tokens in §10. If Figma introduces a new token, add it to `tailwind.config.js` + `tokens.ts` first, then use it. Never paste raw hex when a token exists.
4. Apply styling to the already-built component tree; do not restructure data/logic to match a screenshot.
5. Verify against the real frame; iterate.

**Guardrails:** MCP output is a starting point, not final code — it tends to over-nest views and inline styles. Refactor into the existing `src/components/**` and token system. Keep components presentational (props in, no data fetching).

---

## 12. Backend Addition for Push (the only backend change)

Polling covers the foreground. For "your report is ready" when the app is closed, add Expo push.

**Client (`src/lib/push.ts`):**
```
- expo-notifications: request permissions, getExpoPushTokenAsync()
- after login, POST /devices { expoPushToken, platform } (the new endpoint)
- set notification handler; on tap, deep-link to the relevant report
```

**Backend (small, additive — implement in vitals/src):**
1. **Migration:** `device_tokens(user_id uuid, token text unique, platform text, created_at)` with RLS (user owns rows).
2. **Route:** `POST /api/devices` (authed) → upsert token for `req.user.id`. Validate `{ expoPushToken: string, platform: 'ios'|'android' }`.
3. **Worker hook:** in the report-processing worker, when status flips to `done` (or `failed`), look up the profile's `user_id`, fetch their device tokens, and POST to Expo Push API (`https://exp.host/--/api/v2/push/send`) with `{ to, title:'Report ready', body:'<Name>'s report is analyzed', data:{ reportId, profileId } }`. Respect the existing `reportReadyEmailEnabled`-style preference (add `pushEnabled` if desired).
4. No other endpoints change.

> This is the **only** backend work implied by the chosen options. Everything else uses existing endpoints. If push is descoped later, the app still works fully on polling alone.

---

## 13. Testing Strategy

Layered, cheapest first. The coding model writes tests alongside each phase.

**1. Unit (Jest + ts-jest)** — pure logic, no native deps:
- `lib/validators.ts` (zod schemas: valid/invalid cases for login, signup, profile).
- `lib/formatters.ts`, `lib/status.ts` (status→color/label, date/age formatting).
- `store/profileStore.ts` `getActiveProfile` selector (all fallback branches).
- API error normalization in `client.ts` (mock `fetch`: 401, 429, validation envelope).

**2. Component (@testing-library/react-native + jest-expo)** — render + interaction, mock hooks/API:
- `BiomarkerCard` renders correct badge color per status.
- `ChatMessage` renders user vs assistant; shows streaming caret when `isStreaming`.
- `ProfileForm` shows validation errors; submit calls mutation with parsed values.
- `ReportCard` shows correct status badge for each `processingStatus`.
- `UploadSheet` rejects non-PDF / oversized files.
- Mock TanStack Query with a test `QueryClientProvider`; mock `src/api/endpoints` and `src/api/chat.stream`.

**3. Integration (mocked network)** — use **MSW** (or a fetch mock) to assert hooks call the right endpoints with the right `profileId`/headers and that mutations invalidate the right keys (e.g. upload → reports+dashboard+usage refetch). Mock the SSE client to emit a scripted `session→message×N→done` sequence and assert `useChat` accumulates text and swaps in persisted messages on done.

**4. E2E (Maestro)** — flows on a simulator against a **staging backend** (or seeded local):
- Sign in → land on Home.
- Create a profile → appears in switcher.
- Upload a (small fixture) PDF → status goes Processing → Ready (allow poll time).
- Open Trends → chart renders for a seeded biomarker.
- Chat → send a message → streamed answer appears → new session listed.
- Sign out → back to login.
Maestro flows are YAML in `.maestro/`; run with `maestro test .maestro/`.

**5. Manual / device matrix** — Expo Go or a dev client on at least one iOS + one Android device. Verify: deep-link OAuth round-trip, SecureStore session survives app restart, push notification received on report completion, LAN API reachability.

**CI suggestion:** GitHub Action runs `tsc --noEmit`, `jest` (unit+component+integration) on PR; Maestro runs nightly or pre-release on EAS.

**Definition of done per screen:** typechecks, its component tests pass, manually runs against the dev backend, and matches the Figma frame.

---

## 14. Environment & Config

`.env` (and `app.config.ts` `extra`) — all client vars must be `EXPO_PUBLIC_*` to be inlined:
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000/api     # LAN IP in dev; prod URL in prod profiles
EXPO_PUBLIC_SUPABASE_URL=https://jpfwvvavikkbrferkmuc.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
```
`app.json`/`app.config.ts`: `scheme: 'vithos'`, plugins `[expo-secure-store, expo-notifications, expo-font]`, iOS/Android bundle ids, notification icon. EAS Build profiles: `development` (dev client), `preview` (internal), `production`.

**CORS:** the backend's CORS list doesn't restrict native apps (CORS is a browser concept), so no backend CORS change is needed for the mobile client.

---

## 15. Implementation Order (build sequence for the coding model)

Each phase ends in something runnable and testable. Do not proceed until the current phase runs.

| Phase | Deliverable | Verifies |
|---|---|---|
| **0. Scaffold** | `create-expo-app` (TS, Expo Router), add NativeWind v4 (global.css, babel, metro, config), fonts, tokens (§10), env (§14). App boots to a "Hello" screen. | Toolchain + styling pipeline. |
| **1. Auth plumbing** | Supabase client + chunk adapter (§8.1), authStore, root layout session gate, login/signup/check-email, Google OAuth (§8.2). | Sign in/out, session persists across restart. |
| **2. API + state core** | `client.ts`, `endpoints.ts`, `types.ts`, QueryClient, profileStore + selector, `useProfiles`. | Authed GET works; active profile resolves. |
| **3. Tabs + Profiles** | `(tabs)/_layout`, ProfileSwitcher, Profile screen (CRUD + default + onboarding first profile), notification settings. | Full profile lifecycle; tab gating. |
| **4. Dashboard** | `useDashboard`/`useUsage`, Home screen, HealthSummaryCard, BiomarkerGrid/Card, UsageCard, LHM sheet, processing-poll. | Real data renders; "Analyzing…" polling. |
| **5. Reports + Upload** | `useReports`/`useReport`, list+detail, UploadSheet (document-picker + FormData + progress), delete, status polling, quota error. | Upload → Processing → Ready loop. |
| **6. Trends** | `useTrends`, BiomarkerTrendChart (gifted-charts) with ref lines. | Charts render from real history. |
| **7. Chat (streaming)** | `chat.stream.ts` (react-native-sse), `useChat`, chat screen, sessions sheet, markdown render, quick questions. | Streamed answers; session CRUD. |
| **8. Push** | Backend `device_tokens` + `POST /devices` + worker trigger (§12); client `lib/push.ts` register + handlers. | Report-done notification on closed app. |
| **9. Figma polish** | Per-screen MCP styling pass (§11), in tab order. | Visual match to designs. |
| **10. Test + harden** | Fill test layers (§13), empty/error/loading states, accessibility labels, EAS build profiles. | Green CI; E2E flows pass. |

> A smaller coding model should take **one row at a time**, implement it fully (including its tests), confirm it runs against the dev backend, then move on. Phases 1–7 use only existing backend endpoints; phase 8 is the sole backend change.

---

## 16. Conventions (keep the small model on-rails)

- **TypeScript strict.** Mirror API types in `src/api/types.ts`; import them everywhere — no `any` on API data.
- **Hooks own data, components own pixels.** Screens compose. If a component fetches data, that's a bug.
- **Always pass `profileId` from the store-resolved active profile.** Never read it from a screen-local state.
- **Tailwind classes via NativeWind `className`.** Use tokens from §10; for dynamic colors (status, charts) import from `tokens.ts`.
- **One endpoint = one function in `endpoints.ts` = one hook.** Don't call `fetch`/`api()` directly inside components.
- **Mutations invalidate the keys in §4.2.** Keep that table authoritative.
- **Errors are the §6 envelope.** Surface `error.message`; special-case `AUTHENTICATION_ERROR`, `QUOTA_EXCEEDED`, `VALIDATION_ERROR`.
- **No new backend endpoints** except `POST /devices` (§12).

---

### Sources (verified during research, June 2026)
- Expo SSE limitation + `react-native-sse`: [expo/expo #27526](https://github.com/expo/expo/issues/27526), [binaryminds/react-native-sse](https://github.com/binaryminds/react-native-sse)
- NativeWind v4 / SDK 53 setup: [NativeWind versions discussion](https://github.com/nativewind/nativewind/discussions/1604), [NativeWind v5 migration (why stay on v4 for SDK 53)](https://www.nativewind.dev/v5/guides/migrate-from-v4)
- Supabase RN auth + SecureStore size limit: [Supabase Docs — Use Supabase Auth with React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native), [Using Supabase — Expo Docs](https://docs.expo.dev/guides/using-supabase/)
- Figma MCP for Claude Code: [Figma Help — Claude Code and Figma: Set up the MCP server](https://help.figma.com/hc/en-us/articles/39888612464151-Claude-Code-and-Figma-Set-up-the-MCP-server)
</content>
</invoke>
