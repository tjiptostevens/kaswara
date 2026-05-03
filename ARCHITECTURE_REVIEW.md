# Kaswara Architecture Review

**Date**: May 3, 2026 | **Reviewer Perspective**: Senior Engineer Joining Large Codebase

---

## Executive Summary

**Project**: Kaswara - Multi-workspace financial management system for personal/organizational expense tracking and budgeting

**Stack**: React 18 + Supabase + Zustand + React Hook Form + Zod + Tailwind CSS

**Current State**: Well-organized feature-based structure with solid fundamentals but suffering from **architectural inconsistency**, **duplicated patterns**, **performance concerns**, and **maintainability risks** that will compound as the system grows.

---

## 1. ARCHITECTURE OVERVIEW

### High-Level Data Flow

```
Supabase ← API calls
   ↓
Stores (Zustand) / Hooks (useState in RAPPage)
   ↓
Components (Pages → Feature Components → UI Components)
   ↓
React Hook Form + Zod Validation
   ↓
Store/Page state updates + Toast notifications
```

### Workspace Architecture

- **Multi-workspace system**: Users belong to personal + N organizational workspaces
- **Workspace switching**: Managed in `authStore`, persisted to localStorage
- **RLS (Row-Level Security)**: Database enforces org-level isolation
- **Role-based access**: bendahara, ketua, anggota with feature-gated permissions

### Key Domain Entities

1. **Transaksi** (Transactions): Income/expense with status workflow
2. **RAB** (Rencana Anggaran Biaya): Budget planning with items
3. **RAP** (Realisasi Anggaran Pengeluaran): Budget realization with photo proof
4. **Iuran** (Membership fees): Recurring payments per member
5. **Kategori**: Transaction categories per organization
6. **Anggota**: Organization members with roles

---

## 2. IDENTIFIED PROBLEMS

### 🔴 CRITICAL: Architectural Inconsistency

**Problem**: Stores and hooks are used inconsistently across the application.

**Evidence**:

- `useTransaksi()` hook uses Zustand store (`kasStore`) — correct pattern
- `useRAB()` hook uses `useState()` + direct Supabase calls — **inconsistent pattern**
- `RAPPage` uses `useState()` + direct Supabase calls — **no store at all**
- `TransaksiPage` uses hook (`useTransaksi()`) — correct pattern

**Impact**:

- Developers don't know which pattern to follow for new features
- RAP logic is trapped in a page component (hard to test, reuse)
- Mixed responsibility: pages handle both UI state AND API calls
- Cache invalidation is manual and error-prone

**Example Inconsistency**:

```jsx
// TransaksiPage - CORRECT (uses hook with store)
const { transaksi, loading, addTransaksi } = useTransaksi(filters)

// RAPPage - WRONG (direct Supabase in page)
const [rap, setRap] = useState([])
const fetchRAP = async () => {
  const { data } = await supabase.from('rap').select(...)
  setRap(data)
}
```

---

### 🔴 CRITICAL: Code Duplication — Status Workflow Logic

**Problem**: The same "mark original as amended, create new draft" logic is duplicated across 3 places.

**Locations**:

