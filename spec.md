# **Revenue Path Planner – Lightweight Specification**

**Version:** 0.1 (Draft)  
**Last Updated:** December 16, 2025  
**Status:** Initial specification for review

---

**Overview**

A single-page, static web application with no server-side components that helps sales and finance teams at Ad Hoc, a midsize digital services firm that works with US federal agencies, visualize and explore different paths for reaching a revenue target based on their pipeline of projects, based on contract value, win probability, start date, and duration.

The application should draw on an export of data from Ad Hoc’s Salesforce pipeline via the Google Sheets API ([https://developers.google.com/workspace/sheets/api/guides/concepts](https://developers.google.com/workspace/sheets/api/guides/concepts)). The application does not require, and should not allow, users to **modify** data in any way. It is just a tool for exploring and visualizing the data. 

This concept is modeled after the New York Times’ 2020 "path to victory" electoral map tools. Instead of toggling states to reach 270 electoral votes, users toggle projects to explore paths to a revenue goal. As opportunities are won or lost throughout the year, the potential path(s) expand or narrow.

## Visual Analogy: Branching Outcome Layout (Reference Only)

The following reference images are included **solely as a visual and structural analog** for how complex, branching data should be laid out on screen.

They are drawn from historical New York Times election “paths to victory” simulators and are used **only to illustrate layout, hierarchy, and flow** — *not* domain semantics, data types, calculations, or styling.

The actual domain for this system is **contract opportunities, revenue contribution, and win/loss outcomes**, not elections.

### Reference Images (Illustrative Only)

![Example of a branching outcome tree where each level represents a conditional decision and terminal nodes represent aggregate outcomes](https://static01.nyt.com/images/2020/11/04/us/paths-to-victory-biden-trump-promo-1604539581911/paths-to-victory-biden-trump-promo-1604539581911-videoSixteenByNineJumbo1600.jpg)

![Earlier example showing deeper branching and aggregation of terminal outcomes](https://static01.nyt.com/images/2016/09/19/upshot/2012-paths-to-victory-1474301667379/2012-paths-to-victory-1474301667379-facebookJumbo.png)

![Example emphasizing aggregation of total paths per outcome](https://media.opennews.org/cache/63/7b/637b1bfd90c0e9ca9d86fc1a60d83293.png)

### What These Images Are Meant to Convey

These visuals demonstrate a **clear, readable layout for conditional outcome trees**, specifically:

- A **top-down, left-to-right branching structure**
- Each horizontal “layer” represents a **decision point** that partitions the remaining possibilities
- Each branch represents a **binary or discrete outcome** at that decision point
- Each complete path from root to leaf represents **one fully-specified scenario**
- Leaf nodes represent **terminal outcomes**, which can be counted, summarized, and compared

---

### How This Maps to the Actual Domain

In this system:

| Election Analogy (Reference Only) | Actual Meaning (Authoritative) |
|----------------------------------|--------------------------------|
| States                           | Opportunities                 |
| State being called               | Contract opportunity resolved |
| Electoral votes | Total Contract Value (TCV) \- represented as OPPORTUNITY SIZE in the visual interface |
| Polling predictions | P(win) percentage \- represented as OPPORTUNITY OPACITY in the visual interface |
| Win / Loss in a state            | Win / Loss of an opportunity  |
| Toggle state red/blue | Toggle opportunity won/lost |
| Red / Blue path                  | Negative / Positive outcome   |
| 270 votes to win | Revenue target |
| Electoral victory                | Revenue target met or missed  |
| Number of paths                  | Number of valid scenario combinations |
| "Path to victory" | "Path to revenue target" |

Each **branch point** corresponds to the outcome of a specific contract opportunity  
Each **path** corresponds to one possible portfolio outcome across all opportunities  
Each **leaf node** represents the aggregate result (e.g., total revenue, success/failure vs target)

---

### Authoritative Structural Model

The visualization must be treated as a **directed acyclic graph (tree)** with the following properties:

- Nodes represent decision points or terminal outcomes
- Edges represent mutually exclusive outcomes
- All root-to-leaf paths are valid scenarios
- Paths must be enumerable and aggregatable
- The visual layout must preserve readability as depth increases

> The images above are *not* authoritative for calculations, labels, colors, or interaction details.  
> They exist only to illustrate a proven, scalable way to present branching scenario data.

---

### Explicit Non-Requirements

The implementation **must not** attempt to reproduce:

- Election-specific terminology or assumptions
- Red/blue color semantics
- Exact typography, spacing, or animation timing
- NYT-specific interaction patterns

Only the **conceptual layout and branching metaphor** should be carried forward.

## **Key Concepts and Data Dictionary**

| Term | Definition | Source |
| :---- | :---- | :---- |
| Account Name | The name of the Federal agency or organization the opportunity originates from  | Salesforce data export |
| Opportunity Name | A potential deal in the pipeline | Salesforce data export |
| Ad Hoc TCV | Ad Hoc Total Contract Value – the amount of revenue Ad Hoc will make if the project/opportunity is won | Salesforce data export |
| PWIN | Probability of winning the opportunity, expressed as a percentage (0–100%) | Salesforce data export |
| Project Start Date | The date when the opportunity is expected to begin generating revenue, if won | Salesforce data export |
| Top Priority | A binary field indicating whether this deal is a top priority for Ad Hoc. | Salesforce data export |
| Portfolio Priority | A binary field indicating whether this deal is a top priority for this specific portfolio within Ad Hoc. All Top Priorities are by definition Portfolio Priorities. | Salesforce data export |
| 2026 Factored Revenue | An “expected value” revenue resulting from multiplying Ad Hoc TCV by pwin. For example, an opportunity with $4M Ad Hoc TCV and a 50% pwin has $2M in factored revenue. | Salesforce data export |
| Q1 2026 Revenue | Expected Ad Hoc revenue in Q1 2026, defined as 1/1/2026-3/31/26. It is calculated based on the opportunity’s Ad Hoc TCV and Project Start Date. For example, a project with $3,603,605 Ad Hoc TCV and a 1/5/2026 projected start date would have  | Salesforce data export |
| Q2 2026 Revenue | Expected revenue in Q2 2026, defined as 4/1/2026-6/30/26. | Salesforce data export |
| Q3 2026 Revenue | Expected revenue in Q3 2026, defined as 7/1/2026-9/30/26. | Salesforce data export |
| Q4 2026 Revenue | Expected revenue in Q4 2026, defined as 10/1/2026-12/31/26. | Salesforce data export |
| BD/Capture Lead | Name of the person in charge of capturing the opportunity. | Salesforce data export |
| BAP Stage | How far along our efforts to win the opportunity are. There are six possible stages: Identify \- We have identified that the opportunity exists and is of interest to Ad Hoc. Qualify \- We are determining whether Ad Hoc has the qualifications to credibly bid on the opportunity. Capture \- We are preparing to bid on the opportunity through actions such as learning more about the agency and influencing the procurement. Propose \- The opportunity solicitation is open, and we are writing our proposal. Awaiting Award \- We have submitted our proposal for the opportunity and are awaiting the government’s decision. Closed \- The opportunity has closed. This has several possible sub-statuses: Closed Won \- Ad Hoc bid on the opportunity and won Closed Lost \- Ad Hoc bid on the opportunity but it was awarded to another company Closed No-Bid \- Ad Hoc ultimately elected not to bid on the opportunity Closed Canceled \- The government withdrew the opportunity and made no awards | Salesforce data export |
| Closed | A binary variable indicating whether the opportunity is closed. 1 indicates that it is closed, 0 indicates that it is not. | Salesforce data export |
| Period of Performance (months) | The period of time during which the opportunity will produce revenue, if won. For example, an opportunity with an Ad Hoc TCV of $12,000,000, a Start Date of 6/1/2026, and a Period of Performance of 3 months will produce $12,000,000 of revenue between 6/1/2026 and 9/30/2026 and then stop producing revenue after that.  | Salesforce data export |
| Revenue Target | Ad Hoc’s revenue goal for FY 2026 (1/1/2026 \- 12/31/2026). | Hard-coded |

## **User Roles**

| Role | Capabilities |
| :---- | :---- |
| **Viewer** | Can explore scenarios |
| **Editor** | Can manage/refresh the underlying data source  |

## **App Description**

### **Interaction Overview**

* You should be able to come to the site and construct a path to the revenue goal by moving different opportunities in/out of won/lost.  
* Opportunities that are closed should automatically adopt the won/lost status specified in the BAP Stage field. Opportunities that are not closed should not.  
* Each time a user toggles an opportunity on or off, the page should recalculate, showing:  
  * What the “path” to the target looks like based on existing wins/losses in chronological order by Project Start Date  
  * A section indicating what additional win combinations would get Ad Hoc to the goal (e.g. “you can reach the goal by winning OPP X and OPP Y, or by winning OPP X, OPP A and OPP B.”) The different paths should be able to be filtered by:  
    * Pwin (i.e., only using high-probability opportunities, only using opportunities above a certain pwin)  
    * BAP stage (i.e., only using opportunities that are beyond a certain stage)  
    * BD/Capture lead (i.e., only using opportunities that are led by Dave, Phil, Jill, etc)  
    * Priority (i.e., only using opportunities that are a Top Priority or a Portfolio Priority)  
  * A graph of WHEN in FY2026 revenue would be realized, by quarter, in this scenario (i.e., do we realize revenue steadily over the year, or does 80% of our revenue happen in the last quarter of the year, etc)  
  * Ability to toggle non-closed opportunities to won/lost/pwin to visualize how that affects the path.  
  * Show: "If you win these projects, you hit $X (Y% of target)"  
* While constructing a scenario, the “bucket” of remaining opportunities to be added can be filtered by:  
  * Pwin (i.e., only using high-probability opportunities)  
  * BAP stage (i.e., only using opportunities that are beyond a certain stage)  
  * BD/Capture lead (i.e., only using opportunities that are led by Dave, Phil, Jill, etc)  
  * Priority (i.e., only using opportunities that are a Top Priority or a Portfolio Priority)  
* The user should be able to save and share a URL associated with a particular scenario.  
* Overall visuzlization is a treemap view (like the NYT electoral college win path maps) where the size of an opportunity represents Ad Hoc TCV and the opacity of an opportunity represents pwin 

## **Data Architecture**

### **Data Source Strategy**

The source of truth for project data resides in **Salesforce**. However, direct Salesforce API integration may not be feasible for v1 due to OAuth complexity and access constraints.

**Planned approach:**

1. **v1:** Export Salesforce data to a **Google Sheet** and use the Google Sheets API  
2. **Future:** Direct Salesforce API integration if/when access is available

To support this flexibility, the application will use a **repository pattern** to abstract data access.

```mermaid
flowchart TB
    A[Application Layer<br/>(UI, Scenario Logic, Calculations)]

    B[Data Repository Interface<br/>
    - getProjects(): Project[]<br/>
    - getProject(id): Project<br/>
    - updateProject(id, data): Project<br/>
    - getRevenueTarget(): number<br/>
    - setRevenueTarget(value): void]

    C[GoogleSheets Adapter<br/>
    - Uses Sheets API<br/>
    - Maps columns to Project]

    D[Salesforce Adapter<br/>
    - Uses SF API<br/>
    - Maps objects to Project]

    A --> B
    B --> C
    B --> D
```

### **Interface Definition**

```ts
interface Project {
  id: string;
  name: string;
  tcv: number;           // Total Contract Value in dollars
  pWin: number;          // Probability 0-100
  status: 'won' | 'likely' | 'uncertain' | 'lost';
  // Optional metadata
  owner?: string;
  closeDate?: Date;
  notes?: string;
}

interface DataRepository {
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  updateProject(id: string, data: Partial<Project>): Promise<Project>;
  getRevenueTarget(): Promise<number>;
  setRevenueTarget(value: number): Promise<void>;
  
  // For write-back support (may be read-only initially)
  readonly isReadOnly: boolean;
}
```

### **Google Sheets Adapter (v1 Implementation)**

**Expected Sheet Structure:**

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Account Name | Opportunity Name | Ad Hoc TCV | PWIN | Project Start Date | Top Priority | Portfolio Priority | 2026 Factored Revenue | Q1 2026 Revenue | Q2 2026 Revenue | Q3 2026 Revenue | Q4 2026 Revenue | BD/Capture Lead | BAP Stage | Closed | Period of Performance (months) |

**Implementation notes:**

* Sheet ID and range configurable via environment variables  
* Authentication via Google Service Account (server-side) or OAuth (client-side)  
* Polling interval configurable for refresh (default: 5 minutes)  
* Optional: webhook trigger on sheet changes via Apps Script

### **Salesforce Adapter (Future)**

**Field mapping:**

| Project Field | Salesforce Field |
| ----- | ----- |
| id | `Id` |
| name | `Name` |
| tcv | `Amount` |
| pWin | `Probability` (or custom field) |
| status | Derived from `StageName` |
| owner | `Owner.Name` |
| closeDate | `CloseDate` |

**Requirements:**

* Connected App setup in Salesforce  
* OAuth 2.0 flow implementation  
* Appropriate user permissions for Opportunity object access

### **Configuration**

```ts
interface DataSourceConfig {
  type: 'google-sheets' | 'salesforce';
  
  // Google Sheets specific
  googleSheets?: {
    spreadsheetId: string;
    range: string;
    apiKey?: string;           // for read-only public sheets
    serviceAccountKey?: string; // for server-side auth
  };
  
  // Salesforce specific (future)
  salesforce?: {
    instanceUrl: string;
    clientId: string;
    clientSecret: string;
  };
  
  refreshIntervalMs: number;
}
```
---

## **Non-Functional Requirements**

| Requirement | Target |
| :---- | :---- |
| **Responsive design** | Usable on desktop and tablet |
| **Performance** | Recalculations \< 100ms |
| **Authentication** | Email/password or SSO (TBD) |
| **Data freshness** | Configurable refresh interval |

---

## **Out of Scope (for v1)**

The following are explicitly deferred to future versions:

* Direct Salesforce integration (pending API access decision)  
* Historical scenario comparison  
* Mobile-native app

---

## **Open Questions**

The following items require input from stakeholders before finalizing the specification:

1. **Scenario sharing:** Should multiple users be able to save and share named scenarios?  
   1. Ideally, users would be able to generate a unique URL to their “path” but this is not a must-have for V1. This can be entirely encoded in URL parameters rather than happening on the server side.

2. **Multiple targets:** Is there a need for multiple revenue targets (e.g., "stretch goal" vs. "base goal")?  
   1. Not in V1.

3. **P(win) source:** Should P(win) be manually entered, or derived from a standard scale (e.g., mapped from Salesforce sales stage)?  
   1. Pwin will be derived from the database  
   2. In a future version we should consider letting users dynamically scale pwin up and down on different opportunities and see what happens. That is NOT in scope for V1.

4. **Google Sheets authentication:** Will the sheet be public (API key auth) or private (OAuth/service account required)?  
   1. Public

5. **Data freshness requirements:** Is near-real-time sync needed, or is periodic refresh (e.g., every 5 minutes) acceptable?  
   1. Periodic refresh is acceptable. Weekly is acceptable, daily is ideal. More frequent than daily is unnecessary.  
   2. The user should be able to trigger a MANUAL refresh at any time.

6. **Write-back behavior:** Should scenario changes (like marking a deal "won") persist back to the source system, or remain local to the app only?  
   1. Scenario changes should remain local in the app, and do not even need to persist across sessions other than potentially as a URL (see \#1).