# Connect Claude Code to tools via MCP

> Learn how to connect Claude Code to your tools with the Model Context Protocol.

## Overview

Claude Code integrates with hundreds of external tools through the Model Context Protocol (MCP), an open standard for AI-tool integrations. MCP servers enable access to tools, databases, and APIs.

## Capabilities with MCP Servers

Users can leverage MCP-connected Claude Code to:

- **Extract from issue trackers**: "Add the feature described in JIRA issue ENG-4521 and create a PR on GitHub."
- **Monitor systems**: "Check Sentry and Statsig to check the usage of the feature described in ENG-4521."
- **Query databases**: "Find emails of 10 random users who used feature ENG-4521, based on our PostgreSQL database."
- **Integrate designs**: "Update our standard email template based on the new Figma designs that were posted in Slack"
- **Automate workflows**: "Create Gmail drafts inviting these 10 users to a feedback session about the new feature."
- **React to events**: MCP servers can act as channels that push messages into sessions, enabling Claude to respond to Telegram, Discord, or webhook events asynchronously.

## Popular MCP Server Integrations

### Design & Content Tools

**Canva** - Search, create, autofill, and export designs
```
claude mcp add --transport http canva https://mcp.canva.com/mcp
```

**Figma** - Generate diagrams and code from design context
```
claude mcp add --transport http figma-remote-mcp https://mcp.figma.com/mcp
```

**Gamma** - Create presentations, docs, socials, and sites
```
claude mcp add --transport http gamma https://mcp.gamma.app/mcp
```

**Webflow** - Manage CMS, pages, assets and sites
```
claude mcp add --transport http webflow https://mcp.webflow.com/mcp
```

**Wix** - Manage and build sites and apps
```
claude mcp add --transport http wix https://mcp.wix.com/mcp
```

### Productivity & Collaboration

