# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

MCP server enabling AI assistants to interact with the Skylight family calendar API (calendar, chores, lists, tasks, rewards, meals, photos).

Base API URL: `https://app.ourskylight.com`

## Commands

```bash
npm install
npm run build          # Compile TypeScript
npm run dev            # Development with hot reload (tsx watch)
npm test               # Run vitest tests
npm test -- dates      # Run single test file (matches filename)
npm run test:coverage  # Tests with coverage
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run generate:types # Generate TypeScript types from OpenAPI spec
```

## Architecture

**Two-tier tool system**:
1. `api/endpoints/*.ts` (11 modules) - Low-level HTTP wrappers for each API resource
2. `tools/*.ts` (9 modules) - MCP tool definitions with Zod parameter validation

**Tool Registration**: Each domain exports `registerXxxTools(server)` called from `server.ts`. Plus-only tools are conditionally registered based on subscription status.

**Key files**:
- `config.ts` - Zod-validated env config supporting two auth methods
- `api/client.ts` - HTTP client with Bearer/Basic auth, auto-login, subscription status tracking
- `api/auth.ts` - Browser-style OAuth login flow for email/password authentication
- `api/generated-types.ts` - Auto-generated types from OpenAPI spec
- `utils/dates.ts` - Parses "today", "tomorrow", day names, YYYY-MM-DD

## Authentication

Two methods supported (validated via Zod refinement in `config.ts`):

1. **Email/Password** (recommended): Set `SKYLIGHT_EMAIL` and `SKYLIGHT_PASSWORD`. Server reproduces the Skylight web OAuth flow (`/oauth/authorize` -> login form -> `/auth/session` -> `/oauth/token`) and then uses the returned bearer token for API requests.
2. **Manual Token**: Set `SKYLIGHT_TOKEN` and optionally `SKYLIGHT_AUTH_TYPE` (bearer/basic).

Both require `SKYLIGHT_FRAME_ID` (household identifier from API URLs like `/api/frames/{frameId}/chores`).

**Note**: Email/password auth now resolves to a bearer token. Manual token auth still supports either `bearer` or `basic`.

## Plus Subscription

Some features require a Skylight Plus subscription. The server detects subscription status from the login response (`subscription_status: "plus"`). Plus-only tools are not registered for non-Plus users.

**Plus-only domains**: Rewards, Meals, Photos. Subscription status is inferred after login from live API access.

## MCP Tools (35+ total)

### Base Tools (Always Available)

| Category | Tools |
|----------|-------|
| Calendar | `get_calendar_events`, `get_source_calendars`, `create_calendar_event`, `update_calendar_event`, `delete_calendar_event` |
| Chores | `get_chores`, `create_chore`, `update_chore`, `delete_chore` |
| Lists | `get_lists`, `get_list_items`, `create_list`, `update_list`, `delete_list`, `create_list_item`, `update_list_item`, `delete_list_item` |
| Tasks | `create_task` |
| Family | `get_family_members`, `get_frame_info`, `get_devices` |
| Misc | `get_avatars`, `get_colors` |

### Plus-Only Tools

| Category | Tools |
|----------|-------|
| Rewards | `get_rewards`, `get_reward_points`, `create_reward`, `update_reward`, `delete_reward`, `redeem_reward`, `unredeem_reward` |
| Meals | `get_meal_categories`, `get_recipes`, `get_recipe`, `create_recipe`, `update_recipe`, `delete_recipe`, `add_recipe_to_grocery_list`, `get_meal_sittings`, `create_meal_sitting` |
| Photos | `get_albums` |

## Technical Details

- **Runtime**: Node.js 18+
- **Module System**: ESM (`"type": "module"`)
- **TypeScript**: ES2022 target, NodeNext module resolution, strict mode
- **API Format**: JSON:API patterns (type, id, attributes, relationships)
- **Timezone**: Defaults to America/New_York, configurable via `SKYLIGHT_TIMEZONE`
- **Type Generation**: Uses `openapi-typescript` to generate types from `skylight-api` OpenAPI spec

## Versioning & Releases

**Release Process**:
1. Update version in `package.json`
2. Update `CHANGELOG.md` with changes
3. Commit changes and merge to main
4. Create and push a tag with `v` prefix: `git tag v1.2.3 && git push origin v1.2.3`

**Important**: Tags must start with `v` (e.g., `v1.1.7`) to trigger the release workflow. Tags without the `v` prefix (e.g., `1.1.7`) will not trigger a release.

The release workflow (`.github/workflows/release.yml`) will:
- Run linting, type checking, and tests
- Build the package
- Publish to npm with provenance
- Create a GitHub release with auto-generated changelog

## API Quirks

- **Calendar date_max is exclusive**: When querying calendar events, `date_max` is treated as exclusive. The code adds 1 day to include events on the end date.
- **Auth format**: Managed email/password auth now uses OAuth and bearer tokens. Manual token auth may still use bearer or basic depending on the captured token.
