# Skylight MCP Server

An MCP (Model Context Protocol) server for the Skylight Calendar API. Enables AI assistants like Claude to interact with your Skylight family calendar, chores, lists, and more.

## Features

- **Calendar**: Query calendar events ("What's on my calendar today?")
- **Chores**: View and create chores ("Add emptying dishwasher to chores")
- **Lists**: View grocery and to-do lists ("What's on the grocery list?")
- **Tasks**: Add items to the task box ("Add XYZ to my task list")
- **Family**: View family members and devices
- **Rewards**: Check reward points and available rewards

## Quick Start

### Installation

#### Option 1: npm package (Recommended)

**mcp.json:**
```json
{
  "mcpServers": {
    "skylight": {
      "command": "npx",
      "args": ["@eaglebyte/skylight-mcp"],
      "env": {
        "SKYLIGHT_EMAIL": "your_email@example.com",
        "SKYLIGHT_PASSWORD": "your_password",
        "SKYLIGHT_FRAME_ID": "your_frame_id"
      }
    }
  }
}
```

**Claude Code:**
```bash
claude mcp add skylight npx @eaglebyte/skylight-mcp \
  -e SKYLIGHT_EMAIL=your_email@example.com \
  -e SKYLIGHT_PASSWORD=your_password \
  -e SKYLIGHT_FRAME_ID=your_frame_id
```

#### Option 2: From source

```bash
git clone https://github.com/TheEagleByte/skylight-mcp.git
cd skylight-mcp && npm install && npm run build
```

Then use in mcp.json:
```json
{
  "mcpServers": {
    "skylight": {
      "command": "node",
      "args": ["/path/to/skylight-mcp/dist/index.js"],
      "env": {
        "SKYLIGHT_EMAIL": "your_email@example.com",
        "SKYLIGHT_PASSWORD": "your_password",
        "SKYLIGHT_FRAME_ID": "your_frame_id"
      }
    }
  }
}
```

### Instructions for AI

Copy this into your AI's custom instructions or system prompt:

> You have access to the Skylight MCP server. Skylight is a smart family calendar display that shows calendars, chores, grocery lists, meals, and rewards. Use the Skylight tools to help manage family schedules and organization.
>
> Tips:
> - Call `get_family_members` before assigning chores to get member names
> - Grocery items default to the main grocery list if no list specified
> - Dates accept "today", "tomorrow", day names, or YYYY-MM-DD format
> - Some tools (rewards, meals, photos) require Skylight Plus subscription

## Prerequisites

- Node.js 18+
- A Skylight account with an active subscription
- Your Skylight Frame ID (see [Finding your Frame ID](#finding-your-frame-id))

## Authentication

The MCP server supports two authentication methods:

### Option 1: Email/Password (Recommended)

Use your Skylight account credentials. The server will automatically log in and manage tokens.

```env
SKYLIGHT_EMAIL=your_email@example.com
SKYLIGHT_PASSWORD=your_password
SKYLIGHT_FRAME_ID=your_frame_id
```

### Option 2: Manual Token (Legacy)

Capture a token from the Skylight app using a proxy tool.

```env
SKYLIGHT_TOKEN=your_token_here
SKYLIGHT_FRAME_ID=your_frame_id
SKYLIGHT_AUTH_TYPE=bearer
```

### Finding your Frame ID

You still need to find your frame ID (the household identifier):

1. Use a proxy tool ([Proxyman](https://proxyman.io/), [Charles](https://www.charlesproxy.com/), or [mitmproxy](https://mitmproxy.org/))
2. Capture any API request from the Skylight app
3. Look at the URL path: `/api/frames/{frameId}/...`
4. Example: `/api/frames/abc123/chores` → frame ID is `abc123`

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `SKYLIGHT_EMAIL` | Option 1 | Your Skylight account email |
| `SKYLIGHT_PASSWORD` | Option 1 | Your Skylight account password |
| `SKYLIGHT_TOKEN` | Option 2 | Your API token (if not using email/password) |
| `SKYLIGHT_AUTH_TYPE` | No | `bearer` (default) or `basic` (for manual token) |
| `SKYLIGHT_FRAME_ID` | Yes | Your household frame ID |
| `SKYLIGHT_TIMEZONE` | No | Default timezone (default: `America/New_York`) |

### Example .env file:

```env
# Email/password auth (recommended)
SKYLIGHT_EMAIL=your_email@example.com
SKYLIGHT_PASSWORD=your_password
SKYLIGHT_FRAME_ID=your_frame_id
SKYLIGHT_TIMEZONE=America/New_York
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

## API Documentation

This MCP server is built on top of the reverse-engineered Skylight API. The API endpoints were documented using the [skylight-api](https://github.com/TheEagleByte/skylight-api) project, which converts browser network traffic (HAR files) into an OpenAPI specification.

**API Resources:**
- [Interactive API Docs (Swagger UI)](https://theeaglebyte.github.io/skylight-api/swagger.html)
- [API Reference (ReDoc)](https://theeaglebyte.github.io/skylight-api/redoc.html)
- [OpenAPI Specification](https://theeaglebyte.github.io/skylight-api/openapi/openapi.yaml)

If you discover new API endpoints or find issues with the current documentation, please contribute to the [skylight-api](https://github.com/TheEagleByte/skylight-api) repository.

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository** and create a feature branch
2. **Make your changes** with clear, descriptive commits
3. **Run tests** (`npm test`) and linting (`npm run lint`) before submitting
4. **Open a pull request** with a description of your changes

### Development Setup

```bash
git clone https://github.com/TheEagleByte/skylight-mcp.git
cd skylight-mcp
npm install
npm run dev  # Start with hot reload
```

### Areas for Contribution

- Adding support for new Skylight API endpoints
- Improving error handling and edge cases
- Enhancing documentation
- Writing additional tests

## Issues & Support

- **Bug reports**: [Open an issue](https://github.com/TheEagleByte/skylight-mcp/issues/new) with steps to reproduce
- **Feature requests**: [Open an issue](https://github.com/TheEagleByte/skylight-mcp/issues/new) describing the use case
- **Questions**: [Start a discussion](https://github.com/TheEagleByte/skylight-mcp/discussions) or open an issue

Please include relevant details like your Node.js version, error messages, and configuration (with sensitive values redacted).

## License

MIT

## Disclaimer

This is an unofficial integration. The Skylight API is reverse-engineered and may change without notice. Use at your own risk.