**Notion** - Search, update, and power workflows
```
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

**Slack** - Send messages, create canvases, fetch data
```
claude mcp add slack --transport http https://mcp.slack.com/mcp
```

**Asana** - Coordinate tasks, projects, and goals
```
claude mcp add --transport streamable-http asana https://mcp.asana.com/v2/mcp
```

**Linear** - Manage issues, projects & team workflows
```
claude mcp add --transport http linear https://mcp.linear.app/mcp
```

**Monday.com** - Manage projects, boards, and workflows
```
claude mcp add --transport http monday https://mcp.monday.com/mcp
```

**ClickUp** - Project management & collaboration for teams
```
claude mcp add --transport http clickup https://mcp.clickup.com/mcp
```

**Granola** - AI notepad for meetings
```
claude mcp add --transport http granola https://mcp.granola.ai/mcp
```

**Mem** - AI notebook for everything on your mind
```
claude mcp add --transport http mem https://mcp.mem.ai/mcp
```

**Craft** - Notes & second brain
```
claude mcp add --transport http craft https://mcp.craft.do/my/mcp
```

**Guru** - Search and interact with company knowledge
```
claude mcp add guru --transport http https://mcp.api.getguru.com/mcp
```

**Circleback** - Search and access context from meetings
```
claude mcp add circleback --transport http https://app.circleback.ai/api/mcp
```

### Development & DevOps

**GitHub** - Code reviews and repository management
```
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
```

**Atlassian** - Access Jira & Confluence
```
claude mcp add --transport http atlassian https://mcp.atlassian.com/v1/mcp
```

**Sentry** - Search, query, and debug errors
```
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
```

**Vercel** - Analyze, debug, and manage projects and deployments
```
claude mcp add --transport http vercel https://mcp.vercel.com
```

**Netlify** - Create, deploy, manage, and secure websites
```
claude mcp add --transport http netlify https://netlify-mcp.netlify.app/mcp
```

**Cloudflare** - Build applications with compute, storage, and AI
```
claude mcp add --transport http cloudflare https://bindings.mcp.cloudflare.com/mcp
```

**Postman** - Give API context to coding agents
```
claude mcp add --transport http postman https://mcp.postman.com/minimal
```

**Context7** - Up-to-date docs for LLMs and AI code editors
```
claude mcp add --transport http context7 https://mcp.context7.com/mcp
```

**Microsoft Learn** - Search trusted Microsoft docs
```
claude mcp add --transport http microsoft-learn https://learn.microsoft.com/api/mcp
```

**Apollo GraphQL** - Search Apollo docs, specs, and best practices
```
claude mcp add --transport http graphos-tools https://mcp.apollographql.com
```

### Data & Analytics

**Supabase** - Manage databases, authentication, and storage
```
claude mcp add --transport http supabase https://mcp.supabase.com/mcp
```

**PlanetScale** - Authenticated access to Postgres and MySQL DBs
```
claude mcp add --transport http planetscale https://mcp.pscale.dev/mcp/planetscale
```

**BigQuery** - Advanced analytical insights for agents
```
claude mcp add --transport http bigquery https://bigquery.googleapis.com/mcp
```

**PostHog** - Query, analyze, and manage insights
```
claude mcp add --transport http posthog https://mcp.posthog.com/mcp
```

**Mixpanel** - Analyze, query, and manage data
```
claude mcp add --transport http mixpanel https://mcp.mixpanel.com/mcp
```

**Amplitude** - Search, access, and get insights
```
claude mcp add --transport http amplitude https://mcp.amplitude.com/mcp
```

**Honeycomb** - Query and explore observability data and SLOs
```
claude mcp add --transport http honeycomb https://mcp.honeycomb.io/mcp
```

**SimilarWeb** - Real time web, mobile app, and market data
```
claude mcp add --transport http similarweb https://mcp.similarweb.com
```

**MotherDuck** - Get answers from your data
```
claude mcp add motherduck --transport http https://api.motherduck.com/mcp
```

**Omni Analytics** - Query data using natural language
```
claude mcp add --transport http omni-analytics https://callbacks.omniapp.co/callback/mcp
```

**Coupler** - Access business data from hundreds of sources
```
claude mcp add --transport http coupler https://mcp.coupler.io/mcp
```

**Snowflake** - Retrieve structured and unstructured data (requires user-specific URL)

**Starburst** - Securely retrieve data from federated sources (requires user-specific URL)

### CRM & Sales

**HubSpot** - CRM integration
```
claude mcp add --transport http hubspot https://mcp.hubspot.com/anthropic
```

**Intercom** - Access data for customer insights
```
claude mcp add --transport http intercom https://mcp.intercom.com/mcp
```

**ZoomInfo** - Enrich contacts & accounts with GTM intelligence
```
claude mcp add --transport http zoominfo https://mcp.zoominfo.com/mcp
```

**Attio** - Search, manage, and update CRM
```
claude mcp add --transport http attio https://mcp.attio.com/mcp
```

**Clarify** - Query CRM, create records, ask anything
```
claude mcp add --transport http clarify https://api.clarify.ai/mcp
```

**Clay** - Find prospects, research accounts, personalize outreach
```
claude mcp add --transport http clay https://api.clay.com/v3/mcp
```

**Day AI (CRMx)** - Know everything about prospects & customers
```
claude mcp add day-ai --transport http https://day.ai/api/mcp
```

**Harmonic** - Discover, research, and enrich companies and people
```
claude mcp add harmonic --transport http https://mcp.api.harmonic.ai
```

**Sprouts** - From query to qualified lead in seconds
```
claude mcp add --transport http sprouts https://sprouts-mcp-server.kartikay-dhar.workers.dev
```

**Outreach** - Unleash your team's best performance
```
claude mcp add --transport http outreach https://api.outreach.io/mcp/
```

**Metaview** - The AI platform for recruiting
```
claude mcp add --transport http metaview https://mcp.metaview.ai/mcp
```

**Pendo** - Connect for product and user insights (requires user-specific URL)

**ActiveCampaign** - Autonomous marketing (requires user-specific URL)

**Customer.io** - Explore customer data and generate insights (requires user-specific URL)

**DevRev** - Search and update company knowledge graph
```
claude mcp add devrev --transport http https://api.devrev.ai/mcp/v1
```

**Visier** - Find people, productivity and business impact insights (requires user-specific URL)

### Financial & Payment

**Stripe** - Payment processing and financial infrastructure
```
claude mcp add --transport http stripe https://mcp.stripe.com
```

**PayPal** - Access payments platform
```
claude mcp add --transport http paypal https://mcp.paypal.com/mcp
```

**Square** - Search and manage transaction, merchant, and payment data
```
claude mcp add --transport sse square https://mcp.squareup.com/sse
```

**Ramp** - Search, access, and analyze financial data
```
claude mcp add --transport http ramp https://ramp-mcp-remote.ramp.com/mcp
```

**Mercury** - Search, analyze and understand finances
```
claude mcp add mercury --transport http https://mcp.mercury.com/mcp
```

**Quartr** - The intelligence layer financial AI runs on
```
claude mcp add --transport http quartr https://mcp.quartr.com/mcp
```

**Clarity AI** - Simulate fund classifications under proposed SFDR 2.0
```
claude mcp add --transport http clarity-ai https://clarity-sfdr20-mcp.pro.clarity.ai/mcp
```

**Klaviyo** - Report, strategize & create with real-time data
```
claude mcp add --transport http klaviyo https://mcp.klaviyo.com/mcp?include-mcp-app=true
```

**Ahrefs** - SEO & AI search analytics
```
claude mcp add ahrefs --transport http https://api.ahrefs.com/mcp/mcp
```

**Windsor AI** - Connect 325+ marketing, analytics and CRM sources
```
claude mcp add windsor-ai --transport http https://mcp.windsor.ai
```

**MT Newswire** - Trusted real-time global financial news
```
claude mcp add --transport http mtnewswire
```

### Content & Marketing

**Sanity** - Create, query, and manage structured content
```
claude mcp add --transport http sanity https://mcp.sanity.io
```

**WordPress.com** - Secure AI access to manage sites
```
claude mcp add wordpress-com --transport http https://public-api.wordpress.com/wpcom/v2/mcp/v1
```

**MailerLite** - Turn Claude into email marketing assistant
```
claude mcp add --transport http mailerlite https://mcp.mailerlite.com/mcp
```

**AirOps** - Craft content that wins AI search
```
claude mcp add airops --transport http https://app.airops.com/mcp
```

**Magic Patterns** - Discuss and iterate on designs
```
claude mcp add --transport http magic-patterns https://mcp.magicpatterns.com/mcp
```

**Airwallex** - Integrate with the Airwallex Platform
```
claude mcp add --transport http airwallex-developer https://mcp-demo.airwallex.com/developer
```

### Cloud & Infrastructure

**Box** - Search, access and get insights on content
```
claude mcp add box --transport http https://mcp.box.com
```

**Egnyte** - Securely access and analyze content
```
claude mcp add --transport http egnyte https://mcp-server.egnyte.com/mcp
```

**Cloudinary** - Manage, transform and deliver images & videos
```
claude mcp add --transport http cloudinary https://asset-management.mcp.cloudinary.com/sse
```

**Databricks** - Managed MCP servers with Unity Catalog (requires user-specific URL)

### Travel & Events

**Trivago** - Find ideal hotels at best prices
```
claude mcp add --transport http trivago https://mcp.trivago.com/mcp
```

**Wyndham Hotels** - Discover the right hotel faster
```
claude mcp add --transport http wyndham-hotels https://mcp.wyndhamhotels.com/claude/mcp
```

**LastMinute.com** - Search, compare and book flights and hotels
```
claude mcp add lastminute-com --transport http https://mcp.lastminute.com/mcp
```

**Fever Event Discovery** - Discover live entertainment events worldwide
```
claude mcp add --transport http fever-event-discovery https://data-search.apigw.feverup.com/mcp
```

**TicketTailor** - Event platform for managing tickets, orders & more
```
claude mcp add --transport http tickettailor https://mcp.tickettailor.ai/mcp
```

### Healthcare & Science

**PubMed** - Search biomedical literature
```
claude mcp add pubmed --transport http https://pubmed.mcp.claude.com/mcp
```

**BioRxiv** - Access bioRxiv and medRxiv preprint data
```
claude mcp add biorxiv --transport http https://mcp.deepsense.ai/biorxiv/mcp
```

**ClinicalTrials.gov** - Access ClinicalTrials.gov data
```
claude mcp add clinical-trials --transport http https://mcp.deepsense.ai/clinical_trials/mcp
```

**ChEMBL** - Access the ChEMBL Database
```
claude mcp add chembl --transport http https://mcp.deepsense.ai/chembl/mcp
```

**Open Targets** - Drug target discovery and prioritisation
```
claude mcp add --transport http open-targets https://mcp.platform.opentargets.org/mcp
```

**BioRender** - Search for and use scientific templates and icons
```
claude mcp add biorender --transport http https://mcp.services.biorender.com/mcp
```

**Owkin** - Interact with AI agents built for biology
```
claude mcp add owkin --transport http https://mcp.k.owkin.com/mcp
```

**Medidata** - Clinical trial software and site ranking tools
```
claude mcp add medidata --transport http https://mcp.imedidata.com/mcp
```

**Synapse.org** - Search and metadata tools for scientific data
```
claude mcp add synapse-org --transport http https://mcp.synapse.org/mcp
```

**Scholar Gateway** - Enhance responses with scholarly research and citations
```
claude mcp add scholar-gateway --transport http https://connector.scholargateway.ai/mcp
```

**Consensus** - Explore scientific research
```
claude mcp add --transport http consensus https://mcp.consensus.app/mcp
```

**NPI Registry** - Access US National Provider Identifier Registry
```
claude mcp add npi-registry --transport http https://mcp.deepsense.ai/npi_registry/mcp
```

**ICD-10 Codes** - Access ICD-10-CM and ICD-10-PCS code sets
```
claude mcp add icd-10-codes --transport http https://mcp.deepsense.ai/icd10_codes/mcp
```

**CMS Coverage** - Access the CMS Coverage Database
```
claude mcp add cms-coverage --transport http https://mcp.deepsense.ai/cms_coverage/mcp
```

### Specialized Tools

**Hugging Face** - Access the Hub and thousands of Gradio Apps
```
claude mcp add --transport http hugging-face https://huggingface.co/mcp
```

**GoDaddy** - Search domains and check availability
```
claude mcp add --transport http godaddy https://api.godaddy.com/v1/domains/mcp
```

**Miro** - Access and create new content on boards
```
claude mcp add --transport http miro https://mcp.miro.com/
```

**Bitly** - Shorten links, generate QR Codes, track performance
```
claude mcp add --transport http bitly https://api-ssl.bitly.com/v4/mcp
```

**Clockwise** - Advanced scheduling and time management
```
claude mcp add --transport http clockwise https://mcp.getclockwise.com/mcp
```

**JotForm** - Create forms & analyze submissions
```
claude mcp add --transport http jotform https://mcp.jotform.com/mcp-app
```

**Lumin** - Manage documents, send signature requests, convert Markdown to PDF
```
claude mcp add --transport http lumin https://mcp.luminpdf.com/mcp
```

**LILT** - High-quality translation with human verification
```
claude mcp add --transport http lilt https://mcp.lilt.com/mcp
```

**Tavily** - Connect AI agents to the web
```
claude mcp add --transport http tavily https://mcp.tavily.com/mcp
```

**Blockscout** - Access and analyze blockchain data
```
claude mcp add blockscout --transport http https://mcp.blockscout.com/mcp
```

**Crypto.com** - Real time prices, orders, charts for crypto
```
claude mcp add --transport http crypto.com https://mcp.crypto.com/market-data/mcp
```

**PlayMCP** - Connect and use PlayMCP servers
```
claude mcp add playmcp --transport http https://playmcp.kakao.com/mcp
```

**Melon** - Browse music charts & personalized music picks
```
claude mcp add melon --transport http https://mcp.melon.com/mcp/
```

**Udemy Business** - Search and explore skill-building resources
```
claude mcp add udemy-business --transport http https://api.udemy.com/mcp
```

**Dice** - Find active tech jobs
```
claude mcp add dice --transport http https://mcp.dice.com/mcp
```

**Local Falcon** - AI visibility and local search intelligence
```
claude mcp add --transport sse local-falcon https://mcp.localfalcon.com
```

**Krisp** - Add meetings context via transcripts and notes
```
claude mcp add --transport http krisp https://mcp.krisp.ai/mcp
```

**Jam** - Record screen and collect automatic context for issues
```
claude mcp add --transport http jam https://mcp.jam.dev/mcp
```

**LunarCrush** - Add real-time social media data to searches
```
claude mcp add lunarcrush --transport http https://lunarcrush.ai/mcp
```

**Candid** - Research nonprofits and funders
```
claude mcp add candid --transport http https://mcp.candid.org/mcp
```

**Midpage** - Conduct legal research and create work product
```
claude mcp add --transport http midpage https://app.midpage.ai/mcp
```

**Granted** - Discover every grant opportunity in existence
```
claude mcp add --transport http granted https://grantedai.com/api/mcp/mcp
```

**AuraIntelligence** - Company intelligence & workforce analytics
```
claude mcp add --transport http auraintelligence https://mcp.auraintelligence.com/mcp
```

**Crossbeam** - Explore partner data and ecosystem insights
```
claude mcp add crossbeam --transport http https://mcp.crossbeam.com
```

**Chronograph** - Interact with Chronograph data directly
```
claude mcp add --transport http chronograph https://ai.chronograph.pe/mcp
```

**Pylon** - Search and manage support issues
```
claude mcp add --transport http pylon https://mcp.usepylon.com/
```

**Zapier** - Automate workflows across thousands of apps
```
claude mcp add --transport http zapier https://mcp.zapier.com/api/v1/connect
```

**Make** - Run Make scenarios and manage account
```
claude mcp add --transport http make https://mcp.make.com
```

**Workato** - Automate workflows and connect business apps (requires user-specific URL)

**Benchling** - Connect to R&D data, source experiments, notebooks (requires user-specific URL)

**Port** - Search context lake and safely run actions (requires user-specific URL)

**Glean** - Bring enterprise context to Claude and AI tools (requires user-specific URL)

**SmartSheet** - Analyze and manage data (requires user-specific URL)

**NetSuite** - Connect to NetSuite data for analysis & insights (requires user-specific URL)

**CData Connect AI** - Managed MCP platform for 350 sources
```
claude mcp add cdata-connect-ai --transport http https://mcp.cloud.cdata.com/mcp
```

**DataGrail** - Secure, production-ready AI orchestration (requires user-specific URL)

**Vibe Prospecting** - Find company & contact data
```
claude mcp add vibe-prospecting --transport http https://vibeprospecting.explorium.ai/mcp
```

**Clerk** - Add authentication, organizations, and billing
```
claude mcp add --transport http clerk https://mcp.clerk.com/mcp
```

**Airtable** - Read and write Airtable databases

## Installation Methods

### Option 1: Remote HTTP Servers

HTTP servers are the recommended transport for remote MCP servers:

```
# Basic syntax
claude mcp add --transport http <name> <url>

