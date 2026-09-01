# StrainEase citation JSON contract

**Status:** Active from PR #3 — Reddit Pool Refresh & Citation Layer

AI responses that contain patient-facing prose may include a top-level
`citations` array. It is optional for backwards compatibility: an empty or
unavailable source list is represented by omitting the field, not by inventing
an entry.

```json
{
  "citations": [
    {
      "id": "stable-source-id",
      "source": "https://example.org/source",
      "label": "Short source title",
      "kind": "pubmed"
    }
  ]
}
```

## Field rules

- `id` is a short, stable identifier within the response. It is the value that
  a later evidence ledger may use as `citationId`.
- `source` is the exact HTTP(S) URL supplied to the model. It is not a free-form
  claim, PMID, or URL generated from memory.
- `label` is a concise, human-readable source title.
- `kind` is closed to: `pubmed`, `review`, `nor.org`, `leafly`, `weedmaps`,
  `allbud`, or `reddit`.
- The server drops malformed citation objects, unsupported kinds, non-HTTP(S)
  sources, and duplicate `(id, source)` pairs. It never repairs a citation by
  guessing a source.
- `reddit` citations must point to a thread from the vetted Reddit pool. Reddit
  URLs are normalized to the canonical `old.reddit.com` form.
- A citation supports auditability; it does not turn anecdotal Reddit content
  into clinical evidence. The AI must distinguish community context from
  medical literature and keep the application's no-diagnosis/no-prescription-
  changes guardrails.

## Current response surfaces

PR #3 adds the field to:

- `compareStrains` → `analysis.citations`
- `recommendStrainsForConditions` → `citations`
- `describeStrainForUser` → `citations` (optional, when returned by the model)

Older clients may ignore this additive field. PR #7's evidence ledger will
resolve its `citationId` values against this array and drop unresolved claims.
