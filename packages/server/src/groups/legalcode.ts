import { LegalCode } from "@opencode-ai/core/legalcode"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"

export const LegalCodeCapabilities = Schema.Struct({
  primaryCustomer: Schema.Literal("us_solo_litigator"),
  posture: Schema.Literal("human_in_the_loop_supervised_automation"),
  deployment: Schema.Literal("local_first_cloud_sync"),
  agentRoles: Schema.Array(LegalCode.AgentRole),
  artifactTypes: Schema.Array(LegalCode.ArtifactType),
  workspaceProviders: Schema.Array(LegalCode.WorkspaceProvider),
  reliabilityGates: Schema.Array(Schema.String),
}).annotate({ identifier: "LegalCodeCapabilities" })

export const LegalCodeGroup = HttpApiGroup.make("server.legalcode")
  .add(
    HttpApiEndpoint.get("legalcode.capabilities", "/api/legalcode/capabilities", {
      success: Schema.Struct({ data: LegalCodeCapabilities }),
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.legalcode.capabilities",
        summary: "Get LegalCode capabilities",
        description: "Describe the active LegalCode product posture, roles, artifact types, and reliability gates.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.get("legalcode.jurisdictions", "/api/legalcode/jurisdictions", {
      success: Schema.Struct({ data: Schema.Array(LegalCode.JurisdictionPack) }),
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.legalcode.jurisdictions",
        summary: "List LegalCode jurisdiction packs",
        description: "List active and planned litigation jurisdiction packs.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.get("legalcode.workspace-integrations", "/api/legalcode/workspace-integrations", {
      success: Schema.Struct({
        data: Schema.Struct({
          profiles: Schema.Array(LegalCode.WorkspaceIntegrationProfile),
          operationPlans: Schema.Array(LegalCode.WorkspaceOperationPlan),
        }),
      }),
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.legalcode.workspace-integrations",
        summary: "List workspace integrations",
        description:
          "Describe Google Workspace and Microsoft 365 read/write/edit capabilities, OAuth scopes, and legal reliability controls.",
      }),
    ),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "legalcode",
      description: "LegalCode litigation coworker and trust-layer metadata.",
    }),
  )
