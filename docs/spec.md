# **Revenue Path Planner – Lightweight Specification**

**Version:** 0.2 (Revised for alignment with Visual Specification)

**Last Updated:** December 16, 2025

**Status:** Revised to remove ambiguity and align with approved visualization


## **Overview**

A single-page, static web application with no server-side components that helps sales and finance teams at Ad Hoc visualize and explore different **paths** for reaching a revenue target based on their pipeline of projects. The application uses **contract value, win probability, and start date** to enumerate and compare possible outcome scenarios.

The application is modeled **explicitly** on the New York Times “Paths to Victory” visualizations (2012–2020), adapted to the revenue domain. The goal is **structural fidelity** to that model: a flowing, branching decision tree with enumerable paths — not merely visual inspiration.

The application draws on an export of data from Ad Hoc’s Salesforce pipeline, via a .csv file placed in the /public/data directory. **Users cannot modify source data.** All scenario exploration is local, ephemeral, and optionally encoded in the URL.

## **Reference Images**

![Example showing branching and aggregation of terminal outcomes](https://static01.nyt.com/images/2016/09/19/upshot/2012-paths-to-victory-1474301667379/2012-paths-to-victory-1474301667379-facebookJumbo.png)

![Example emphasizing aggregation of total paths per outcome](https://media.opennews.org/cache/63/7b/637b1bfd90c0e9ca9d86fc1a60d83293.png)


## **Visual Analogy: Branching Outcome Layout (Authoritative)**

The visualization uses a **flowing branching decision tree**, in which:

1. Each horizontal layer represents a single opportunity being resolved

2. Each branch represents a **binary outcome** (Win or Loss)

3. Each root-to-leaf path represents one fully specified scenario

4. Terminal leaves represent success or failure against a fixed revenue target

**Clarification:** This is a _decision tree_, not a treemap. Rectangular area-based treemaps are explicitly out of scope.


## **How the Election Analogy Maps to the Revenue Domain**

| Election Analogy | Revenue Domain (Authoritative)                 |
| ---------------- | ---------------------------------------------- |
| State            | Opportunity                                    |
| State called     | Opportunity resolved                           |
| Electoral votes  | Ad Hoc TCV (used in revenue accumulation only) |
| Polling odds     | PWIN (probability weight only)                 |
| Win/Loss branch  | Win/Loss of opportunity                        |
| Path to 270      | Path to revenue target                         |
| Number of paths  | Number of valid scenario combinations          |

**Clarification:** PWIN never creates an additional branch. Each opportunity always branches into **exactly two outcomes**: Win or Loss. PWIN affects probability mass, opacity, and path thickness only.


## **Authoritative Structural Model**

The visualization is a **directed acyclic tree** with the following properties:

1. Each decision node corresponds to one opportunity

2. Each node has exactly two children: Win and Loss

3. All root-to-leaf paths are valid and enumerable

4. Some paths may terminate early if the revenue target is met

This structure is required to support correct path counting and aggregation.


## **Key Concepts and Data Dictionary**

| Term                  | Definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Source            |
| ---------------- | --------------- | -------------- |
| Account Name          | Federal agency or organization                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Salesforce export |
| Opportunity Name      | A potential deal in the pipeline                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Salesforce export |
| Ad Hoc TCV            | Revenue realized if won                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Salesforce export |
| PWIN                  | Probability of winning (0–100%)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Salesforce export |
| Project Start Date    | Expected revenue start date                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Salesforce export |
| Top Priority          | Binary priority flag                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Salesforce export |
| Portfolio Priority    | Portfolio-level priority flag                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Salesforce export |
| 2026 Factored Revenue | TCV × PWIN                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Salesforce export |
| Q1–Q4 2026 Revenue    | Quarterly revenue realization                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Salesforce export |
| BD/Capture Lead       | Opportunity owner                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Salesforce export |
| BAP Stage             | How far along our efforts to win the opportunity are. There are six possible stages:1. Identify - We have identified that the opportunity exists and is of interest to Ad Hoc.2. Qualify - We are determining whether Ad Hoc has the qualifications to credibly bid on the opportunity.3. Capture - We are preparing to bid on the opportunity through actions such as learning more about the agency and influencing the procurement.4. Propose - The opportunity solicitation is open, and we are writing our proposal.5. Awaiting Award - We have submitted our proposal for the opportunity and are awaiting the government’s decision.6. Closed - The opportunity has closed. This has several possible sub-statuses: Closed Won - Ad Hoc bid on the opportunity and won; Closed Lost - Ad Hoc bid on the opportunity but it was awarded to another company; Closed No-Bid - Ad Hoc ultimately elected not to bid on the opportunity; Closed Canceled - The government withdrew the opportunity and made no awards | Salesforce export |
| Closed                | Opportunity closed flag                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Salesforce export |
| Period of Performance | Revenue duration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Salesforce export |
| Revenue Target        | FY 2026 revenue goal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Hard-coded        |


## **Interaction Overview**

1. Users explore paths to the revenue target by **forcing opportunities to Win or Loss**.

2. Closed opportunities automatically adopt their won/lost state based on BAP Stage.

3. Non-closed opportunities are binary at decision time (Win or Loss only).

4. PWIN is **never toggled** and never treated as a third outcome.

Each interaction triggers recalculation of:

1. The paths-to-target decision tree (ordered by Project Start Date)

2. The number of ways to hit or miss the target

3. Aggregated path summaries (optional text views)

4. Revenue timing by quarter

**Clarification:** Scenario interactions never mutate underlying data. They exist only in client state and (optionally) URL parameters.


## **Visualization Semantics**

1. **Branch color:** Win (positive) vs Loss (negative)

2. **Path thickness:** Probability mass (product of PWINs along the path)

3. **Path opacity:** Per-opportunity PWIN

4. **Vertical position:** Decision order (earliest first)

**Clarification:** TCV does not directly control visual thickness or area. It contributes only to cumulative revenue calculations and terminal success.


## **Interaction Model (Authoritative)**

1. **Hover:** Highlight a complete path to root; fade unrelated paths

2. **Hit-testing:** Thin paths must be hoverable via Voronoi or equivalent

3. **Click:** Visual selection only

4. **Double-click:** Lock the first unresolved opportunity on that path

5. **Transitions:** Animated reflow; modifier key slows animation

**Clarification:** NYT interaction patterns are intentionally replicated where specified. Only NYT-specific domain semantics are excluded.


## **Data Architecture**

### **Data Source Strategy**

1. **v1:** CSV (read-only, .gitignore-ed to protect sensitive data)

2. **Future:** Salesforce API

A repository pattern abstracts the data source.

**Clarification:** Repository write methods are not used by the visualization logic in v1.


## **Scenario State & Sharing**

1. Scenario state is local and ephemeral

2. State may be encoded entirely in the URL

3. No server-side persistence or write-back


## **Non-Goals**

1. No forecasting guarantees

2. No optimization or ranking

3. No mutation of source data

This is an **exploratory reasoning tool**, not a decision engine.


## **One-Sentence Build Directive**

Build a flowing, ribbon-based **binary decision tree** that enumerates all possible outcome paths through a set of revenue opportunities, using color for direction, thickness for probability mass, opacity for confidence, and animated interaction to let users explore how sequential wins and losses accumulate into success or failure against a fixed revenue target.