# Example: Connect to Notion
claude mcp add --transport http notion https://mcp.notion.com/mcp

# Example with Bearer token
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"
```

### Option 2: Remote SSE Servers

Server-Sent Events transport for streaming capabilities:

```
# Basic syntax
claude mcp add --transport sse <name> <url>

# Real example: Connect to Asana
claude mcp add --transport sse asana https://mcp.asana.com/sse

# Example with authentication header
claude mcp add --transport sse private-api https://api.company.com/sse \
  --header "X-API-Key: your-key-here"
```

### Option 3: Local Stdio Servers

Stdio servers run as local processes for direct system access:

```
# Basic syntax
claude mcp add [options] <name> -- <command> [args...]

# Real example: Add Airtable server
claude mcp add --transport stdio --env AIRTABLE_API_KEY=YOUR_KEY airtable \
  -- npx -y airtable-mcp-server
```

## Managing MCP Servers

Once configured, use these commands:

```
# List all configured servers
claude mcp list

# Get details for a specific server
claude mcp get github

# Remove a server
claude mcp remove github

# (within Claude Code) Check server status
/mcp
```

## Dynamic Tool Updates

Claude Code supports MCP `list_changed` notifications, allowing servers to dynamically update their available tools, prompts, and resources without requiring disconnection and reconnection. When a server sends a `list_changed` notification, Claude Code automatically refreshes the available capabilities.

## Push Messages with Channels

MCP servers can push messages directly into your session so Claude can react to external events. Servers declare the `claude/channel` capability and are opted in with the `--channels` flag at startup. Refer to the Channels documentation for officially supported channels or the Channels reference to build custom ones.

## Plugin-Provided MCP Servers

Plugins can bundle MCP servers, automatically providing tools and integrations when enabled.

### How Plugin MCP Servers Work

- Plugins define MCP servers in `.mcp.json` at the plugin root or inline in `plugin.json`
- When a plugin is enabled, its MCP servers start automatically
- Plugin MCP tools appear alongside manually configured tools
- Plugin servers are managed through plugin installation (not `/mcp` commands)

### Example Plugin MCP Configuration

In `.mcp.json` at plugin root:

```json
{
  "database-tools": {
    "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
    "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
    "env": {
      "DB_URL": "${DB_URL}"
    }
  }
}
```

Or inline in `plugin.json`:

```json
{
  "name": "my-plugin",
  "mcpServers": {
    "plugin-api": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/api-server",
      "args": ["--port", "8080"]
    }
  }
}
```

### Plugin MCP Features

**Automatic lifecycle**: At session startup, servers for enabled plugins connect automatically. Enabling or disabling a plugin during a session requires running `/reload-plugins` to connect or disconnect its MCP servers.

**Environment variables**: Use `${CLAUDE_PLUGIN_ROOT}` for bundled plugin files and `${CLAUDE_PLUGIN_DATA}` for persistent state that survives plugin updates.

**User environment access**: Access the same environment variables as manually configured servers.

**Multiple transport types**: Supports stdio, SSE, and HTTP transports (support varies by server).

**Viewing plugin MCP servers**:

```
# Within Claude Code, see all MCP servers including plugin ones
/mcp
```

Plugin servers appear in the list with indicators showing they come from plugins.

**Benefits**:

- **Bundled distribution**: Tools and servers packaged together
- **Automatic setup**: No manual MCP configuration needed
- **Team consistency**: Everyone gets the same tools when plugin is installed

## MCP Installation Scopes

MCP servers can be configured at three scope levels, each serving distinct purposes:

### Local Scope

Local-scoped servers are stored in `~/.claude.json` under your project's path. They remain private to you and are only accessible when working within the current project directory. This is ideal for personal development servers, experimental configurations, or servers containing sensitive credentials.

```
# Add a local-scoped server (default)
claude mcp add --transport http stripe https://mcp.stripe.com

