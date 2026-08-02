# Logto Provisioning Scripts

**Status**: Scaffold only — execution requires M2M credentials (Unit 4)

## Purpose

Optional automation to create organizations, roles, and invites via [Logto Management API](https://docs.logto.io/docs/recipes/manage-users-and-organizations/).

## Prerequisites

- `LOGTO_ENDPOINT`
- `LOGTO_M2M_APP_ID`
- `LOGTO_M2M_APP_SECRET`
- M2M app granted access to Logto Management API in Console

## Planned scripts (Unit 4)

| Script | Action |
|--------|--------|
| `provision-org.sh` | Create Logto org + link to HMS `org_hospitals.logto_org_id` |
| `invite-org-admin.sh` | Invite user with `org-admin` role |
| `assign-module-role.sh` | Assign `pharmacy-manager` or `beds-manager` to user |

## Manual alternative

Use `construction/unit-logto-tenant-config/logto-console-setup-checklist.md` until M2M credentials are configured.

## Security

- Never commit M2M app secret
- Run scripts only from CI or local `.env.local`
- Use separate M2M apps for dev/staging/prod tenants
