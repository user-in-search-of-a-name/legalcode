import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Api } from "../api"

const agentRoles = [
  "case_strategist",
  "research_clerk",
  "drafting_clerk",
  "discovery_analyst",
  "citation_checker",
  "deadline_clerk",
  "evidence_chronologist",
  "settlement_analyst",
  "filing_assistant",
] as const

const artifactTypes = [
  "document",
  "sheet",
  "uploaded_file",
  "pleading",
  "evidence",
  "research",
  "agent_output",
  "note",
] as const

const reliabilityGates = [
  "No filing-ready output without humanApproval: approved.",
  "No verified legal citation without at least one source span.",
  "No deadline may move beyond proposed/partially verified without a rule, triggering event, date, service method, and lawyer approval.",
  "No agent action may omit context artifacts/sources from its provenance record.",
]

const jurisdictions = [
  {
    jurisdiction: "us",
    name: "US Litigation",
    status: "active",
    citationFormats: [
      "Bluebook case citations with court and year",
      "Federal Rules of Civil Procedure as Fed. R. Civ. P. <rule>",
      "Federal Rules of Evidence as Fed. R. Evid. <rule>",
      "Local rules by court-specific abbreviation when available",
    ],
    pleadingTemplates: [
      "complaint",
      "answer",
      "motion",
      "memorandum of law",
      "declaration",
      "proposed order",
      "certificate of service",
      "demand letter",
    ],
    deadlineRules: [
      "Do not calculate a deadline without forum, triggering event, service method, and source rule/order.",
      "Mark all extracted dates as proposed until lawyer-verified.",
      "Flag weekends, court holidays, local rules, and ECF-specific cutoffs as verification requirements.",
    ],
    filingChecklist: [
      "Caption",
      "Court and case number",
      "Party names",
      "Signature block",
      "Certificate of service",
      "Exhibits",
      "Declarations",
      "Proposed order when required",
      "Citation verification",
      "Deadline verification",
      "Human approval",
    ],
    researchSourcePreferences: [
      "Provided case files and orders",
      "Official court rules and local rules",
      "Official statutes and regulations",
      "Court opinions from official or reliable sources",
      "Secondary sources only as research leads",
    ],
  },
  {
    jurisdiction: "india",
    name: "India Litigation",
    status: "planned",
    citationFormats: [
      "SCC citations when available",
      "AIR citations when available",
      "Neutral citations when available",
      "Court and year must be included when citation certainty is incomplete",
    ],
    pleadingTemplates: [
      "plaint",
      "written statement",
      "interlocutory application",
      "affidavit",
      "vakalatnama checklist",
      "notice",
      "petition",
    ],
    deadlineRules: [
      "Do not calculate limitation or procedural deadlines without forum, statute/rule, triggering event, and date.",
      "Mark all extracted dates as proposed until lawyer-verified.",
      "Flag court vacations, registry defects, limitation extensions, and local practice as verification requirements.",
    ],
    filingChecklist: [
      "Cause title",
      "Court/forum",
      "Party details",
      "Jurisdiction facts",
      "Valuation and court fee assumptions",
      "Affidavit/verifications",
      "Annexures",
      "Vakalatnama/authorization",
      "Citation verification",
      "Limitation verification",
      "Human approval",
    ],
    researchSourcePreferences: [
      "Provided matter documents",
      "Official statutes, rules, and court websites",
      "Supreme Court and High Court judgments from reliable sources",
      "Tribunal materials where relevant",
      "Secondary sources only as research leads",
    ],
  },
] as const

export const LegalCodeHandler = HttpApiBuilder.group(Api, "server.legalcode", (handlers) =>
  handlers
    .handle("legalcode.capabilities", () =>
      Effect.succeed({
        data: {
          primaryCustomer: "us_solo_litigator" as const,
          posture: "human_in_the_loop_supervised_automation" as const,
          deployment: "local_first_cloud_sync" as const,
          agentRoles: [...agentRoles],
          artifactTypes: [...artifactTypes],
          reliabilityGates,
        },
      }),
    )
    .handle("legalcode.jurisdictions", () => Effect.succeed({ data: [...jurisdictions] })),
)