# Explicitly specify local scope
claude mcp add --transport http stripe --scope local https://mcp.stripe.com
```

### Project Scope

Project-scoped servers store configurations in a `.mcp.json` file at your project's root directory, designed to be checked into version control. This ensures all team members have access to the same MCP tools and services.

```
# Add a project-scoped server
claude mcp add --transport http paypal --scope project https://mcp.paypal.com/mcp
```

The resulting `.mcp.json` file:

```json
{
  "mcpServers": {
    "shared-server": {
      "command": "/path/to/server",
      "args": [],
      "env": {}
    }
  }
}
```

For security reasons, Claude Code prompts for approval before using project-scoped servers from `.mcp.json` files. Reset approval choices with:

```
claude mcp reset-project-choices
```

### User Scope

User-scoped servers are stored in `~/.claude.json` and provide cross-project accessibility, available across all projects on your machine while remaining private to your user account. This works well for personal utility servers, development tools, or frequently-used services.

```
# Add a user server
claude mcp add --transport http hubspot --scope user https://mcp.hubspot.com/anthropic
```

### Choosing the Right Scope

- **Local scope**: Personal servers, experimental configurations, sensitive credentials specific to one project
- **Project scope**: Team-shared servers, project-specific tools, services required for collaboration
- **User scope**: Personal utilities across multiple projects, development tools, frequently-used services

### Scope Hierarchy and Precedence

When servers with the same name exist at multiple scopes, the system prioritizes local-scoped servers first, followed by project-scoped servers, and finally user-scoped servers. This design allows personal configurations to override shared ones.

### Environment Variable Expansion in `.mcp.json`

Claude Code supports environment variable expansion in `.mcp.json` files.

**Supported syntax:**

- `${VAR}` - Expands to the value of environment variable `VAR`
- `${VAR:-default}` - Expands to `VAR` if set, otherwise uses `default`

**Expansion locations**: Environment variables expand in:

- `command` - The server executable path
- `args` - Command-line arguments
- `env` - Environment variables passed to the server
- `url` - For HTTP server types
- `headers` - For HTTP server authentication

**Example with variable expansion:**

```json
{
  "mcpServers": {
    "api-server": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      }
    }
  }
}
```

If a required environment variable is not set and has no default value, Claude Code fails to parse the config.

## Practical Examples

### Monitor Errors with Sentry

```
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
```

Authenticate with your Sentry account:

```
/mcp
```

Then debug production issues:

```
What are the most common errors in the last 24 hours?
Show me the stack trace for error ID abc123
Which deployment introduced these new errors?
```

### Connect to GitHub for Code Reviews

```
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
```

Authenticate if needed by selecting "Authenticate" for GitHub:

```
/mcp
```

Then work with GitHub:

```
Review PR #456 and suggest improvements
Create a new issue for the bug we just found
Show me all open PRs assigned to me
```

### Query Your PostgreSQL Database

```
claude mcp add --transport stdio db -- npx -y @bytebase/dbhub \
  --dsn "postgresql://readonly:pass@prod.db.com:5432/analytics"
