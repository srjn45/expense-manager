# Dashboard and Ledger UX: Technical one-pager

One-page technical specification for the proposed Dashboard and Ledger UX changes. APIs keep `from`/`to` (or `dateFrom`/`dateTo`) for future-proofing; the frontend exposes year/month selectors and derives date ranges before calling the API.

---

## 1. Summary of changes

| Area | Change |
|------|--------|
| **Dashboard** | Replace from/to date inputs with a **year dropdown** (years where data exists; default latest). Show **per-currency** expense/refund totals with correct **currency symbols**. Add an inline **monthly trend chart** (same year). |
| **Ledger** | Replace "Date from" and "Date to" with a **month selector** (e.g. `YYYY-MM`); apply filters as first/last day of that month. |
| **API** | No change to request params: dashboard and monthly-expense keep `from`/`to`; ledger-entries keeps `dateFrom`/`dateTo`. New endpoint: `GET /api/v1/analytics/years`. Dashboard response extended with per-currency totals. |

---

## 2. Current state (technical)

**Dashboard**

- **UI**: [apps/web/src/pages/DashboardPage.tsx](apps/web/src/pages/DashboardPage.tsx) — two `<input type="date">` for "From" and "To"; default range = first day of current month to today; max range 366 days; validation for from ≤ to and range ≤ 366.
- **Data**: `useDashboard(from, to)` calls `GET /api/v1/analytics/dashboard?from=&to=` (both required). Response: `{ totalExpense, totalRefund, entryCount, lastEntries }`. Totals are single numbers; UI formats them with a hardcoded default currency (INR) via `formatCurrency(amount)` (INR→₹, USD→$).
- **Backend**: [apps/api/app/routers/analytics.py](apps/api/app/routers/analytics.py) `get_dashboard_route(from_, to)`; [apps/api/app/services/analytics.py](apps/api/app/services/analytics.py) `get_dashboard(session, from_date, to_date)` — one aggregate query for `SUM(amount WHERE amount>0)`, `SUM(-amount WHERE amount<0)`, `COUNT(*)` over `ledger_entries` (no join to payment methods; no per-currency breakdown). Last 5 entries via `list_ledger_entries(..., date_from, date_to)` which joins Category and PaymentMethod (so each entry has currency).

**Charts (monthly trend)**

- [apps/web/src/pages/ChartsPage.tsx](apps/web/src/pages/ChartsPage.tsx) uses from/to inputs and `GET /api/v1/analytics/monthly-expense?from=&to=`. Response: `{ data: [ { month, totalExpense, totalRefund } ] }`. Renders recharts `BarChart` with `month`, `totalExpense`, `totalRefund`.

**Ledger**

- **UI**: [apps/web/src/pages/LedgerPage.tsx](apps/web/src/pages/LedgerPage.tsx) — filter state includes `dateFrom`, `dateTo` (strings); two date inputs; "Apply filters" copies to `filtersApplied`; `useLedgerEntries({ dateFrom, dateTo, ... })` passes them to the API when set.
- **API**: `GET /api/v1/ledger-entries` supports optional `dateFrom`, `dateTo` (inclusive), plus `cursor`, `limit`, `categoryId`, `paymentMethodId`, `type`, `tags`. [apps/api/app/routers/ledger_entries.py](apps/api/app/routers/ledger_entries.py), [apps/api/app/services/ledger_entry.py](apps/api/app/services/ledger_entry.py) — filtering by date is already implemented.

**Currency**

- Stored on `payment_methods.currency` (string, e.g. `INR`, `USD`). Each ledger entry gets currency via join to its payment method. No backend aggregation by currency for dashboard today.

---

## 3. API contract (unchanged params; new/updated responses)

**3.1 Dashboard — keep from/to**

- **Endpoint**: `GET /api/v1/analytics/dashboard`
- **Query params**: `from` (required, YYYY-MM-DD), `to` (required, YYYY-MM-DD). Validation: from ≤ to, range ≤ 366 days (unchanged).
- **Response (new shape)**:
  - Remove or replace single `totalExpense` / `totalRefund` with per-currency arrays:
  - `totalExpenseByCurrency`: `[ { "currency": string, "totalExpense": number } ]`
  - `totalRefundByCurrency`: `[ { "currency": string, "totalRefund": number } ]`
  - `entryCount`: number (unchanged)
  - `lastEntries`: array of ledger entry objects (unchanged; each has `currency`, `amount`, etc.)

