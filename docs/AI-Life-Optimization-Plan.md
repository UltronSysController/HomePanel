# AI Life - HomePanel Optimization Plan

## Executive Summary

**AI Life** transforms HomePanel from a manual smart home controller into an **intelligent living assistant** that learns, predicts, and adapts to user behavior. This plan leverages the existing robust service layer (automation, scenes, energy, sensors) that currently lacks UI and AI integration.

---

## 1. Current State Analysis

### What Already Exists (Service Layer)
| Service | Status | UI |
|---------|--------|----|
| Automation Service | ✅ 5 types, 8 templates, `suggestAutomations()` | ❌ No UI |
| Scene Service | ✅ 8 default scenes, snapshot creation | ⚠️ Basic SceneButton only |
| Energy Service | ✅ Realtime power, history, insights, efficiency ratings | ❌ No UI |
| Sensor Data | ✅ Temperature, humidity, CO2, PM2.5, illuminance, motion | ⚠️ Displayed but not analyzed |
| Weather Integration | ✅ Open-Meteo with auto-geolocation | ⚠️ Display only |
| Device Control | ✅ Full trait support (OnOff, Brightness, Color, Temperature, Fan) | ✅ Complete |

### Key Gaps
1. **No automation UI** — service exists but users can't create/manage automations
2. **No energy dashboard** — power data available but not visualized
3. **No AI analysis** — sensor data collected but never analyzed for patterns
4. **No predictive behavior** — no learning from user habits
5. **No contextual awareness** — weather, time, occupancy not used for decisions

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    AI Life Module                         │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ Smart    │ Energy   │ Comfort  │ Routine  │ AI          │
│ Summary  │ Advisor  │ Engine   │ Learning │ Assistant   │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│              AI Analysis Engine (Client-side)             │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ Sensor   │ Energy   │ Weather  │ Device   │ Automation  │
│ Service  │ Service  │ Service  │ Store    │ Service     │
└──────────┴──────────┴──────────┴──────────┴─────────────┘
            (Existing service layer - already built)