```

Then query naturally:

```
What's our total revenue this month?
Show me the schema for the orders table
Find customers who haven't made a purchase in 90 days
```

## Authentication with Remote MCP Servers

Many cloud-based MCP servers require authentication. Claude Code supports OAuth 2.0 for secure connections.

### Use a Fixed OAuth Callback Port

Some MCP servers require a specific redirect URI registered in advance. By default, Claude Code picks a random available port. Use `--callback-port` to fix the port to match a pre-registered redirect URI.

```
# Fixed callback port with dynamic client registration
claude mcp add --transport http \
  --callback-port 8080 \
  my-server https://mcp.example.com/mcp
```

### Use Pre-Configured OAuth Credentials

Some servers don't support automatic OAuth setup. If you see an error like "Incompatible auth server: does not support dynamic client registration," register an OAuth app through the server's developer portal first, then provide the credentials when adding the server.

### Override OAuth Metadata Discovery

If your MCP server returns errors on the standard OAuth metadata endpoint but exposes a working OIDC endpoint, you can tell Claude Code to fetch OAuth metadata from a URL you specify.

Set `authServerMetadataUrl` in the `oauth` object:

```json
{
  "mcpServers": {
    "my-server": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "oauth": {
        "authServerMetadataUrl": "https://auth.example.com/.well-known/openid-configuration"
      }
    }
  }
}
```

The URL must use `https://`. This requires Claude Code v2.1.64 or later.

