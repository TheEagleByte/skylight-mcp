# Skylight MCP Server

An MCP (Model Context Protocol) server for the Skylight Calendar API. Enables AI assistants like Claude to interact with your Skylight family calendar, chores, lists, and more.

## Features

- **Calendar**: Query calendar events ("What's on my calendar today?")
- **Chores**: View and create chores ("Add emptying dishwasher to chores")
- **Lists**: View grocery and to-do lists ("What's on the grocery list?")
- **Tasks**: Add items to the task box ("Add XYZ to my task list")
- **Family**: View family members and devices
- **Rewards**: Check reward points and available rewards

## Prerequisites

- Node.js 18+
- A Skylight account with an active subscription
- Your Skylight API token (see [Authentication](#authentication))

## Installation

```bash
git clone https://github.com/yourrepo/skylight-mcp.git
cd skylight-mcp
npm install
npm run build
```

## Authentication

The Skylight API requires a token that must be captured from the mobile app. There is no username/password login endpoint.

### How to get your token:

1. Install a proxy tool (Proxyman, Charles Proxy, or mitmproxy)
2. Configure it to intercept HTTPS traffic
3. Open the Skylight mobile app and log in
4. Find any API request to `app.ourskylight.com`
5. Copy the `Authorization` header value
6. Extract the frame ID from the URL (e.g., `/api/frames/{frameId}/chores`)

See the [skylight-api auth guide](../skylight-api/docs/auth.md) for detailed instructions.

## Configuration

Set the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `SKYLIGHT_TOKEN` | Yes | Your API token (Bearer or Basic) |
| `SKYLIGHT_FRAME_ID` | Yes | Your household frame ID |
| `SKYLIGHT_AUTH_TYPE` | No | `bearer` (default) or `basic` |
| `SKYLIGHT_TIMEZONE` | No | Default timezone (default: `America/New_York`) |

### Example .env file:

```env
SKYLIGHT_TOKEN=your_token_here
SKYLIGHT_FRAME_ID=your_frame_id_here
SKYLIGHT_AUTH_TYPE=bearer
SKYLIGHT_TIMEZONE=America/New_York
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "skylight": {
      "command": "node",
      "args": ["/path/to/skylight-mcp/dist/index.js"],
      "env": {
        "SKYLIGHT_TOKEN": "your_token",
        "SKYLIGHT_FRAME_ID": "your_frame_id"
      }
    }
  }
}
```

## Available Tools

### Calendar Tools

| Tool | Description |
|------|-------------|
| `get_calendar_events` | Get calendar events for a date range |
| `get_source_calendars` | List connected calendar sources (Google, iCloud, etc.) |

### Chore Tools

| Tool | Description |
|------|-------------|
| `get_chores` | Get chores with optional filters (date, assignee, status) |
| `create_chore` | Create a new chore with optional recurrence |

### List Tools

| Tool | Description |
|------|-------------|
| `get_lists` | Get all available lists |
| `get_list_items` | Get items from a specific list |

### Task Tools

| Tool | Description |
|------|-------------|
| `create_task` | Add a task to the task box |

### Family Tools

| Tool | Description |
|------|-------------|
| `get_family_members` | Get family member profiles |
| `get_frame_info` | Get household/frame information |
| `get_devices` | List Skylight devices |

### Reward Tools

| Tool | Description |
|------|-------------|
| `get_rewards` | Get available rewards |
| `get_reward_points` | Get reward points balance |

## Example Queries

Once configured, you can ask Claude things like:

- "What's on my calendar today?"
- "What chores do I need to do this week?"
- "Add 'take out trash' to my chores for tomorrow"
- "What's on the grocery list?"
- "Add milk to my task list"
- "Who are the family members on Skylight?"
- "How many reward points does each person have?"

## Development

```bash
# Run in development mode (with hot reload)
npm run dev

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

## Known Limitations

The following features are not yet available in the reverse-engineered API:

- Creating calendar events
- Adding items to lists
- Meal plans

These limitations are due to the endpoints not being documented in the community API reference.

## License

MIT

## Disclaimer

This is an unofficial integration. The Skylight API is reverse-engineered and may change without notice. Use at your own risk.