```

---

## 3. Phased Implementation

### Phase 1: AI Summary Dashboard (Foundation)
**Goal:** Surface existing data intelligently on a single "AI Life" page.

#### 1.1 Home Summary Card
- **What:** A top-level card showing "Your home at a glance"
- **Data sources:** Device states, sensor data, weather, energy
- **Content:**
  - "3 lights on, AC at 24°C in bedroom"
  - "Indoor 25°C / Outdoor 32°C — AC recommended"
  - "Today's energy: 4.2 kWh (↓12% vs yesterday)"
  - "2 devices offline"
- **Implementation:**
  - New `src/services/ai-summary-service.ts`
  - New `src/components/AISummaryCard.tsx`
  - Aggregates data from existing store + services

#### 1.2 Smart Suggestions Bar
- **What:** Contextual action suggestions based on current state
- **Logic (rule-based, no ML needed):**
  - Time-based: "It's 11pm — activate Goodnight scene?"
  - Weather-based: "Rain incoming — close windows?"
  - Energy-based: "AC running 6hrs — switch to fan mode?"
  - Sensor-based: "CO2 at 1200ppm — turn on ventilation?"
  - State-based: "You left 3 lights on in empty rooms"
- **Implementation:**
  - New `src/services/ai-suggestion-engine.ts`
  - New `src/components/SmartSuggestionBar.tsx`
  - Rule engine evaluating: time + weather + sensor + device state

#### 1.3 AI Life Page (New Route)
- **Path:** `/ai-life`
- **Sections:**
  - Home Summary (1.1)
  - Smart Suggestions (1.2)
  - Quick Scene Shortcuts (leverage existing `scene-service.ts`)
  - Room Environment Overview (sensor data per room)
- **Add to sidebar navigation** as a new nav item

---

### Phase 2: Energy Intelligence
**Goal:** Build a full energy dashboard using the existing energy service.

#### 2.1 Energy Dashboard Page
- **Path:** `/ai-life/energy` or tab within AI Life
- **Components:**
  - `EnergyOverviewCard` — Today/week/month consumption with trend arrows
  - `DevicePowerRanking` — Top 5 energy consumers with efficiency ratings (A++ to E)
  - `EnergyTrendChart` — 30-day line chart (use lightweight charting like recharts)
  - `CostEstimateCard` — Monthly cost projection based on current usage
- **Data source:** Existing `energy-service.ts` methods:
  - `getRealtimePower()`, `getDevicePowerUsage()`, `getEnergyTrend()`
  - `getDeviceEfficiencyRating()`, `getEnergyInsights()`

#### 2.2 Smart Energy Recommendations
- **What:** Actionable tips derived from `getEnergyInsights()`
- **Examples:**
  - "Device X consumes 2W in standby — auto-off schedule suggested"
  - "Peak usage 2-5pm — shift AC schedule to pre-cool at 1pm"
  - "Bedroom light rated D efficiency — consider LED upgrade"
- **One-tap action:** Suggestion → create automation directly

#### 2.3 Energy Goal Tracking
- **What:** Set monthly kWh / cost targets
- **Uses:** Existing `setEnergyGoal()` with daily allowance calculation
- **UI:** Progress bar + daily/weekly breakdown

---

### Phase 3: Automation Manager
**Goal:** Build UI for the existing automation service (currently no UI at all).

#### 3.1 Automation List Page
- **Path:** `/ai-life/automations` or tab within AI Life
- **Components:**
  - `AutomationList` — All automations with enable/disable toggle
  - `AutomationCard` — Shows trigger → condition → action flow visually
  - `AutomationEditor` — Create/edit automation form
- **Supported types (all from existing service):**
  - Sensor-range (e.g., temp > 28°C → turn on AC)
  - Time-based (e.g., 7am → open curtains)
  - Device-state (e.g., door opens → turn on hallway light)
  - Activity-based (e.g., motion detected → activate scene)

#### 3.2 AI-Suggested Automations
- **Uses:** Existing `suggestAutomations()` method
- **UI:** "Suggested for you" section with one-tap creation
- **Enhancement:** Rank suggestions by relevance using device usage frequency

#### 3.3 Automation Templates
- **Uses:** Existing 8 built-in templates:
  - Temperature Control, Time-based Lighting, Away Mode, Humidity Control
  - Sunrise/Sunset, Motion Detection, Air Quality, Sleep Mode
- **UI:** Template gallery with preview + customize → create flow

---

### Phase 4: Comfort Engine & Routine Learning
**Goal:** Pattern recognition from user behavior (client-side, no backend ML).

#### 4.1 Usage Pattern Detection
- **What:** Track and analyze user interactions over time
- **Storage:** New persisted Zustand slice for interaction history
- **Data captured:**
  - Device toggle timestamps (which device, what state, what time)
  - Scene activation patterns (which scene, when, how often)
  - Manual override frequency (how often user changes automated settings)
- **Implementation:**
  - New `src/services/pattern-service.ts`
  - Lightweight statistical analysis (averages, frequencies, time clustering)

#### 4.2 Routine Detection
- **What:** Identify repeating patterns and surface them
- **Examples:**
  - "You turn on living room lights at ~6:30pm every weekday"
  - "You lower AC to 22°C before sleeping"
  - "You activate Movie scene on Friday evenings"
- **Action:** Offer to create automation from detected pattern

#### 4.3 Comfort Index
- **What:** Per-room comfort score (0-100) based on:
  - Temperature deviation from ideal (22-26°C)
  - Humidity (40-60% optimal)
  - CO2 levels (< 1000ppm)
  - PM2.5 (< 25 μg/m³)
  - Illuminance (context-dependent)
- **UI:** Room cards show comfort score + which factor is lowest
- **Action:** One-tap "Optimize" button to adjust devices for ideal comfort

#### 4.4 Adaptive Scenes
- **What:** Scenes that adjust based on context
- **Example:** "Morning" scene sets brightness to 70% on cloudy days, 40% on sunny days
- **Implementation:** Scene wrapper that applies modifiers based on weather/time/season

---

### Phase 5: AI Assistant (Optional / Advanced)
**Goal:** Natural language interaction for home control.

#### 5.1 Chat Interface
- **What:** Simple chat UI for home queries and commands
- **Approach:** Rule-based NLU (no LLM dependency) OR optional LLM integration
- **Commands:**
  - "Turn off all lights" → batch control
  - "What's the temperature in bedroom?" → sensor query
  - "Make it cooler" → contextual AC adjustment
  - "Set up movie time" → scene activation
- **Implementation:**
  - New `src/components/AIAssistant.tsx`
  - Intent parser matching common patterns
  - Falls back to showing relevant controls

#### 5.2 Voice Control (Stretch Goal)
- **What:** Web Speech API integration for voice commands
- **Scope:** Same command set as chat, triggered by microphone button

---

## 4. New File Structure

```
src/
├── pages/
│   └── AILifePage.tsx                    # New main AI Life page
│
├── components/
│   ├── ai-life/
│   │   ├── AISummaryCard.tsx             # Home summary
│   │   ├── SmartSuggestionBar.tsx        # Contextual suggestions
│   │   ├── ComfortIndexCard.tsx          # Room comfort score
│   │   ├── EnergyOverviewCard.tsx        # Energy summary
│   │   ├── EnergyTrendChart.tsx          # Energy chart
│   │   ├── DevicePowerRanking.tsx        # Top consumers
│   │   ├── AutomationList.tsx            # Automation manager
│   │   ├── AutomationCard.tsx            # Single automation display
│   │   ├── AutomationEditor.tsx          # Create/edit automation
│   │   ├── AutomationTemplateGallery.tsx # Template browser
│   │   ├── RoutineInsightCard.tsx        # Detected patterns
│   │   └── AIAssistant.tsx               # Chat interface (Phase 5)
│   │
│   └── (existing components unchanged)
│
├── services/
│   ├── ai-summary-service.ts            # Home state aggregation
│   ├── ai-suggestion-engine.ts          # Rule-based suggestion engine
│   ├── pattern-service.ts               # Usage pattern detection
│   ├── comfort-service.ts               # Comfort index calculation
│   └── (existing services unchanged)
│
├── store/
│   ├── index.ts                          # Existing store (add AI slices)
│   └── ai-life-store.ts                 # AI Life specific state
│
└── types/
    └── index.ts                          # Add AI Life types