## Add MCP Servers from JSON Configuration

If you have a JSON configuration for an MCP server, you can add it directly to your setup.

## Import MCP Servers from Claude Desktop

If you've already configured MCP servers in Claude Desktop, you can import them into Claude Code.

## Use MCP Servers from Claude.ai

If logged into Claude Code with a Claude.ai account, MCP servers added in Claude.ai are automatically available in Claude Code.

To disable claude.ai MCP servers in Claude Code:

```
ENABLE_CLAUDEAI_MCP_SERVERS=false claude
```

## Use Claude Code as an MCP Server

You can use Claude Code itself as an MCP server that other applications can connect to:

```
# Start Claude as a stdio MCP server
claude mcp serve
```

Use this in Claude Desktop by adding to claude_desktop_config.json:

```json
{
  "mcpServers": {
    "claude-code": {
      "type": "stdio",
      "command": "claude",
      "args": ["mcp", "serve"],
      "env": {}
    }
  }
}
```

## MCP Output Limits and Warnings

When MCP tools produce large outputs, Claude Code helps manage token usage:

- **Output warning threshold**: Claude Code displays a warning when any MCP tool output exceeds 10,000 tokens
- **Configurable limit**: Adjust the maximum allowed MCP output tokens using the `MAX_MCP_OUTPUT_TOKENS` environment variable
- **Default limit**: The default maximum is 25,000 tokens

To increase the limit for tools producing large outputs:

```
# Set a higher limit for MCP tool outputs
export MAX_MCP_OUTPUT_TOKENS=50000
claude
```

This is particularly useful when working with MCP servers that:

- Query large datasets or databases
- Generate detailed reports or documentation
- Process extensive log files or debugging information

