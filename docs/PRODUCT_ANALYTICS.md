# Product Analytics Plan

## Goal

Measure whether Stop Tracker solves a real recurring problem for delivery drivers without collecting sensitive financial or route data.

## Privacy rules

Analytics events may include:
- screen or feature name
- pay model ID (for example `tiered_stops` or `sliding_scale`)
- whether onboarding completed
- whether an entry was created via the full form or quick entry
- whether an invoice check found a discrepancy
- number of compared days
- guest/free account type

Analytics events must never include:
- earnings or invoice amounts
- pay rates
- invoice contents
- notes
- delivery addresses or GPS data
- name or email
- AI prompt text
- uploaded rate-sheet contents

Analytics is consent-gated in the app. If the user declines, product events are not sent.

## Core events

| Event | Purpose |
|---|---|
| `page_view` | Understand which parts of the product are used |
| `pay_setup_started` | Onboarding funnel start |
| `ai_pay_setup_started` | AI setup adoption |
| `ai_pay_setup_interpreted` | AI setup reached a proposed config |
| `ai_pay_setup_confirmed` | User accepted the interpreted config |
| `ai_pay_setup_rejected` | User rejected the interpretation |
| `ai_pay_setup_failed` | AI setup failed |
| `pay_setup_completed` | Activation milestone |
| `daily_entry_created` | Core habit / work logging |
| `daily_entry_undone` | Entry correction signal |
| `invoice_tab_viewed` | Invoice feature adoption |
| `invoice_check_started` | Core pay-verification intent |
| `invoice_check_result` | Core value event; records match vs discrepancy only |

## Validation metrics

### Activation
A user is activated when they:
1. complete pay setup, and
2. create a daily entry.

### Retention
Measure the percentage of activated users who create another daily entry on:
- day 2
- day 7
- day 14
- day 30

### Core-value conversion
Measure:
- percentage of activated users who start an invoice check
- percentage who complete an invoice check
- percentage of checks that identify a discrepancy

Do not optimize for raw page views. The strongest product signal is a driver repeatedly logging real work and later using those records to verify pay.

## Suggested beta funnel

1. Sign in / guest start
2. Pay setup started
3. Pay setup completed
4. First daily entry
5. Five or more workdays logged
6. Invoice check started
7. Invoice check completed
8. Match or discrepancy found

## Beta decision framework

After a 20-30 driver beta across at least one full pay period, review:
- onboarding completion rate
- first-entry activation rate
- workday logging retention
- invoice-check adoption
- discrepancy-detection rate
- qualitative feedback from drivers who did and did not retain

Feature development should follow observed drop-offs and repeated usage, not feature-request volume alone.

<!-- preview refresh: beta foundation review -->
