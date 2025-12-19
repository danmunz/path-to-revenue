# Visual Specification: Paths‑to‑Target Revenue Explorer

This document defines the **UX, interaction design, visual design, and engineering patterns** for a revenue‑exploration app modeled *explicitly* on the New York Times 2012 “Paths to 270” visualization. The goal is not inspiration but **structural fidelity**: the same mental model, interaction grammar, and rendering logic, adapted to revenue data.

![Example visual of the desired end product](/docs/visual_example.png)

---

## 1. Core Mental Model

**What this is**  
A **probabilistic decision tree rendered as a flowing, narrative diagram**.

- The root represents the fully undecided pipeline.
- Each horizontal band represents one opportunity being resolved.
- Each branch represents a binary outcome for that opportunity.
- A path from top to bottom represents one complete combination of outcomes.
- A path is considered a **success** if cumulative revenue meets or exceeds the target.

**What this is not**
- Not a funnel
- Not a Gantt chart
- Not a Sankey showing historical flow
- Not a Monte Carlo scatterplot

This is a *counterfactual explorer*: “If these things break this way, do we get there?”

---

## 2. Visual Description (What It Should Look Like)

### Overall Form
- A **top‑down, left‑to‑right branching tree**.
- The diagram reads vertically: early decisions at the top, later decisions at the bottom.
- The eye follows smooth ribbons downward as possibilities narrow.

### Paths (Links)
- Drawn as **smooth cubic Bézier curves** (never straight lines).
- Paths split symmetrically at each decision point.
- **Thickness encodes probability mass**: thicker near the top, thinner as probability subdivides.
- Slight horizontal offsets are applied to prevent visual overlap (braided effect).

### Color System
- Two primary branch colors:
  - *Win / Positive outcome*: blue
  - *Loss / Negative outcome*: red
- Optional third color for ties / edge cases: muted gold
- Colors are **soft and desaturated**, conveying uncertainty rather than certainty.
- Inactive paths fade to low‑contrast gray on hover.

### Nodes & Endpoints
- No explicit decision nodes (no boxes or circles at splits).
- Leaf nodes are small dots at the bottom.
- Successful paths may terminate with a subtle checkmark or emphasis dot.

### Grid & Scaffolding
- Faint horizontal gridlines divide the chart into rows.
- Each row corresponds to **one opportunity**.
- Left‑side labels describe the conditional logic for that row.

### Typography
- Minimalist, editorial style.
- Row labels are written as **conditional sentences**, e.g.:
  - “If Project Atlas is won…”
- Numbers are secondary; narrative structure comes first.

### Gestalt Impression
- Feels like a **river delta or subway map**, not a traditional chart.
- Something you *trace*, not read.
- Emphasizes contingency, accumulation, and tradeoffs.

---

## 3. UX Structure (Screen Regions)

The page is divided into four primary regions.

### 3.1 Control Strip (Top)
- A horizontal strip of compact controls, one per opportunity.
- Each control allows toggling the outcome of that opportunity:
  - Win / Loss (closed opportunities auto‑lock).
- Selecting an outcome removes that opportunity from the undecided set.
- A **Reset** button appears only after at least one selection.

### 3.2 Scoreboard (Top‑Center)
- Continuously answers one question:

  > “How many ways can we hit the revenue target?”

- Displays:
  - Number of paths that reach target
  - Number of paths that fail
  - Percent of total possible paths
- Updates instantly on every interaction.

### 3.3 Main Visualization (Center)
- The flowing paths‑to‑target tree.
- Ordered vertically by **Project Start Date** (earliest first).
- Hover and click interactions described below.

### 3.4 Scenario Cards (Bottom)
- Curated narrative entry points.
- Each card contains:
  - A short description (e.g., “Win all priority A deals”)
  - A miniature preview of the tree
  - A one‑click button that applies a preset

---

## 4. Interaction Design

### Hover Behavior (Primary Interaction)

Hovering over a path or leaf:
- Highlights the entire ancestor chain back to the root.
- Activates corresponding row labels.
- Fades all non‑related paths.

**Critical usability detail**:
- Thin paths are made hoverable via a **Voronoi overlay** or equivalent hit‑testing.

### Click / Double‑Click Behavior

- Clicking a path selects it visually only.
- **Double‑clicking** a path:
  - Identifies the *first unresolved opportunity* on that path.
  - Applies that outcome globally (equivalent to toggling the control).
  - Triggers animated reflow of the tree.