## Respond to MCP Elicitation Requests

MCP servers can request structured input using elicitation. When a server needs information it can't access, Claude Code displays an interactive dialog and passes your response back to the server. No configuration is required; elicitation dialogs appear automatically.

Servers can request input in two ways:

- **Form mode**: Claude Code shows a dialog with form fields defined by the server (for example, a username and password prompt). Fill in the fields and submit.
- **URL mode**: Claude Code opens a browser URL for authentication or approval. Complete the flow in the browser, then confirm in the CLI.

To auto-respond to elicitation requests without showing a dialog, use the `Elicitation` hook.

For building MCP servers that use elicitation, see the MCP elicitation specification for protocol details and schema examples.

## Use MCP Resources

MCP servers can expose resources that you can reference using @ mentions, similar to how you reference files.

### Reference MCP Resources

You can mention MCP resources directly in your conversation using @ references.

## Scale with MCP Tool Search

When you have many MCP servers configured, tool definitions can consume a significant portion of your context window. MCP Tool Search solves this by dynamically loading tools on-demand.

### How It Works

Claude Code automatically enables Tool Search when your MCP tool descriptions would consume more than 10% of the context window. When triggered:

1. MCP tools are deferred rather than loaded upfront
2. Claude uses a search tool to discover relevant MCP tools when needed
3. Only needed tools are loaded into context
4. MCP tools continue to work as before

If building an MCP server, the server instructions field becomes more useful with Tool Search enabled. Add clear, descriptive server instructions that explain:

- What category of tasks your tools handle
- When Claude should search for your tools
- Key capabilities your server provides

### Configure Tool Search

Tool search is enabled by default. When `ANTHROPIC_BASE_URL` points to a non-first-party host, tool search is disabled by default because most proxies don't forward `tool_reference` blocks. Set `ENABLE_TOOL_SEARCH` explicitly if your proxy does. This feature requires models supporting `tool_reference` blocks: Sonnet 4 and later, or Opus 4 and later. Haiku doesn't support tool search.

Control behavior with the `ENABLE_TOOL_SEARCH` environment variable:

| Value | Behavior |
| --- | --- |
| (unset) | Enabled by default. Disabled when `ANTHROPIC_BASE_URL` is non-first-party |
| `true` | Always enabled, even for non-first-party `ANTHROPIC_BASE_URL` |
| `auto` | Activates when MCP tools exceed 10% of context |
| `auto:<N>` | Activates at custom threshold, where `<N>` is percentage |
| `false` | Disabled, all MCP tools loaded upfront |

```
# Use a custom 5% threshold
ENABLE_TOOL_SEARCH=auto:5 claude

# Disable tool search entirely
ENABLE_TOOL_SEARCH=false claude
```

Or set the value in your settings.json `env` field.

You can also disable the MCPSearch tool specifically:

```json
{
  "permissions": {
    "deny": ["MCPSearch"]
  }
}
```

## Use MCP Prompts as Commands

MCP servers can expose prompts that become available as commands in Claude Code.

### Execute MCP Prompts

MCP prompts are available as executable commands within your sessions.

## Managed MCP Configuration

For organizations needing centralized control over MCP servers, Claude Code supports two configuration options:

1. **Exclusive control with `managed-mcp.json`**: Deploy a fixed set of MCP servers that users cannot modify or extend
2. **Policy-based control with allowlists/denylists**: Allow users to add their own servers, but restrict which ones are permitted

These options allow IT administrators to:

- Control which MCP servers employees can access
- Prevent unauthorized MCP servers
- Disable MCP entirely if needed

### Option 1: Exclusive Control with managed-mcp.json

When you deploy a `managed-mcp.json` file, it takes exclusive control over all MCP servers. Users cannot add, modify, or use any MCP servers other than those defined in this file.

System administrators deploy the configuration file to a system-wide directory:

- macOS: `/Library/Application Support/ClaudeCode/managed-mcp.json`
- Linux and WSL: `/etc/claude-code/managed-mcp.json`
- Windows: `C:\Program Files\ClaudeCode\managed-mcp.json`