1. [kasStore.js](src/stores/kasStore.js#L82-L98) - `amendTransaksi()`
2. [useRAB.js](src/hooks/useRAB.js#L88-L115) - `amendRAB()`
3. [RAPPage.jsx](src/pages/RAPPage.jsx#L190-L210) - `handleAmend()`

**Pattern**:

```javascript
// ALL THREE DO THIS:
1. Mark original: status='amended', amended_by, amended_at, amended_from
2. Create new draft: Copy fields from original, add amended_from reference
3. Copy child items (RAB items, RAP photos)
4. Refetch data
```

**Impact**:

- Bug fix in one place requires fixing 3 places
- Future amendments (e.g., approval flows) need 3x changes
- Harder to understand domain: unclear this is a common pattern

---

### 🟡 HIGH: Store Inconsistency — kasStore Hybrid Pattern

**Problem**: `kasStore` mixes READ operations (fetchTransaksi, fetchKategori) with WRITE operations, but `fetch*` is called from pages too.

```javascript
// kasStore.js
fetchTransaksi: async (organisasiId, filters = {}) => {
  set({ loading: true });
  // ... fetch and set transaksi
};

// BUT ALSO in TransaksiPage:
const refetch = () => fetchTransaksi(activeWorkspace?.id, filters);
```

**Impact**:

- Unclear when to call `fetchTransaksi()` vs using store data
- Filters trigger hook re-runs but store not aware of filter changes
- Multiple refetch calls create race conditions

---

### 🟡 HIGH: Performance — Inefficient Filter Dependency

**Problem**: `useTransaksi` hook uses `JSON.stringify(filters)` as dependency.

[useTransaksi.js](src/hooks/useTransaksi.js#L23):

```javascript
useEffect(() => {
  if (activeWorkspace?.id) {
    fetchTransaksi(activeWorkspace.id, filters);
  }
}, [activeWorkspace?.id, JSON.stringify(filters)]); // ← INEFFICIENT
```

**Impact**:

- Every re-render with new filter object → new JSON string → refetch
- `filters` object created fresh in page each render
- Unnecessary API calls on unrelated re-renders
- Poor performance with slow network

---

### 🟡 HIGH: Form/Modal State Management

**Problem**: Modal and form state is scattered across pages.

**In each page** (TransaksiPage, RABPage, RAPPage):

```javascript
const [modalOpen, setModalOpen] = useState(false);
const [detail, setDetail] = useState(null);
const [filters, setFilters] = useState({});
```

**In uiStore**: Unused `modalOpen`, `modalContent` (not used by pages)

**Impact**:

- Inconsistent modal handling across features
- uiStore modal API is dead code
- Hard to track which modals are open globally
- No centralized undo/redo capability

---

### 🟡 HIGH: RAP Approval Logic Mixing Concerns

**Problem**: RAP approval auto-creates Transaksi — business logic mixed in page component.

[RAPPage.jsx](src/pages/RAPPage.jsx#L120-L160):

```javascript
const handleApprove = async (rapRow) => {
  // 1. Approve RAP
  await updateRAPStatus(rapRow.id, 'approved')

  // 2. Create transaksi automatically
  const { data: transaksiData } = await supabase.from('transaksi').insert({...})

  // 3. Link back to RAP
  await supabase.from('rap').update({ transaksi_id: transaksiData.id }).eq('id', rapRow.id)

  // 4. Check if all RAPs approved → mark RAB as selesai
  // ... more logic
}
```

**Impact**:

- Business rule (RAP approval → auto-transaksi) is buried in UI layer
- Hard to test without mounting React components
- Difficult to reuse in batch operations or background jobs
- Tight coupling between RAP and Transaksi domains

---

### 🟡 MEDIUM: Error Handling — Silent Failures

**Problem**: Error handling is inconsistent and often swallows errors.

**Examples**:

- [kasStore.js](src/stores/kasStore.js#L33): `if (error) return` — returns undefined instead of throwing
- [RAPPage.jsx](src/pages/RAPPage.jsx#L50): Multiple serial operations with no rollback
- No retry logic for failed uploads
- No error boundaries in React component tree

**Impact**:

- Users don't always know what went wrong
- Partial state updates (e.g., RAP approved but transaksi creation failed)
- Debugging production issues is harder

---

### 🟡 MEDIUM: Type Safety — No TypeScript

**Problem**: Large codebase without TypeScript creates maintenance risk.

**Risk Examples**:

- Props passed to components are unvalidated at runtime
- Store selectors could reference non-existent state properties
- Form schema validation only happens at submit time
- API responses not typed against schema

**Impact**:

- Refactoring requires manual search-and-replace
- Late detection of breaking changes
- IDE autocomplete limited to inferred types
- Harder onboarding for new team members

---

### 🟡 MEDIUM: Date Handling — String-Based

**Problem**: Dates stored as strings, no Date object manipulation.

```javascript
tanggal: z.string().min(1, 'Tanggal wajib diisi'),
tanggal_pengajuan: z.string().min(1, 'Tanggal pengajuan wajib diisi'),
```

**Issues**:

- No validation that tanggal_kegiatan > tanggal_pengajuan
- Date calculations require string parsing
- Timezone issues possible (all dates assumed local?)
- No support for date ranges in filters

---

### 🟡 MEDIUM: Performance — N+1 Queries in Tables

**Problem**: Related data fetching in table components.

[TransaksiTable.jsx](src/components/transaksi/TransaksiTable.jsx):

```javascript
{key: 'kategori', label: 'Kategori',
  render: (row) => row.kategori_transaksi?.nama || '—'  // ← joined in query
}
```

Actually this is GOOD — data IS joined. But some components might not be doing this optimally.

---

### 🟡 MEDIUM: Unstructured Logging & Debugging

**Problem**: No structured logging or debug output.

**Current state**:

- No logging library
- No error tracking (e.g., Sentry)
- Console.log scattered in code (if at all)
- Difficult to debug multi-step workflows

---

### 🟢 MINOR: Import Organization

**Problem**: No barrel exports for easier imports.

```javascript
// Current
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";

// Could be
import { Input, Button, Modal } from "../components/ui";
```

Actually [ui/index.js](src/components/ui/index.js) exists but might not be fully utilized.

---

### 🟢 MINOR: API Request Abstraction

**Problem**: Supabase calls scattered throughout codebase, no API layer.

```javascript
// In multiple places
const { data, error } = await supabase.from('transaksi').select(...)
const { data, error } = await supabase.from('rab').select(...)
```

**Benefits of abstraction**:

- Centralized request/response handling
- Easier to add request logging, retry logic
- Easier to mock for tests
- Single place to update API endpoints

---

## 3. PERFORMANCE BOTTLENECKS

### 1. **Filter Re-triggers Unnecessary Fetches**

- Problem: `JSON.stringify(filters)` creates new dependency identity
- **Severity**: MEDIUM | **Impact**: Extra API calls
- **Solution**: Memoize filters object or use dedicated filter store

### 2. **No Pagination in Tables**

- All transaksi/RAB/RAP fetched at once
- **Severity**: HIGH (once data grows) | **Impact**: Slow initial load
- **Solution**: Implement cursor-based pagination or limit+offset

### 3. **No Request Caching**

- Same data fetched multiple times if component remounts
- **Severity**: MEDIUM | **Impact**: Redundant API calls
- **Solution**: Add cache layer with TTL in stores

### 4. **Images in RAP not lazy-loaded**

- [FotoBuktiViewer.jsx](src/components/rap/FotoBuktiViewer.jsx) likely loads all images
- **Severity**: MEDIUM | **Impact**: Slow when many photos
- **Solution**: Lazy loading + thumbnail previews

### 5. **PDF Export Full Re-renders**

- Entire dataset converted to HTML/PDF
- **Severity**: LOW | **Impact**: Browser freeze on large exports
- **Solution**: Backend PDF generation or progressive chunking

---

## 4. MAINTAINABILITY RISKS

### Risk: Domain Logic in Components

- **Problem**: Business logic (RAP approval → transaksi creation) in React components
- **Risk**: Difficult to test, reuse, or trigger from CLI/cron jobs
- **Mitigation**: Move to service layer

### Risk: No API Versioning Strategy

- Direct Supabase schema access in frontend
- **Risk**: Schema changes break frontend; hard to manage migrations
- **Mitigation**: Centralized API layer with stable contract

### Risk: Feature Flags Missing

- No way to enable/disable features without code change
- **Risk**: Can't safely test new features in production
- **Mitigation**: Add feature flag library (e.g., Unleash, LaunchDarkly)

### Risk: Growing File Sizes

- Pages (e.g., RABPage, RAPPage) approaching 300+ lines
- **Risk**: Harder to understand, test, maintain
- **Mitigation**: Extract custom hooks and smaller components

---

## 5. REFACTORING STRATEGIES

### PRIORITY 1: Extract Shared Patterns

#### 1.1 Create Centralized Amendment Service

```javascript
// lib/amendmentService.js
export const createAmendmentRecord = async (original, userId, tableName) => {
  // Mark original as amended
  await supabase
    .from(tableName)
    .update({ status: "amended", amended_by: userId, amended_at: now() })
    .eq("id", original.id);

  // Create new draft
  const newRecord = await supabase
    .from(tableName)
    .insert({
      ...copyFields(original),
      amended_from: original.id,
      status: "draft",
    })
    .select()
    .single();

  // Copy child records if needed
  if (original[childTable]) {
    await copyChildren(childTable, original.id, newRecord.id);
  }

  return newRecord;
};
```

**Benefit**: Single source of truth; eliminates 3-way duplication

#### 1.2 Create Unified Status Flow Manager

```javascript
// lib/statusFlow.js
const WORKFLOWS = {
  transaksi: ["draft", "submitted", "cancelled", "amended"],
  rab: ["draft", "diajukan", "disetujui", "selesai"],
  rap: ["draft", "submitted", "approved", "cancelled"],
};

export const getStatusFlow = (type) => WORKFLOWS[type];
export const canTransition = (type, from, to) => {
  /* ... */
};
export const getNextStatus = (type, current) => {
  /* ... */
};
```

**Benefit**: Domain logic in one place; StatusFlow components become simpler

---

### PRIORITY 2: Standardize Store Pattern

#### 2.1 Create Store Template

All data entities should follow this pattern:

```javascript
// Template: stores/[entity]Store.js
const use[Entity]Store = create((set, get) => ({
  // State
  data: [],
  loading: false,
  error: null,
  filters: {},

  // Queries
  fetch: async (orgId, filters = {}) => { /* ... */ },

  // Mutations
  create: async (data) => { /* ... */ },
  update: async (id, updates) => { /* ... */ },
  delete: async (id) => { /* ... */ },

  // Metadata
  setFilters: (f) => set({ filters: f }),
  setError: (e) => set({ error: e }),
}))
```

#### 2.2 Consolidate RAP Logic into Store

```javascript
// stores/rapStore.js (NEW)
export const useRAPStore = create((set, get) => ({
  // ... standard CRUD

  approve: async (rapId) => {
    // 1. Approve RAP
    // 2. Auto-create transaksi (via transaction if DB supports)
    // 3. Update RAB status if all approved
    // 4. Return result or throw error
  },
}));
```

**Benefit**: RAP logic testable without React; pages become simpler

---

### PRIORITY 3: Create API Abstraction Layer

#### 3.1 Centralized Query Builder

```javascript
// lib/api.js
export const api = {
  // Resources
  transaksi: {
    list: (orgId, filters) =>
      supabase
        .from("transaksi")
        .select("*, kategori_transaksi(*), anggota_organisasi(*)")
        .eq("organisasi_id", orgId)
        .pipe(applyFilters(filters))
        .order("tanggal", { ascending: false }),

    get: (id) =>
      supabase
        .from("transaksi")
        .select("*, kategori_transaksi(*), anggota_organisasi(*)")
        .eq("id", id)
        .single(),

    create: (data) => supabase.from("transaksi").insert(data).select().single(),
  },

  rab: {
    /* ... */
  },
  rap: {
    /* ... */
  },
};
```

**Benefit**:

- Consistent join strategies
- Easier to add request logging
- Single place for pagination logic

---

### PRIORITY 4: Fix Hooks Dependency Issues

#### 4.1 Stabilize Filter Dependencies

```javascript
// hooks/useTransaksi.js (IMPROVED)
export function useTransaksi(orgId, initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters);
  const memoizedFilters = useMemo(
    () => filters,
    [
      filters.tipe,
      filters.kategoriId,
      filters.dari,
      filters.sampai,
      filters.status,
    ],
  );

  useEffect(() => {
    if (!orgId) return;
    fetchTransaksi(orgId, memoizedFilters);
  }, [orgId, memoizedFilters]); // ← Stable reference
}
```

---

### PRIORITY 5: Extract Business Logic

#### 5.1 Create Service Layer

```javascript
// services/rapService.js
export const approveRAP = async (rapId, userId) => {
  // 1. Validate RAP is in submittable state
  // 2. Start transaction
  // 3. Update RAP status
  // 4. Create transaksi
  // 5. Link transaksi to RAP
  // 6. Check RAB completion
  // 7. Commit transaction
  // 8. Return result
};
```

**Benefit**: Testable without React; reusable in batch jobs

---

### PRIORITY 6: Consolidate Modal State

#### 6.1 Global Modal Manager

```javascript
// stores/modalStore.js
const useModalStore = create((set) => ({
  modals: {}, // { [modalId]: { open: bool, data: any } }

  open: (modalId, data) => set((s) => ({
    modals: { ...s.modals, [modalId]: { open: true, data } }
  })),

  close: (modalId) => set((s) => ({
    modals: { ...s.modals, [modalId]: { open: false } }
  })),
}))

// Usage in page:
const { modals, open, close } = useModalStore()

return <>
  {modals.addTransaksi?.open && (
    <Modal open={...} onClose={() => close('addTransaksi')}>
      <FormTransaksi data={modals.addTransaksi.data} />
    </Modal>
  )}
</>
```

**Benefit**:

- Global modal state tracking
- Easier to implement undo/redo
- Consistent modal behavior

---

## 6. CODE IMPROVEMENTS

### Improvement 1: Extract Amended Records Display

**File**: [src/pages/TransaksiPage.jsx](src/pages/TransaksiPage.jsx#L188-L205)

**Current**:

```jsx
{
  detail.amended_at && (
    <p>
      Diamandemen pada:{" "}
      <span className="text-charcoal">
        {formatTanggalPendek(detail.amended_at)}
      </span>
    </p>
  );
}
{
  detail.amended_from && (
    <p className="text-xs text-stone">Amandemen dari transaksi sebelumnya</p>
  );
}
```

**Better**: Extract to component

```jsx
// components/AmendmentInfo.jsx
export function AmendmentInfo({ amended_at, amended_from, amended_by_label }) {
  if (!amended_at && !amended_from) return null;
  return (
    <div className="border-l-2 border-stone/20 pl-3 py-2 text-sm">
      {amended_at && <p>Diamandemen: {formatTanggalPendek(amended_at)}</p>}
      {amended_from && (
        <p className="text-xs text-stone">Amandemen dari ID: {amended_from}</p>
      )}
      {amended_by_label && (
        <p className="text-xs text-stone">Oleh: {amended_by_label}</p>
      )}
    </div>
  );
}
```

**Benefit**: DRY (used in 3 pages), reusable, easier to enhance

---

### Improvement 2: Create Generic Status Flow Component

**Current**: Duplicated logic in [TransaksiStatusFlow](src/components/transaksi/TransaksiStatusFlow.jsx) and [RABStatusFlow](src/components/rab/RABStatusFlow.jsx)

**Better**:

```jsx
// components/ui/StatusFlow.jsx
export function StatusFlow({ status, workflow, labels }) {
  const TERMINAL_STATES = workflow.filter(s => !MAIN_WORKFLOW.includes(s))

  if (TERMINAL_STATES.includes(status)) {
    return <Badge status={status} label={labels[status]} />
  }

  const mainSteps = workflow.filter(s => !TERMINAL_STATES.includes(s))
  const currentIdx = mainSteps.indexOf(status)

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {mainSteps.map((step, idx) => (
        <Fragment key={step}>
          <Badge status={idx <= currentIdx ? step : 'draft'} label={labels[step]} />
          {idx < mainSteps.length - 1 && <ArrowRight size={12} className="text-stone" />}
        </Fragment>
      ))}
    </div>
  )
}

// Usage:
<StatusFlow
  status={detail.status}
  workflow={['draft', 'submitted', 'approved', 'completed']}
  labels={{draft: 'Draft', submitted: 'Submitted', ...}}
/>
```

---

### Improvement 3: Consolidate Filter Logic

**File**: [src/components/transaksi/FilterTransaksi.jsx](src/components/transaksi/FilterTransaksi.jsx)

**Pattern**: Create a generic `<DynamicFilter>` component:

```jsx
// components/DynamicFilter.jsx
export function DynamicFilter({ filters, onChange, filterDefs }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {filterDefs.map((def) => (
        <FilterInput
          key={def.key}
          type={def.type}
          label={def.label}
          value={filters[def.key]}
          options={def.options}
          onChange={(val) => onChange(def.key, val)}
        />
      ))}
    </div>
  );
}
```

---

### Improvement 4: Add Error Boundary

**Missing**: No error boundary in app

```jsx
// components/layout/ErrorBoundary.jsx
export class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
    useUIStore
      .getState()
      .showToast(
        "Terjadi kesalahan tidak terduga. Silakan refresh halaman.",
        "error",
      );
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

// In App.jsx
<ErrorBoundary>
  <BrowserRouter>
    <Routes>...</Routes>
  </BrowserRouter>
</ErrorBoundary>;
```

---

### Improvement 5: Type Safety with JSDoc

**Without full TypeScript migration**, add JSDoc annotations:

```javascript
// stores/kasStore.js
/**
 * @typedef {Object} TransaksiFilters
 * @property {string} [tipe] - 'pemasukan' | 'pengeluaran'
 * @property {string} [kategoriId] - UUID
 * @property {string} [dari] - YYYY-MM-DD
 * @property {string} [sampai] - YYYY-MM-DD
 * @property {string} [status] - draft | submitted | cancelled | amended
 */

/**
 * Fetch transaksi with optional filters
 * @param {string} organisasiId - UUID
 * @param {TransaksiFilters} filters
 * @returns {Promise<void>}
 */
const fetchTransaksi = async (organisasiId, filters = {}) => {
  /* ... */
};
```

---

## 7. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (1-2 weeks)

1. ✅ Extract amendment logic → `lib/amendmentService.js`
2. ✅ Create API abstraction layer → `lib/api.js`
3. ✅ Add error boundary to App.jsx
4. ✅ Add comprehensive JSDoc types

### Phase 2: Store Consolidation (2-3 weeks)

5. ✅ Create `rapStore.js` with business logic
6. ✅ Migrate RAP page to use store
7. ✅ Standardize all stores to common template
8. ✅ Fix hook dependencies (memoize filters)

### Phase 3: DRY Improvements (1-2 weeks)

9. ✅ Extract shared components (AmendmentInfo, StatusFlow, DynamicFilter)
10. ✅ Create generic table wrapper with pagination
11. ✅ Create modal manager store

### Phase 4: Testing & Optimization (2-3 weeks)

12. ✅ Add unit tests for stores and services
13. ✅ Add integration tests for critical workflows
14. ✅ Performance audit: add pagination, caching

### Phase 5: Future Improvements (Optional)

- TypeScript migration
- Feature flags integration
- Structured logging / error tracking
- Backend API layer (optional, if load grows)

---

## 8. QUICK WINS (Can Do Today)

1. **Extract amendment display** → Create `<AmendmentInfo>` component (15 min)
2. **Create StatusFlow template** → Consolidate 2 components (30 min)
3. **Add error boundary** → Wrap App component (15 min)
4. **JSDoc annotations** → Add to main stores (1 hour)
5. **Create API.js** → Move Supabase queries (1-2 hours)

---

## 9. CONCLUSION

**Strengths**:

- ✅ Well-organized feature-based structure
- ✅ Solid multi-workspace architecture
- ✅ Good component modularity (UI components library)
- ✅ Proper use of validation (Zod schemas)
- ✅ Modern tech stack (React 18, Zustand, Tailwind)

**Weaknesses**:

- ❌ Inconsistent store vs hook patterns
- ❌ Business logic in components
- ❌ 3x code duplication in amendment workflows
- ❌ No API abstraction layer
- ❌ Performance concerns (filtering, pagination)

**Recommendation**:
Prioritize **Phase 1 + Phase 2** (3-4 weeks of effort) to establish architectural consistency and extract business logic. This will provide 80% of maintainability benefits with 20% of refactoring effort.

The codebase is **healthy and well-structured** at its core; these are engineering investments that pay dividends as the team and feature set grow.