**3.2 New endpoint: years with data**

- **Endpoint**: `GET /api/v1/analytics/years`
- **Query params**: none.
- **Response**: `{ "data": number[] }` — list of distinct years (integers) for which at least one non-deleted ledger entry exists, ordered descending (e.g. `[2025, 2024, 2023]`).

**3.3 Monthly expense — no change**

- **Endpoint**: `GET /api/v1/analytics/monthly-expense?from=&to=`
- Used by Dashboard for the trend chart with same from/to as the selected year (e.g. `from=2025-01-01&to=2025-12-31`).

**3.4 Ledger entries — no change**

- **Endpoint**: `GET /api/v1/ledger-entries`
- Optional `dateFrom`, `dateTo` (YYYY-MM-DD, inclusive). Frontend will set these to the first and last day of the selected month.

---

## 4. Backend implementation (in-depth)

**4.1 Per-currency totals**

- **New function** in [apps/api/app/services/analytics.py](apps/api/app/services/analytics.py):  
  `get_totals_by_currency(session: AsyncSession, from_date: date, to_date: date) -> list[dict]`
- **Logic**:  
  - Join `LedgerEntry` with `PaymentMethod` on `LedgerEntry.payment_method_id == PaymentMethod.id`.  
  - Filter: `LedgerEntry.deleted_at.is_(None)`, `LedgerEntry.date >= from_date`, `LedgerEntry.date <= to_date`.  
  - Group by `PaymentMethod.currency`.  
  - For each group:  
    - `totalExpense` = `COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)`  
    - `totalRefund` = `COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0)`  
  - Return list of `{ "currency": str, "totalExpense": float, "totalRefund": float }` (one row per currency).

**4.2 Dashboard service**

- **Modify** `get_dashboard(session, from_date, to_date)` (signature unchanged):
  - Call `get_totals_by_currency(session, from_date, to_date)` and include the result in the returned dict (e.g. `totals_by_currency`).
  - Keep existing logic for `entryCount` and `last_entries` (unchanged).
  - Remove or keep single `totalExpense`/`totalRefund` depending on chosen contract (recommend replacing with per-currency only).

**4.3 Years with data**

- **New function** in analytics service:  
  `get_years_with_data(session: AsyncSession) -> list[int]`
- **Logic**:  
  - `SELECT DISTINCT EXTRACT(YEAR FROM date) AS year FROM ledger_entries WHERE deleted_at IS NULL ORDER BY year DESC` (or equivalent in SQLAlchemy: `func.extract('year', LedgerEntry.date)`, distinct, order by year desc).  
  - Return list of integers.
- **New route** in [apps/api/app/routers/analytics.py](apps/api/app/routers/analytics.py): `GET /years` → call `get_years_with_data`, return `{ "data": [...] }`.

**4.4 Router response shape**

- In `get_dashboard_route`, build response with `totalExpenseByCurrency` and `totalRefundByCurrency` from the new per-currency list (e.g. map to `[{ "currency": c, "totalExpense": e }, ...]` and `[{ "currency": c, "totalRefund": r }, ...]`). If replacing old totals, remove `totalExpense` and `totalRefund` from the JSON.

---

## 5. Frontend implementation (in-depth)

**5.1 Dashboard — year selector and date derivation**

- **State**: Replace `range: { from, to }` with e.g. `selectedYear: number | null`. Optionally keep a derived `from`/`to` in state or compute when calling APIs.
- **Years dropdown**:
  - New query: `useYears()` (or similar) calling `GET /api/v1/analytics/years`. Query key e.g. `['analytics', 'years']`.
  - Dropdown options: `data?.data ?? []` (list of years). If empty, show message ("No data yet") and optionally default to current year.
  - **Default**: `selectedYear = years[0]` (first from API, i.e. most recent year) when data loads; if years list is empty, use `new Date().getFullYear()`.
- **Date range derivation**:  
  `from = \`${selectedYear}-01-01\``, `to = \`${selectedYear}-12-31\``. Use these in `useDashboard(from, to)` and in the monthly-expense query for the chart.

**5.2 Dashboard — per-currency summary and symbols**

- **Data**: Consume `totalExpenseByCurrency` and `totalRefundByCurrency` from dashboard response. Render one card/block per currency (or a compact list).
- **Formatting**: Use `Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode })` to get the correct symbol for the user’s locale (e.g. INR → ₹, USD → $). Helper e.g. `formatAmountWithCurrency(amount: number, currencyCode: string): string`. Use for summary cards; optionally reuse in chart tooltips.

