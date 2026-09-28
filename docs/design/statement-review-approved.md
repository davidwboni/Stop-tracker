# Statement Review — approved and implemented 27 September 2026

User approved the Review mockup and requested as much progress as possible. Implementation: StatementReview, reviewModel, CheckPay integration, and expanded server extraction schema.

## Behavior
An uploaded statement enters a distinct Review screen with no expected-value/discrepancy headline. Extraction maps fields only. Amounts, period, currency and explicit VAT treatment are editable. All extracted charge items require review; no fabricated certainty score or page location. A clickable issue summary focuses the first unresolved field. Missing optional totals remain blank, never invented zero. Code calculates integer-penny checks of earnings minus fee and charges, and of itemized charge totals. Inconsistent totals block progression until corrected or incomplete optional subtotals are cleared. Payout-only review remains possible.

Current supported comparison currency GBP; VAT excluded or not applicable, with user confirmation that saved work rates have the same basis. Unknown, included VAT, and foreign currency cannot proceed without correction. Full VAT conversion is not implemented. A selected record period can change locally without changing the driver's pay-period setup. Confirmed statement dates must match it.

The original file remains in memory for source checking. Browser object URLs are revoked when preview unmounts. File is cleared on discard, confirmed save or unmount. Source preview is full-document only: there are no fabricated per-field page references. Corrections and back navigation do not rerun AI. Reopened confirmed reviews have structured fields but no retained original; user is told to consult their own copy.

Continue to comparison creates an unsaved preview. Confirm and save is separate. Confirmed normalized review stores penny amounts, dates, currency, VAT basis and reviewed charge items under the owner-scoped period record. It does not create expenses, import receipt files, or enable recurring costs. This deliberately prevents automatic double counting. Changing record data invalidates the comparison preview before save. Saving records Checked, never automatic Reconciled or payment received.

## UI and platform
Dark/light shared tokens, large labelled fields, native date controls, 44px+ actions, 16px base inputs, explicit issue text, semantic disclosures, focusable issue summary, aria-live validation. Sticky action above existing navigation respects safe areas. Desktop offers source preview next to fields. Mobile source opens on demand, PDF has an external-view fallback. Reduced motion uses existing theme rules. The same unsaved-draft router and reload guards apply.

## Analytics/privacy
Consent-only review opened, correction, validation failure, reviewed and compared events. No values, filenames, documents, provider text, contractor identifiers or replay. Server allowlists generic charge labels and strips unsolicited fields. Source files never enter permanent Stop Tracker storage. AI processing requires deployment/provider verification.

## Verification and limits
Unit/component tests cover integer arithmetic, mismatches, payout-only review, review reset on correction, transient URL cleanup, no automatic save, confirmed field persistence and reopening without AI. Real-device native/Safari PDF display and keyboard behavior remain release checks. Direct CSV/XLSX and per-field source-page extraction remain future adapters. Detailed comparison-result visual design is the next proposal.