```

---

## 5. New Dependencies (Minimal)

| Package | Purpose | Phase |
|---------|---------|-------|
| `recharts` | Energy trend charts | Phase 2 |
| (none else required) | Rule-based AI runs client-side | All |

> **Design principle:** Minimize new dependencies. All AI logic is rule-based and runs client-side using existing data from the UltronSMART API.

---

## 6. Store Extensions

```typescript
// New types for AI Life
interface AILifeState {
  // Suggestions
  suggestions: SmartSuggestion[];
  dismissedSuggestions: string[];

  // Energy
  energyGoal: { monthly: number; costPerKwh: number } | null;
  energyHistory: EnergySnapshot[];

  // Patterns
  interactionLog: InteractionEntry[];
  detectedRoutines: DetectedRoutine[];

  // Comfort
  comfortScores: Record<string, ComfortScore>; // roomId -> score

  // Actions
  refreshSuggestions: () => Promise<void>;
  logInteraction: (entry: InteractionEntry) => void;
  analyzePatterns: () => DetectedRoutine[];
  calculateComfort: (roomId: string) => ComfortScore;
}
```

---

## 7. Priority & Impact Matrix

| Feature | Effort | Impact | Phase |
|---------|--------|--------|-------|
| Home Summary Card | Low | High | 1 |
| Smart Suggestions | Medium | High | 1 |
| AI Life Page | Low | High | 1 |
| Energy Dashboard | Medium | High | 2 |
| Energy Recommendations | Low | Medium | 2 |
| Automation List UI | Medium | High | 3 |
| AI-Suggested Automations | Low | Medium | 3 |
| Automation Templates UI | Medium | Medium | 3 |
| Usage Pattern Detection | High | Medium | 4 |
| Routine Detection | High | Medium | 4 |
| Comfort Index | Medium | High | 4 |
| Adaptive Scenes | Medium | Medium | 4 |
| AI Chat Assistant | High | Medium | 5 |
| Voice Control | High | Low | 5 |

---

## 8. Key Optimization Strategies

### A. Performance
- **Lazy loading:** AI Life page code-split via `React.lazy()`
- **Memoization:** Expensive calculations (comfort scores, energy aggregations) cached with `useMemo`
- **Debounced updates:** Suggestion engine re-evaluates at most every 30 seconds
- **Incremental pattern analysis:** Only analyze new interactions, not full history

### B. Data Efficiency
- **Batch API calls:** Combine device state + sensor + energy queries where possible
- **LocalStorage limits:** Cap interaction log to last 30 days (rotate oldest entries)
- **Derived state:** Compute suggestions from existing store data, don't duplicate

### C. UX
- **Non-intrusive suggestions:** Dismissible, not modal — user stays in control
- **Progressive disclosure:** Summary → details on tap/click
- **Offline-capable:** Suggestions and comfort scores work from cached data
- **Consistent with existing UI:** Follow Apple Home-inspired design language

---

## 9. Implementation Order Recommendation

```
Week 1-2:  Phase 1 — AI Summary + Suggestions + AI Life Page
Week 3-4:  Phase 2 — Energy Dashboard + Recommendations
Week 5-6:  Phase 3 — Automation Manager UI
Week 7-8:  Phase 4 — Comfort Engine + Pattern Learning
Week 9+:   Phase 5 — AI Assistant (optional)
```

**Start with Phase 1** — it provides the highest value with the lowest effort and creates the foundation for all subsequent phases.

---

## 10. Summary

The AI Life feature transforms HomePanel by:

1. **Surfacing hidden value** — Existing services (automation, energy, sensors) finally get UI
2. **Adding intelligence** — Rule-based suggestions that feel smart without requiring ML infrastructure
3. **Learning from users** — Pattern detection creates personalized automation suggestions
4. **Measuring comfort** — Quantifiable room comfort scores with one-tap optimization
5. **Minimizing complexity** — Client-side only, no new backend, minimal new dependencies

The existing service layer is **60-70% ready** — the main work is building the UI layer and the lightweight AI analysis engine on top.