### Transitions
- All state changes animate smoothly using D3‑style transitions.
- Holding a modifier key (e.g., Alt) slows transitions for demo/explanation mode.

---

## 5. Visual Encoding Rules

| Concept | Visual Encoding |
|------|----------------|
| Outcome direction | Color (blue / red) |
| Probability mass | Path thickness |
| PWIN | Opacity |
| Decision order | Vertical position |
| Path relevance | Saturation / fade |

---

## 6. Data Model

### Input Data
- CSV or Google Sheet.
- One row per opportunity.

Required fields (minimum):
- Opportunity Name
- Ad Hoc TCV
- PWIN (0–1)
- Project Start Date
- Closed (boolean)
- Stage
- Quarterly revenue fields

### Normalization Rules
- Normalize PWIN to 0–1 internally.
- Closed opportunities auto‑resolve to Win or Loss.
- Factored revenue = TCV × PWIN.

---

## 7. Tree Generation Logic

### Decision Ladder
- Opportunities are sorted by Project Start Date.
- Each unresolved opportunity generates two children:
  - Win branch
  - Loss branch

### Node State
Each node tracks:
- Cumulative revenue
- Cumulative probability mass
- Set of resolved opportunities

### End Condition
- A node becomes a leaf when:
  - Revenue target is met (success), or
  - All opportunities are resolved (failure)

---

## 8. Counting “Ways to Hit Target”

- Each leaf represents multiple implicit completions based on remaining depth.
- For a leaf at depth *d* with *n* total opportunities:

  `number_of_paths = 2^(n - d)`

- Leaf paths contribute their count to:
  - Success
  - Failure
  - Tie / indeterminate (if applicable)

This mirrors the NYT approach exactly.

---

## 9. Rendering & Front‑End Architecture

### Rendering Stack
- SVG + D3 (or D3‑like) layout engine.
- Tree layout with custom `.children()` function.
- Stable node keys derived from sorted outcome sets to preserve transitions.

### Performance Constraints
- Client‑side enumeration is acceptable for ~10–12 opportunities.
- For larger sets:
  - Limit displayed depth
  - Aggregate remaining probability
  - Or pre‑compute server‑side

---

## 10. State & Sharing

- Scenario state is encoded entirely in the URL.
- No server‑side persistence required.
- Users can share exact views by sharing the URL.

---

## 11. Non‑Goals

- No forecasting claims.
- No prescriptive recommendations.
- No optimization or AI ranking.

This is an **exploratory reasoning tool**, not a decision engine.

---

## One‑Sentence Build Directive

> Build a flowing, ribbon‑based decision tree that enumerates all possible outcome paths through a set of revenue opportunities, using color for direction, thickness for probability, opacity for confidence, and animated interaction to let users explore how sequential wins and losses accumulate into success or failure against a fixed revenue target.


---

## 12. Worked Example: CSV → Explicit Tree

This section provides a concrete, end‑to‑end example showing how **six rows from the CSV** are transformed into an explicit decision tree, following the same mechanics as the NYT “Paths” visualization.

### 12.1 Example Input (Simplified)

Assume the following opportunities, normalized and sorted by **Project Start Date** (earliest first):

| Order | Opportunity | TCV ($M) | PWIN | Closed |
|------|-------------|----------|------|--------|
| 1 | Project Atlas | 12 | 0.80 | No |
| 2 | Project Beacon | 8 | 0.60 | No |
| 3 | Project Catalyst | 15 | 0.40 | No |
| 4 | Project Delta | 5 | 1.00 | Yes (Won) |
| 5 | Project Eclipse | 10 | 0.25 | No |
| 6 | Project Falcon | 6 | 0.50 | No |

**Revenue target:** $30M

**Preprocessing rules applied:**
- Project Delta is *closed‑won*, so its $5M is applied at the root.
- Remaining undecided opportunities: Atlas, Beacon, Catalyst, Eclipse, Falcon.

---

### 12.2 Root Node

- Cumulative revenue: $5M  
- Probability mass: 1.0  
- Remaining decisions: 5

Represents: *“Nothing else has been decided yet.”*

---

### 12.3 Level 1: Project Atlas

The root splits into two branches:

**Win Atlas**
- Revenue: $17M
- Probability: 1.0 × 0.80 = 0.80
- Visual: thick blue ribbon