**5.3 Dashboard — monthly trend chart**

- Reuse `GET /api/v1/analytics/monthly-expense?from=&to=` with the **same** `from`/`to` as the dashboard (derived from selected year).
- Add a section with recharts: `BarChart` with `data` from monthly-expense response, `XAxis` = month, `YAxis` = amount, `Bar` for totalExpense and totalRefund (same pattern as ChartsPage). Tooltip/axis formatter can use the same currency helper; if multiple currencies exist, pick one (e.g. first currency in dashboard totals) for chart axis/tooltip to avoid mixed units.

**5.4 Ledger — month selector and date derivation**

- **State**: Replace `dateFrom`/`dateTo` in the filter form with e.g. `selectedMonth: string` (format `YYYY-MM` or `''` for "no filter"). When applying filters, compute:
  - If `selectedMonth` is set: `dateFrom = \`${yyyy}-${mm}-01\``; `dateTo` = last day of that month (e.g. `new Date(year, month, 0)` then format as YYYY-MM-DD).
  - If not set (e.g. "All time"): `dateFrom` and `dateTo` undefined (don’t send to API).
- **UI**: Replace the two date inputs with a single control: either `<input type="month" value={selectedMonth} />` or separate year + month dropdowns. "Apply filters" sets `filtersApplied` from current form state (including derived `dateFrom`/`dateTo`). "Clear filters" clears month and date range.
- **Default**: e.g. `selectedMonth` = current month (`YYYY-MM`) so that on load the ledger shows the current month by default; applied filters use the derived first/last day of that month.

---

## 6. Currency symbol display (technical)

- **Recommendation**: Use `Intl.NumberFormat` with `style: 'currency'` and `currency: currencyCode` so that symbols and grouping follow the user’s locale and the correct ISO 4217 symbol is used (e.g. INR → ₹, USD → $). This avoids maintaining a manual map and supports more currencies.
- **Scope**: Dashboard summary cards (per currency); optional use in Dashboard chart and in Ledger row amount display for consistency.

---

## 7. Data flow

```
Dashboard:
  User selects year (from dropdown populated by GET /analytics/years)
    → from = year-01-01, to = year-12-31
    → GET /analytics/dashboard?from=&to=  → totalExpenseByCurrency, totalRefundByCurrency, entryCount, lastEntries
    → GET /analytics/monthly-expense?from=&to=  → data[] for BarChart
  UI: per-currency cards (with Intl currency format) + monthly trend chart + recent entries

Ledger:
  User selects month (e.g. YYYY-MM) and applies filters
    → dateFrom = first day of month, dateTo = last day of month
    → GET /ledger-entries?dateFrom=&dateTo=&...  (existing API)
  UI: single month selector; rest unchanged
```

---

## 8. Files affected

| Layer | File | Change |
|-------|------|--------|
| BE | `apps/api/app/services/analytics.py` | Add `get_totals_by_currency(from_date, to_date)`; add `get_years_with_data()`; extend `get_dashboard(from_date, to_date)` to include per-currency totals. |
| BE | `apps/api/app/routers/analytics.py` | Dashboard route: keep `from`/`to`; response with `totalExpenseByCurrency`, `totalRefundByCurrency`; add `GET /years` → `get_years_with_data`. |
| BE | `apps/api/app/schemas/` (if dashboard response is modeled) | Add or update schema for per-currency arrays. |
| FE | `apps/web/src/pages/DashboardPage.tsx` | Year dropdown (data from years API); default latest year; derive from/to; per-currency summary cards with currency formatting; monthly trend chart (recharts, same from/to). |
| FE | `apps/web/src/pages/LedgerPage.tsx` | Month selector (e.g. `type="month"`); derive dateFrom/dateTo on apply; default current month; remove from/to date inputs. |
| Tests | Backend analytics + dashboard; FE Dashboard and Ledger tests | New tests for years endpoint, per-currency dashboard response; update tests for year/month selectors and derived ranges. |

---

## 9. Optional: months with data (Ledger)

If the Ledger month selector should list only months that have at least one entry: add `GET /api/v1/analytics/months` returning e.g. `{ "data": ["YYYY-MM", ...] }` (distinct year-month from non-deleted entries, ordered desc). Frontend would populate a dropdown from this and default to the first (most recent). If not implemented, the month selector can be a free choice (e.g. `type="month"`) with default current month and "No entries" when empty.
