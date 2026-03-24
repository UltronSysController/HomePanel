# CLAUDE.md — HomePanel Development Guide

## 開發合作原則
- **先討論分析方案，確認後再執行** — 所有功能開發都應該先討論分析，確認方案後再實施
- 有任何 UltronSMART API / Ultron Cloud API 問題時，請查 `/aaron0624/Projects/cms-server-main` 再進行

---

## Project Overview

**HomePanel** is an Apple Home-style smart home dashboard built with React 19 + TypeScript. It integrates with the UltronSMART API to control IoT devices (lights, switches, AC, sensors, etc.) with features like drag-and-drop device grouping, room management, and real-time device control.

- **Package name**: `ultron-scada`
- **Architecture**: Client-side React SPA + Node.js CORS proxy server
- **Deployment**: Vercel (serverless functions for API proxy)

---

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | React | 19.1.0 |
| Language | TypeScript | 4.9.5 |
| Build Tool | Create React App | 5.0.1 |
| Routing | React Router DOM | 7.7.0 |
| State Management | Zustand | 5.0.6 |
| HTTP Client | Axios | 1.11.0 |
| Animation | Framer Motion | 12.23.7 |
| Icons | Lucide React | 0.525.0 |
| Drag & Drop | React Beautiful DnD | 13.1.1 |
| CSS | Tailwind CSS 4.1 + PostCSS + custom CSS |
| Proxy Server | Express | 4.18.2 |
| Testing | Jest + React Testing Library |

---

## Directory Structure

```
HomePanel/
├── src/
│   ├── components/          # UI components (26 files)
│   │   ├── DeviceCard.tsx           # Individual device card
│   │   ├── DeviceControl.tsx        # Device control modal (~900 lines)
│   │   ├── DeviceGroupCard.tsx      # iOS-style grouped devices
│   │   ├── DeviceSettings.tsx       # Device configuration
│   │   ├── GroupControl.tsx         # Group-level controls
│   │   ├── GroupSelector.tsx        # Location/group picker
│   │   ├── GroupSettings.tsx        # Group configuration
│   │   ├── RoomDeviceGrid.tsx       # Device grid layout
│   │   ├── RoomNameEditor.tsx       # Room name/icon editing
│   │   ├── RoomSection.tsx          # Room container
│   │   ├── AddRoomModal.tsx         # Room creation dialog
│   │   ├── Sidebar.tsx              # Collapsible navigation sidebar
│   │   ├── SceneButton.tsx          # Scene trigger button
│   │   ├── TemperatureCard.tsx      # Temperature display
│   │   └── WeatherIcon.tsx          # Weather visualization
│   ├── pages/               # Page-level components
│   │   ├── HomePage.tsx             # Main dashboard (~850 lines)
│   │   └── ConfigPage.tsx           # API credential setup
│   ├── services/            # API & external service clients
│   │   ├── ultron-api.ts            # UltronSMART API client (~900 lines)
│   │   ├── api.ts                   # Alternative API wrapper
│   │   ├── weather.ts               # Open-Meteo weather service
│   │   ├── scene-service.ts         # Scene management
│   │   ├── automation-service.ts    # Automation/rules engine
│   │   ├── energy-service.ts        # Energy monitoring
│   │   └── service-manager.ts       # Service coordination
│   ├── store/
│   │   └── index.ts                 # Zustand store (~1,683 lines)
│   ├── hooks/
│   │   └── useDragAndDrop.ts        # Drag-and-drop custom hook
│   ├── types/
│   │   └── index.ts                 # Shared TypeScript interfaces
│   ├── styles/
│   │   └── global.css               # Apple Home design system
│   ├── App.tsx                      # Root component with routing
│   └── index.tsx                    # Entry point
├── proxy-server/            # Express CORS proxy (dev)
│   ├── server.js
│   └── package.json
├── api/                     # Vercel serverless function (prod)
│   └── proxy.js
├── .github/workflows/       # CI/CD pipelines
│   ├── ci.yml                       # Build & test (Node 18/20)
│   ├── deploy-to-vercel.yml         # Vercel deployment
│   ├── deploy.yml
│   └── test.yml
├── vercel.json              # Vercel config (rewrites, CORS, functions)
├── tsconfig.json            # TypeScript strict mode
├── .npmrc                   # legacy-peer-deps=true
└── package.json
```

---

## Quick Start

```bash
# Install dependencies
npm install

# Start React dev server (port 3000)
npm start

# Start proxy server (port 3001) — required for API calls in dev
cd proxy-server && npm start

# Or run everything together
npm run dev:all
```

### NPM Scripts

| Script | Description |
|--------|-------------|
| `npm start` | React dev server on port 3000 |
| `npm run build` | Production build to `build/` |
| `npm test` | Jest tests in watch mode |
| `npm run dev:all` | Concurrent: React + MCP + proxy server |
| `npm run mcp:start` | Start MCP server |
| `npm run mcp:build` | Build MCP server |

---

## Architecture & Key Patterns

### State Management (Zustand)

Central store in `src/store/index.ts`. Key state:

- `apiConfig` — API credentials (appId, apiKey)
- `devices` — `Record<sn, Device>` of all devices
- `rooms` — Virtual room definitions
- `deviceRoomAssignments` — Maps device SN → room ID
- `customDeviceNames` — Maps device SN → custom name
- `deviceGroups` — iOS-style device groups
- `deviceOrder` — Per-room device ordering

**Persisted to localStorage** via Zustand `persist` middleware:
`apiConfig`, `rooms`, `deviceRoomAssignments`, `customDeviceNames`, `deviceGroups`

Key actions: `setApiConfig()`, `loadGroups()`, `selectGroup()`, `toggleDevice()`, `updateDeviceState()`, `createDeviceGroup()`

