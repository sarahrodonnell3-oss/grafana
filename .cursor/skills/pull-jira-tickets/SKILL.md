---
name: pull-jira-tickets
description: Pull the current user's JIRA tickets for this Grafana repo via Atlassian MCP. Use when the user asks for their JIRA tickets, backlog, assigned issues, or tasks for this repo or project.
---

# Pull JIRA Tickets for This Repo

## Instructions

When the user asks for their JIRA tickets for this repo, use Atlassian MCP tools. Do not ask the user to look them up manually.

### 1. Resolve context

Run in parallel:

1. `atlassianUserInfo` — confirm the authenticated user
2. `getAccessibleAtlassianResources` — get the `cloudId` for Jira queries
3. `git remote -v` — confirm repo is `fieldsphere/grafana`

**Project mapping:** `fieldsphere/grafana` → Jira project **GRAF** (GRAFANA) on `fe-anysphere-demo.atlassian.net`.

### 2. Search Jira

Use `searchJiraIssuesUsingJql` with the resolved `cloudId`.

**Primary query** (assigned tickets in the Grafana project):

```jql
project = GRAF AND assignee = currentUser() ORDER BY updated DESC
```

**Fallback query** (if primary returns nothing or user asks broadly):

```jql
assignee = currentUser() AND (text ~ "grafana" OR summary ~ "grafana") ORDER BY updated DESC
```

Request fields: `summary`, `status`, `issuetype`, `priority`, `created`, `updated`, `assignee`, `reporter`, `labels`, `description`.

### 3. Present results

Use this format:

```markdown
## Assigned to you (N)

| Key | Summary | Status | Priority | Updated | Labels |
|-----|---------|--------|----------|---------|--------|
| [GRAF-XXX](https://fe-anysphere-demo.atlassian.net/browse/GRAF-XXX) | ... | ... | ... | ... | ... |

---

### GRAF-XXX — [Summary]
**Reporter:** [Name]

[Brief scope from description: context, acceptance criteria, or key packages]
```

- Link each ticket: `https://fe-anysphere-demo.atlassian.net/browse/{KEY}`
- Group by status if more than ~5 tickets
- If no tickets found, say so and note which queries were run
- Offer to pull full details or start work on a ticket

### 4. Optional follow-ups

Only when asked:

- **Single ticket details:** `getJiraIssue` with the ticket key
- **Tickets you reported but didn't assign to yourself:**

```jql
project = GRAF AND reporter = currentUser() AND assignee != currentUser() ORDER BY updated DESC
```

## Notes

- Prefer the **GRAF** project over broad text search — it is the canonical Jira project for this repo.
- Do not create, edit, or transition Jira issues unless the user explicitly asks.
- If Atlassian MCP auth fails, call `mcp_auth` for the Atlassian server and retry once.
