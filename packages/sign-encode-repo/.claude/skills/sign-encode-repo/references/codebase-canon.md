# Codebase canon — the four-document pattern

Reference for `sign-encode-repo`. Load before authoring (Step 6). The general sigil vocabulary is in
[`sign-spec.md`](sign-spec.md); this file covers only what is specific to encoding a *codebase*.

A codebase canon answers four questions an agent has on arriving at an unfamiliar repo:

| Question | Document | Type |
|---|---|---|
| What is this, and what is it *not*? | `<PREFIX>-OVERVIEW` | `ref` |
| How is it built? | `<PREFIX>-ARCH` | `std` |
| What does it depend on? | `<PREFIX>-DEPS` | `ref` |
| What rules bind changes to it? | `<PREFIX>-STANDARDS` | `std` |

Four is the pattern, not a floor to build on. Resist adding module-depth documents unattended —
they need a per-repo human signal. Flag candidacy instead (SKILL.md Step 10).

---

## 1. Layout

```
.agent/sign/
  canon.source.json                     identity: type, slug, displayName, owner, docPrefix
  src/                                  authored documents — the source of truth
    <PREFIX>-OVERVIEW.sign
    <PREFIX>-ARCH.sign
    <PREFIX>-DEPS.sign
    <PREFIX>-STANDARDS.sign
  dist/                                 compiled — generated, never hand-edited
    codebase.<slug>.index.sign          Layer 1
    codebase.<slug>.bundle.sign         Layer 2
    codebase.<slug>.bundle.sign.sha256
    codebase.<slug>.manifest.json
    codebase.<slug>.coverage.json
  imported/                             optional: ADRs converted via sign-ingest
    _reports/                           per-conversion drop + provenance reports
```

`src/` is edited by humans and by this skill. `dist/` is output — regenerate it, never patch it.

---

## 2. Provenance law

This is the load-bearing rule of the whole pattern. A machine-drafted document must not read as
human-ratified content.

| Content | Provenance | Why |
|---|---|---|
| `@edges` from build manifests | `type:asserted, src:<manifest-kind>` | mechanically verifiable against source |
| `@def`, `@rules`, `@boundary`, `@props` | inferred, `src:llm-extraction` | an LLM's reading of the code |
| `@constraints` | inferred, `src:llm-extraction` | highest risk — these get *enforced* |
| `@status` known-gaps | inferred | machine-observed |
| `@vocab`, `@cycle`, `@reviewed` | unchanged | metadata, not claims about the code |

Two mechanisms, both required:

**Document level.** Every machine-drafted document carries the landing-status token in its `@doc`
bag:

```
@doc ORD-ARCH [std, active, agents+employees, machine-drafted] v1
```

The token is cleared only by a human landing pass. This skill never clears it.

**Block level.** Where a prose block's provenance is worth stating inline, use the property bag:

```
@def architecture [type:inferred, src:llm-extraction]
```

**If provenance cannot be determined, default to inferred. Never to asserted.** There is no
situation in which guessing upward is the safer error.

---

## 3. `@anchor` — binding documents to source

`@anchor` binds a document to the paths it governs. That makes coverage measurable and drift
detectable, and lets an agent resolve a file path to its governing document from the Layer 1 index
alone — before retrieving anything.

```
@anchor [repo:<repo-name>, vcs:git]
  + <include glob>
  ! <exclude glob>
```

**ARCH** — the source projects:

```
@anchor [repo:order-service, vcs:git]
  + src/OrderService.*/**
  ! **/*.Tests/**
  ! **/bin/**
  ! **/obj/**
```

**DEPS** — its actual source of truth, marked generated:

```
@anchor [repo:order-service, vcs:git, generated-from:csproj]
  + **/*.csproj
```

**OVERVIEW** — the entrypoints and config it describes:

```
@anchor [repo:order-service, vcs:git]
  + src/OrderService.Api/**
  + infrastructure/**
  + config/**
  + README.md
```

**STANDARDS — no spatial anchor, ever.** Its scope is "every source file in the repo." Anchoring it
would make coverage meaningless and flood the Layer 1 index. Its drift is tracked through `@links`
to the shared standards it defers to, not through file coverage.

Adding `@anchor` to an existing document widens coverage. That is additive and **non-breaking** — a
minor bump with a changelog note, no dependent re-validation.

`generated-from:` is a proposed property-bag key, not yet ratified. The bag is open per the
whitepaper, so it parses; flag it as provisional when it matters.

---

## 4. Layer 1 index

Always injected into agent context, so every token is rent. Per document: `@doc`, `@links`, a
compact `@anchor` where it earns its place, and one `##` summary line.

```
@canon v1.0 sha:db8b5d

@doc ORD-ARCH [std, active, agents+employees, machine-drafted] v1
@links ORD-OVERVIEW,ORD-DEPS,ORD-STANDARDS
@anchor src/OrderService.*/**
## Order service architecture — 2 projects (Core + Api), dispatch-only controllers, Core owns pricing and validation; IInventoryClient is a port with an HTTP-backed adapter.
```

