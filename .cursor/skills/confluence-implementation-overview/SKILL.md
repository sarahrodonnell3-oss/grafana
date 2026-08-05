---
name: confluence-implementation-overview
description: Creates Confluence implementation-overview pages from GRAF Jira tickets using Atlassian MCP. Use when the user asks to write a Confluence page, implementation overview, epic breakdown, or handoff doc from a Jira ticket or GRAF work item.
---

# Confluence Implementation Overview

Write a Confluence page that explains **what to build, in what order, and how to verify** — sourced from Jira ticket(s) and the Grafana codebase.

## When to use

- User asks for a Confluence page from a Jira ticket (e.g. "Take GRAF-236 and write a Confluence page")
- User wants an implementation overview, epic breakdown, or verification handoff doc
- User mentions Confluence + Jira/GRAF together

Do **not** use for generic docs under `docs/` — those follow `docs/AGENTS.md`.

## Context

| Item | Value |
|------|-------|
| Repo | `fieldsphere/grafana` |
| Jira project | **GRAF** on `fe-anysphere-demo.atlassian.net` |
| Confluence site | `fe-anysphere-demo.atlassian.net` |
| Default space | **GRAF** (space key; resolved automatically by MCP) |
| Cloud ID | From `getAccessibleAtlassianResources` |

## Workflow

### 1. Resolve Jira context

Run in parallel:

1. `getAccessibleAtlassianResources` — `cloudId`
2. `getJiraIssue` — primary ticket (`summary`, `description`, `status`, `labels`, `issuelinks`, `parent`)
3. `searchJiraIssuesUsingJql` — related tickets (epic siblings, same label, or epic children)

**Related-ticket JQL patterns** (pick what fits):

```jql
project = GRAF AND labels = {label} ORDER BY created ASC
project = GRAF AND parent = {EPIC-KEY} ORDER BY created ASC
project = GRAF AND key in ({KEY-1}, {KEY-2}, ...) ORDER BY key ASC
```

Use `responseContentFormat: "markdown"` for issue bodies.

### 2. Enrich from codebase (when paths are named in tickets)

Search/read files mentioned in ticket descriptions (settings, binding, middleware, API routes). Confirm:

- Which steps are already merged vs. still planned
- Exact package paths and config keys
- High-risk compatibility paths called out in tickets

Keep codebase notes brief — the page is an implementation guide, not a code walkthrough.

### 3. Find or pick Confluence space

1. `getConfluenceSpaces` with the `cloudId` — confirm **GRAF** exists
2. If the user named a parent page or space, use that; otherwise default to space **GRAF**

### 4. Create the page

Use `createConfluencePage`:

| Field | Value |
|-------|-------|
| `cloudId` | From step 1 |
| `spaceId` | `GRAF` (or user-specified space key/ID) |
| `contentType` | `page` |
| `contentFormat` | `html` (preferred for tables, panels, task lists) |
| `status` | `current` unless user asks for draft |
| `title` | `{TICKET-KEY}: {Short topic} Implementation Overview` |
| `parentId` | Only if user specifies a parent page |

Follow the page structure in [reference.md](reference.md). Adapt sections to the ticket type:

- **Verification ticket** (like GRAF-236): emphasize prerequisite gate, test commands, compatibility checklist
- **Implementation ticket**: emphasize changes, acceptance criteria, tests, risks
- **Epic**: emphasize child-ticket sequence table and epic-level acceptance criteria

Link every Jira key: `https://fe-anysphere-demo.atlassian.net/browse/{KEY}`

### 5. Report back

Return:

- Confluence page URL from the MCP response
- One-line summary of what was documented
- Any blockers (missing related tickets, MCP auth failure, prerequisite code not in repo)

## MCP failure handling

If Atlassian MCP times out or auth fails:

1. Call `mcp_auth` for `plugin-atlassian-atlassian`, retry once
2. If still failing, deliver the full page body as markdown in chat (using [reference.md](reference.md) structure) and note the page was **not** published
3. Offer to publish when MCP reconnects

## Guardrails

- Do not create, edit, or transition Jira issues unless explicitly asked
- Do not invent ticket scope — derive steps from Jira descriptions and codebase paths cited there
- Do not expand a verification ticket into implementation work in the Confluence doc
- Keep operator escape hatches and compatibility risks visible when tickets mention them

## Additional resources

- Page HTML template and section checklist: [reference.md](reference.md)
- Pull assigned tickets first: [pull-jira-tickets](../pull-jira-tickets/SKILL.md)