### API Proxy Architecture

```
[Dev]  React (3000) → Express proxy (3001) → api.ultroncloud.com
[Prod] React → /api/proxy (Vercel serverless) → api.ultroncloud.com
```

The proxy handles CORS and injects auth headers (X-Api-Key, Ultron-Cloud-Appid).

### UltronSMART API Endpoints

Key endpoints used (via `src/services/ultron-api.ts`):
- `/usr/v4/GroupMemberGetGroups` — List locations
- `/usr/v4/GetGroupDevices` — Fetch devices
- `/usr/v4/GetGroupDeviceStates` — Get device states
- `/usr/v4/SendCommand` — Control devices
- `/usr/v4/GetTypeIconList` — Device type icons

Features: retry with exponential backoff (3 retries), rate limiting (100ms min interval), 429 handling.

### Styling

- **Design system**: Apple Home-inspired glassmorphism in `src/styles/global.css`
- **CSS approach**: Mix of CSS Modules (`.module.css`) and regular CSS, plus Tailwind CSS 4.1
- **CSS variables**: `--bg-primary`, `--text-primary`, `--accent-blue`, `--shadow-*`, `--radius-*`
- **Responsive**: Media queries at 768px breakpoint; sidebar collapses to bottom nav on mobile

### Component Patterns

- Components use TypeScript with strict mode
- Framer Motion for animations (card transitions, modals)
- React Beautiful DnD for drag-and-drop (device reordering, group creation)
- Lucide React for all icons (SVG, 1.5px stroke)

---

## Key Types

```typescript
// Device (src/types/index.ts)
interface Device {
  sn: string              // Unique serial number
  name: string
  type: DeviceType        // light | switch | airConditioner | fan | sensor | ...
  online: boolean
  state: DeviceState      // { power, brightness, temperature, color, ... }
  roomId?: string
  originalSn?: string     // Parent SN if split device
  subDeviceIndex?: number // Index in multi-device
}

// DeviceGroup (iOS-style grouping)
interface DeviceGroup {
  id: string
  name: string
  type: DeviceType        // All members must match type
  deviceIds: string[]     // Device SNs
  roomId: string
}
```

---

## Feature Details

### Sidebar (Collapsible)
- 240px expanded → 68px collapsed with smooth transition
- When collapsed: editing disabled, hover effects disabled, nav icons centered
- Key fix: Use `display: none` (not `opacity: 0`) for `.nav-text` when collapsed

### Device Groups (iOS-style)
- Drag device to **right 75%** of another same-type device card → creates group (after 1s hold)
- Drag device to **left 25%** of card → reorders device (blue insert line)
- Groups show stacked card effect with count badge
- Power button controls all grouped devices simultaneously
- Groups auto-dissolve when only 1 device remains

### Room Management
- Default rooms: living-room, bedroom, kitchen, bathroom
- Users can add/edit/delete rooms, change icons and names
- Devices assigned to rooms via drag-and-drop or settings

### Device Splitting
- Multi-outlet and VRF devices are split into individual controls
- Each sub-device has `originalSn` and `subDeviceIndex`

---

## CI/CD

**GitHub Actions** (`.github/workflows/ci.yml`):
- Triggers: push to `main`/`develop`, PRs to `main`
- Matrix: Node 18.x, 20.x
- Steps: install → lint → test (`--watchAll=false --passWithNoTests`) → build → upload artifacts

**Vercel Deployment** (`.github/workflows/deploy-to-vercel.yml`):
- Preview deploys on PRs, production on `main`/`master`
- Secrets needed: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

## Common Issues & Solutions

### Proxy server connection refused
```bash
cd proxy-server && npm start
# Or in background:
cd proxy-server && nohup npm start > server.log 2>&1 &
```

### Device room assignments not persisting
Check that `deviceRoomAssignments` is in the Zustand store's `partialize` function for persistence.

### Icons not centering when sidebar collapsed
Use `display: none` instead of `opacity: 0` for hidden elements — prevents them from taking flex space.

### npm install peer dependency conflicts
The `.npmrc` sets `legacy-peer-deps=true`. Always use `npm ci` or `npm install --legacy-peer-deps` if issues arise.

---

## Environment Variables

No `.env` files are committed. API credentials are stored in localStorage via the ConfigPage UI.

**Vercel deployment secrets**:
- `REACT_APP_ULTRON_API_KEY`
- `REACT_APP_ULTRON_APP_ID`
- `REACT_APP_API_BASE_URL` (optional)
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

## Testing

```bash
npm test                              # Watch mode
npm test -- --watchAll=false          # Single run (CI)
```

Testing stack: Jest + `@testing-library/react` + `@testing-library/jest-dom`

### Manual Testing Checklist
- [ ] Sidebar collapse/expand animation smooth
- [ ] Icons properly centered when collapsed
- [ ] Room editing disabled when collapsed
- [ ] Hover effects only show when expanded
- [ ] Device room assignments persist after refresh
- [ ] Proxy server handles API calls correctly
- [ ] Device groups create correctly (drag to right 75% of card)
- [ ] Device reordering works (drag to left 25% of card)
- [ ] Groups persist after page refresh
- [ ] Group power control toggles all devices
- [ ] Groups auto-dissolve when only one device remains

---

## Code Conventions

- **TypeScript strict mode** — all code must pass strict type checking
- **Component files**: PascalCase `.tsx` with co-located `.css` or `.module.css`
- **Services**: camelCase `.ts` files in `src/services/`
- **State**: Single Zustand store in `src/store/index.ts`
- **Imports**: React/libraries first, then local modules
- **Error handling**: try-catch with user-friendly messages, console logging for debug
- **API calls**: Always through proxy, never direct to UltronSMART API
- **Persistence**: Only use Zustand persist middleware (not raw localStorage)
