# AIdLC Documentation

**Documentation-only.** Application code stays in `backend/` and `frontend/`.

## Active convention

All iteration artifacts belong under:

```text
artifacts/iteration/{unix-timestamp}-{micro-description}/
```

Example: `artifacts/iteration/1783016581-code-quality-security-hardening/`

## Latest completed iteration

**[1783016581-code-quality-security-hardening](../artifacts/iteration/1783016581-code-quality-security-hardening/)**

Contains: `inception/`, `construction/`, `audit.md`, `aidlc-state.md`

## Starting a new iteration

1. Create folder: `artifacts/iteration/$(date +%s)-your-short-name/`
2. Add `aidlc-state.md`, `audit.md`, and phase subfolders per `.cursor/rules/iteration-artifacts.mdc`
3. Do **not** write new artifacts in this `aidlc-docs/` root — use the iteration folder