The `managed-mcp.json` file uses the same format as a standard `.mcp.json` file:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "sentry": {
      "type": "http",
      "url": "https://mcp.sentry.dev/mcp"
    },
    "company-internal": {
      "type": "stdio",
      "command": "/usr/local/bin/company-mcp-server",
      "args": ["--config", "/etc/company/mcp-config.json"],
      "env": {
        "COMPANY_API_URL": "https://internal.company.com"
      }
    }
  }
}
```

### Option 2: Policy-Based Control with Allowlists and Denylists

Instead of taking exclusive control, administrators can allow users to configure their own MCP servers while enforcing restrictions on which servers are permitted. This uses `allowedMcpServers` and `deniedMcpServers` in the managed settings file.

#### Restriction Options

Each entry in the allowlist or denylist can restrict servers in three ways:

1. **By server name** (`serverName`): Matches the configured name of the server
2. **By command** (`serverCommand`): Matches the exact command and arguments used to start stdio servers
3. **By URL pattern** (`serverUrl`): Matches remote server URLs with wildcard support

**Important**: Each entry must have exactly one of `serverName`, `serverCommand`, or `serverUrl`.

#### Example Configuration

```json
{
  "allowedMcpServers": [
    { "serverName": "github" },
    { "serverName": "sentry" },

    { "serverCommand": ["npx", "-y", "@modelcontextprotocol/server-filesystem"] },
    { "serverCommand": ["python", "/usr/local/bin/approved-server.py"] },

    { "serverUrl": "https://mcp.company.com/*" },
    { "serverUrl": "https://*.internal.corp/*" }
  ],
  "deniedMcpServers": [
    { "serverName": "dangerous-server" },

    { "serverCommand": ["npx", "-y", "unapproved-package"] },

    { "serverUrl": "https://*.untrusted.com/*" }
  ]
}
```

#### How Command-Based Restrictions Work

**Exact matching**: Command arrays must match exactly -- both command and all arguments in correct order. Example: `["npx", "-y", "server"]` will NOT match `["npx", "server"]` or `["npx", "-y", "server", "--flag"]`.

**Stdio server behavior**: When the allowlist contains any `serverCommand` entries, stdio servers must match one of those commands. Stdio servers cannot pass by name alone when command restrictions are present.

**Non-stdio server behavior**: Remote servers (HTTP, SSE, WebSocket) use URL-based matching when `serverUrl` entries exist in the allowlist. If no URL entries exist, remote servers fall back to name-based matching. Command restrictions don't apply to remote servers.

#### How URL-Based Restrictions Work

URL patterns support wildcards using `*` to match any sequence of characters.

**Wildcard examples**:

- `https://mcp.company.com/*` - Allow all paths on a specific domain
- `https://*.example.com/*` - Allow any subdomain of example.com
- `http://localhost:*/*` - Allow any port on localhost

**Remote server behavior**: When the allowlist contains any `serverUrl` entries, remote servers must match one of those URL patterns. Remote servers cannot pass by name alone when URL restrictions are present.

**Example: URL-only allowlist**

```json
{
  "allowedMcpServers": [
    { "serverUrl": "https://mcp.company.com/*" },
    { "serverUrl": "https://*.internal.corp/*" }
  ]
}
```

**Result**:

- HTTP server at `https://mcp.company.com/api`: Allowed
- HTTP server at `https://api.internal.corp/mcp`: Allowed
- HTTP server at `https://external.com/mcp`: Blocked
- Stdio server with any command: Blocked

**Example: Command-only allowlist**

```json
{
  "allowedMcpServers": [
    { "serverCommand": ["npx", "-y", "approved-package"] }
  ]
}
```

**Result**:

- Stdio server with `["npx", "-y", "approved-package"]`: Allowed
- Stdio server with `["node", "server.js"]`: Blocked
- HTTP server named "my-api": Blocked

**Example: Mixed name and command allowlist**

```json
{
  "allowedMcpServers": [
    { "serverName": "github" },
    { "serverCommand": ["npx", "-y", "approved-package"] }
  ]
}
```

**Result**:

- Stdio server named "local-tool" with `["npx", "-y", "approved-package"]`: Allowed
- Stdio server named "local-tool" with `["node", "server.js"]`: Blocked
- Stdio server named "github" with `["node", "server.js"]`: Blocked
- HTTP server named "github": Allowed
- HTTP server named "other-api": Blocked

**Example: Name-only allowlist**

```json
{
  "allowedMcpServers": [
    { "serverName": "github" },
    { "serverName": "internal-tool" }
  ]
}
```

**Result**:

- Stdio server named "github" with any command: Allowed
- Stdio server named "internal-tool" with any command: Allowed
- HTTP server named "github": Allowed
- Any server named "other": Blocked

#### Allowlist Behavior (`allowedMcpServers`)

- `undefined` (default): No restrictions -- users can configure any MCP server
- Empty array `[]`: Complete lockdown -- users cannot configure any MCP servers
- List of entries: Users can only configure servers matching by name, command, or URL pattern

#### Denylist Behavior (`deniedMcpServers`)

- `undefined` (default): No servers are blocked
- Empty array `[]`: No servers are blocked
- List of entries: Specified servers are explicitly blocked across all scopes

#### Important Notes

- **Option 1 and Option 2 can be combined**: If `managed-mcp.json` exists, it has exclusive control and users cannot add servers. Allowlists/denylists still apply to the managed servers themselves.
- **Denylist takes absolute precedence**: If a server matches a denylist entry (by name, command, or URL), it will be blocked even if on the allowlist.
- **Name, command, and URL restrictions work together**: A server passes if it matches either a name entry, a command entry, or a URL pattern (unless blocked by denylist).