Compact `@anchor` in Layer 1: **ARCH and DEPS only.** OVERVIEW optional, and only for distinctive
entrypoint paths. STANDARDS never.

The `##` line is the single highest-leverage string in the canon — often the only thing an agent
reads before deciding what to fetch. Write it as a dense, specific claim about *this* repo. "Handles
architecture" is worthless; name the projects, the pattern, and the one thing that surprises people.

Budget: the index for a four-document repo lands around 115–140 tokens. Anchor additions must stay
within +25% of the pre-anchor count.

Scaling limit: the Layer 1 index holds to roughly 200 documents before it exceeds typical injection
budgets. A single repo's four documents are nowhere near it; a registry aggregating many repos is.

---

## 5. Cross-repo edges

Emit cross-repo targets in registry-resolvable ID form so a resolver can light them up later
without rewriting every DEPS document:

```
repo:order-service consumes codebase.inventory-api#INV-OVERVIEW [via:http, when:runtime, type:asserted, src:program-cs]
```

Form is `codebase.<slug>#<DOC-ID>`. A repo that is not an enrolled canon source stays a bare
`repo:<name>` string until it is registered — do not invent an ID for it.

Emit **target format only**. Do not attempt resolution; that is registry-side platform work.

A cross-repo edge is `type:asserted` only when a specific file grounds it (an HTTP client
registration, a service binding). Ground it in `src:` or mark it inferred.

---

## 6. Contradiction check

Once anchored, a document's claims can be checked against the code it bound to.

**Blocking.** Never emit a bundle whose mechanically-asserted `@edges` contradict its own inferred
`@constraints`.

- *Dependency-inward invariant.* ARCH typically asserts something like
  `requires: <Api> references inward to <Core> only`. Validate every module's reference set against
  it using the extracted edge list.
- *Leaf claims.* "Depends on nothing internal" → the manifest must have zero internal references.

**Report-only.** Anything not reducible to a manifest or file-presence check. "Controllers are
dispatch-only" is detectable as *which modules contain controllers*, never as whether those
controllers contain logic. Report with confidence; do not gate on it.

Output is a report, not a canon mutation. A violation is a finding about the code — surface it,
never resolve it by weakening the constraint.

---

## 7. Coverage

- **Denominator.** Tracked files matching source and config globs — source extensions, build
  manifests, `config/**`, `infrastructure/**`, `README.md`, ADRs — minus tests, build output
  (`bin`, `obj`, `dist`, `target`, `node_modules`, `vendor`), vendored, and generated code.
- **Numerator.** Files matched by at least one descriptive document's `@anchor` includes, minus its
  excludes. **STANDARDS is excluded from the numerator.**
- **Split.** Report total, asserted, and inferred separately.

```json
{
  "sourceId": "codebase.order-service",
  "denominator": 46,
  "governed": { "total": 46, "asserted": 0, "inferred": 46 },
  "coveragePct": { "total": 100.0, "asserted": 0.0, "inferred": 100.0 },
  "candidacy": {
    "consumesTargets": ["codebase.inventory-api#INV-OVERVIEW"],
    "securityModules": []
  },
  "notes": "Denominator convention is provisional; confirm before publishing externally."
}
```

A freshly encoded repo reads **"100% under governance, 0% human-ratified."** That is the truthful
headline and the one that survives an audit. Never collapse the split into a single number.

---

## 8. Review cadence

Drive `@reviewed` off the last meaningful git activity for the anchored paths:

```bash
git log -1 --format=%ad --date=short -- <anchored paths>
```

Do not stamp a uniform build date. If every repo carries the same `@reviewed`, every DEPS document
comes due the same day and the review-due signal points at nothing. Where a real per-repo date is
unavailable, stagger the seed rather than stamping identically.

Defaults: `@cycle 30d` for DEPS (dependencies move fastest), `90d` for OVERVIEW, ARCH, and
STANDARDS.

---

## 9. Quality bar

The difference between a canon that saves an agent from reading the tree and one that wastes
context:

- **`@boundary` must say what the repo does *not* own,** naming where that responsibility actually
  lives. `! not-owns | report rendering -> reporting-service` is navigable. A boundary listing only
  `owns` entries has not drawn a boundary.
- **`@status` records what is actually true now,** including embarrassing parts — "order store is
  in-memory (POC), not durable across restarts." An agent that doesn't know this writes code that
  assumes durability. Known gaps are the highest-value content in the canon.
- **STANDARDS carries deltas only.** Reference shared standards by ID. A STANDARDS document that
  restates general good practice is noise that will drift out of date.
- **`@rules` are imperative and independently actionable.** "Reject an order whose total exceeds the customer's credit limit with
  `402` rather than queuing it" is a rule. "Routing should be
  careful" is not.
- **`@props` entries name the thing and state its job in one line.** They are a map, not prose.
- **Specific beats complete.** Four sharp documents beat twelve hedged ones.
