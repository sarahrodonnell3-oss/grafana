# Confluence Page Template

Use this structure when creating implementation-overview pages. Omit sections that do not apply.

## Title pattern

```
{TICKET-KEY}: {Topic} Implementation Overview
```

Example: `GRAF-236: API Hardening Implementation Overview`

## Required sections

1. **Intro** — link primary ticket + epic (if any); state the goal in one sentence
2. **Epic scope** — settings/behavior summary table; in-scope vs out-of-scope bullets
3. **Implementation sequence** — ordered table: Order | Ticket | Summary | Status | Owner | Key files
4. **Per-step detail** — one `h2` per implementation ticket (`Step N — {summary} ({KEY})`):
   - Changes (bullets with file paths and config keys)
   - Tests (task list or acceptance criteria from Jira)
   - Test command if the ticket specifies one
5. **Verification step** (when primary ticket is verification/handoff):
   - Prerequisite panel (block if upstream tickets not merged)
   - Automated verification steps
   - Manual compatibility checklist table
   - Handoff deliverable (pass/fail/blocked matrix + residual risks)
6. **Architecture** — short ASCII or code-block flow from config → settings → enforcement → API/logging → verification
7. **Risks and mitigations** — table from Jira or synthesized from ticket risks sections
8. **Related links** — bullet list of all linked Jira keys

## HTML patterns (contentFormat: html)

**Info panel (goal/context):**

```html
<div data-type="panel-info"><p><strong>Goal:</strong> …</p></div>
```

**Warning panel (prerequisite/blocker):**

```html
<div data-type="panel-warning"><p><strong>Prerequisite:</strong> …</p></div>
```

**Status in table cells:**

```html
<span data-type="status" data-color="green">Done</span>
<span data-type="status" data-color="yellow">In Progress</span>
<span data-type="status" data-color="neutral">To Do</span>
```

**Task list (acceptance criteria):**

```html
<ul data-type="task-list">
  <li data-type="task-item"><input type="checkbox"> Unchecked item</li>
  <li data-type="task-item"><input type="checkbox" checked="true" disabled="true"> Done item</li>
</ul>
```

**Jira link:**

```html
<a href="https://fe-anysphere-demo.atlassian.net/browse/GRAF-236">GRAF-236</a>
```

## Implementation sequence table (HTML skeleton)

```html
<table data-layout="default">
<thead>
<tr><th>Order</th><th>Ticket</th><th>Summary</th><th>Status</th><th>Owner</th><th>Key files</th></tr>
</thead>
<tbody>
<tr>
  <td>1</td>
  <td><a href="https://fe-anysphere-demo.atlassian.net/browse/GRAF-234">GRAF-234</a></td>
  <td>Add server settings for API request hardening</td>
  <td><span data-type="status" data-color="green">Done</span></td>
  <td>Name</td>
  <td><code>pkg/setting/setting.go</code></td>
</tr>
</tbody>
</table>
```

## Compatibility checklist table (verification tickets)

| Area | What to verify |
|------|----------------|
| Large JSON APIs | Below-limit success; oversized → 413; disable escape hatch |
| Multipart uploads | JSON binding changes do not affect upload handlers |
| Datasource proxy | Proxy routes bypass `web.Bind` |
| Logging defaults | Disabled threshold is a no-op |
| Operator docs | `conf/defaults.ini` and configure-grafana docs updated |

## Architecture block (plain pre/code)

```
conf/defaults.ini
    └── [server] settings
            ↓
    pkg/setting/setting.go (Cfg)
            ↓
    enforcement layer (e.g. pkg/web/binding.go)
            ↓
    API wiring (e.g. pkg/web/context.go)
            ↓
    verification ticket steps
```

## Markdown fallback (when MCP publish fails)

If `createConfluencePage` fails, deliver the same sections as markdown in chat so the user can paste manually. Use the table and checklist formats from this file.