**Lose Atlas**
- Revenue: $5M
- Probability: 1.0 × 0.20 = 0.20
- Visual: thinner red ribbon

Neither reaches target, so both continue.

---

### 12.4 Level 2: Project Beacon

Each Atlas branch splits again:

From **Win Atlas ($17M, p=0.80)**:
- Win Beacon → $25M, p=0.48
- Lose Beacon → $17M, p=0.32

From **Lose Atlas ($5M, p=0.20)**:
- Win Beacon → $13M, p=0.12
- Lose Beacon → $5M, p=0.08

Four visible paths now exist, with thickness proportional to probability mass.

---

### 12.5 Level 3: Project Catalyst (Early Wins)

Catalyst is large enough to trigger early success:

- Win Atlas → Win Beacon → **Win Catalyst** → $40M → **SUCCESS (terminal)**
- Win Atlas → Lose Beacon → **Win Catalyst** → $32M → **SUCCESS (terminal)**

Successful paths terminate early and no longer branch, exactly as in the NYT graphic.

Other Catalyst outcomes continue downward.

---

### 12.6 Levels 4–5: Eclipse and Falcon

Remaining non‑terminal paths continue branching on:
1. Project Eclipse
2. Project Falcon

A path that reaches depth 3 without success still represents:

```
2^(5 − 3) = 4
```

implicit completions. These are **counted, not drawn**.

---

### 12.7 Counting Ways to Hit Target

Each terminal leaf contributes:
- `2^(remainingDepth)` successful paths if revenue ≥ target
- `2^(remainingDepth)` failure paths otherwise

Example:
- Win Atlas → Win Beacon → Win Catalyst hits target at depth 3
- Remaining decisions: 2
- Contribution: `2^2 = 4` successful paths

The scoreboard aggregates these values continuously.

---

### 12.8 Visual Result

- Atlas appears as the top row.
- Beacon second.
- Catalyst third, where several thick blue ribbons terminate early.
- Eclipse and Falcon appear only on thin, low‑probability branches.

The tree becomes visually **top‑heavy**, clearly signaling which opportunities dominate the path to target.

---

## 13. Pseudocode & Diagram Annotations (Codex‑Ready)

This section translates the worked example directly into **logic and rendering steps** suitable for D3 implementation.

### 13.1 Data Preparation

```pseudo
rows = loadCSV()
rows = normalizePWIN(rows)
closedWins = rows.filter(r => r.closed && r.pwin == 1)
undecided = rows.filter(r => !r.closed)

rootRevenue = sum(closedWins.tcv)
root = Node(
  revenue = rootRevenue,
  probability = 1.0,
  depth = 0,
  resolved = {}
)
```

---

### 13.2 Tree Expansion Function

```pseudo
function expand(node, index):
  if node.revenue >= TARGET:
    node.isTerminal = true
    node.result = 'success'
    return

  if index == undecided.length:
    node.isTerminal = true
    node.result = 'failure'
    return

  opp = undecided[index]

  winNode = Node(
    revenue = node.revenue + opp.tcv,
    probability = node.probability * opp.pwin,
    depth = index + 1,
    resolved = node.resolved + { opp.name: 'win' }
  )

  loseNode = Node(
    revenue = node.revenue,
    probability = node.probability * (1 - opp.pwin),
    depth = index + 1,
    resolved = node.resolved + { opp.name: 'lose' }
  )

  node.children = [winNode, loseNode]

  expand(winNode, index + 1)
  expand(loseNode, index + 1)
```

---

### 13.3 Counting Paths

```pseudo
function countPaths(node):
  if node.isTerminal:
    remaining = undecided.length - node.depth
    ways = 2 ^ remaining
    return { success: ways if node.result=='success', failure: ways if node.result=='failure' }

  return sum(countPaths(child) for child in node.children)
```

---

### 13.4 Diagram Annotations

For each node / link:

- **y-position** = vertical scale(depth)
- **x-position** = tree layout (balanced)
- **stroke-width** = scale(probability)
- **stroke-color** = win / loss branch color
- **opacity** = current opportunity PWIN

Successful terminal nodes:
- Render leaf marker
- Do not render children

Hover interaction:
- Highlight path from node → root
- Fade unrelated links

Double-click interaction:
- Identify first unresolved decision in `resolved`
- Apply that outcome globally
- Recompute tree

---

This example is intentionally isomorphic to the NYT “Paths to 270” implementation, with only the domain variables changed.

