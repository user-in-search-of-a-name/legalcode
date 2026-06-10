import { LegalCode } from "@opencode-ai/core/legalcode"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { InvalidRequestError, ServiceUnavailableError } from "../errors"

export const LegalCodeCapabilities = Schema.Struct({
  primaryCustomer: Schema.Literal("us_solo_litigator"),
  posture: Schema.Literal("human_in_the_loop_supervised_automation"),
  deployment: Schema.Literal("local_first_cloud_sync"),
  agentRoles: Schema.Array(LegalCode.AgentRole),
  artifactTypes: Schema.Array(LegalCode.ArtifactType),
  workspaceProviders: Schema.Array(LegalCode.WorkspaceProvider),
  reliabilityGates: Schema.Array(Schema.String),
}).annotate({ identifier: "LegalCodeCapabilities" })

const WorkspaceConnectionListQuery = Schema.Struct({
  matterID: LegalCode.MatterID.pipe(Schema.optional),
  provider: LegalCode.WorkspaceProvider.pipe(Schema.optional),
})

const WorkspaceMatterProviderQuery = Schema.Struct({
  matterID: LegalCode.MatterID,
  provider: LegalCode.WorkspaceProvider.pipe(Schema.optional),
})

const WorkspaceTokenVaultListQuery = Schema.Struct({
  provider: LegalCode.WorkspaceProvider.pipe(Schema.optional),
})

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
  .add(
    HttpApiEndpoint.post("legalcode.workspace.oauth.authorize", "/api/legalcode/workspace/oauth/authorize", {
      payload: LegalCode.WorkspaceOAuthAuthorizeRequest,
      success: Schema.Struct({ data: LegalCode.WorkspaceOAuthAuthorizeResponse }),
      error: InvalidRequestError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.legalcode.workspace.oauth.authorize",
        summary: "Create workspace OAuth authorization URL",
        description: "Build a Google Workspace or Microsoft 365 authorization URL for the desktop connection flow.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("legalcode.workspace.connection.create", "/api/legalcode/workspace/connections", {
      payload: LegalCode.WorkspaceConnectionCreate,
      success: Schema.Struct({ data: LegalCode.WorkspaceConnection }),
      error: InvalidRequestError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.legalcode.workspace.connection.create",
        summary: "Create workspace connection",
        description: "Persist a Google Workspace or Microsoft 365 connection record with a token-vault reference.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.get("legalcode.workspace.connection.list", "/api/legalcode/workspace/connections", {
      query: WorkspaceConnectionListQuery,
      success: Schema.Struct({ data: Schema.Array(LegalCode.WorkspaceConnection) }),
      error: InvalidRequestError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.legalcode.workspace.connection.list",
        summary: "List workspace connections",
        description: "List persisted Google Workspace and Microsoft 365 connection records.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("legalcode.workspace.artifact.link", "/api/legalcode/workspace/artifacts", {
      payload: LegalCode.ExternalArtifactLink,
      success: Schema.Struct({ data: LegalCode.ExternalArtifact }),
      error: InvalidRequestError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.legalcode.workspace.artifact.link",
        summary: "Link external workspace artifact",
        description: "Bind an external Google Workspace or Microsoft 365 file to a LegalCode matter.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.get("legalcode.workspace.artifact.list", "/api/legalcode/workspace/artifacts", {
      query: WorkspaceMatterProviderQuery,
      success: Schema.Struct({ data: Schema.Array(LegalCode.ExternalArtifact) }),
      error: InvalidRequestError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.legalcode.workspace.artifact.list",
        summary: "List external workspace artifacts",
        description: "List external Google Workspace and Microsoft 365 files linked to a LegalCode matter.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.get("legalcode.workspace.operation.list", "/api/legalcode/workspace/operations", {
      query: WorkspaceMatterProviderQuery,
      success: Schema.Struct({ data: Schema.Array(LegalCode.WorkspaceOperation) }),
      error: InvalidRequestError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.legalcode.workspace.operation.list",
        summary: "List workspace operations",
        description: "List recorded Google Workspace and Microsoft 365 read/write/edit operation history for a matter.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("legalcode.workspace.oauth.token", "/api/legalcode/workspace/oauth/token", {
      payload: LegalCode.WorkspaceOAuthTokenRequest,
      success: Schema.Struct({ data: LegalCode.WorkspaceOAuthTokenResponse }),
      error: [InvalidRequestError, ServiceUnavailableError],
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.legalcode.workspace.oauth.token",
        summary: "Exchange workspace OAuth code",
        description:
          "Exchange an authorization code for Google Workspace or Microsoft 365 tokens. The desktop token vault should store returned secrets.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("legalcode.workspace.token.store", "/api/legalcode/workspace/tokens", {
      payload: LegalCode.WorkspaceTokenVaultStore,
      success: Schema.Struct({ data: LegalCode.WorkspaceTokenVaultInfo }),
      error: InvalidRequestError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.legalcode.workspace.token.store",
        summary: "Store workspace token",
        description: "Encrypt and store Google Workspace or Microsoft 365 OAuth tokens in the local LegalCode token vault.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.get("legalcode.workspace.token.list", "/api/legalcode/workspace/tokens", {
      query: WorkspaceTokenVaultListQuery,
      success: Schema.Struct({ data: Schema.Array(LegalCode.WorkspaceTokenVaultInfo) }),
      error: InvalidRequestError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.legalcode.workspace.token.list",
        summary: "List workspace token references",
        description: "List redacted token-vault metadata without returning provider tokens.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.delete("legalcode.workspace.token.remove", "/api/legalcode/workspace/tokens/:ref", {
      params: { ref: LegalCode.WorkspaceTokenVaultRef },
      success: Schema.Struct({ ok: Schema.Boolean }),
      error: InvalidRequestError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.legalcode.workspace.token.remove",
        summary: "Remove workspace token",
        description: "Delete an encrypted Google Workspace or Microsoft 365 token-vault entry.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("legalcode.workspace.execute", "/api/legalcode/workspace/execute", {
      payload: LegalCode.WorkspaceExecuteRequest,
      success: Schema.Struct({ data: LegalCode.WorkspaceExecuteResponse }),
      error: [InvalidRequestError, ServiceUnavailableError],
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.legalcode.workspace.execute",
        summary: "Execute workspace operation",
        description:
          "Execute or dry-run a matter-scoped Google Workspace or Microsoft 365 read/write/edit operation with approval and audit gates.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("legalcode.workspace.execute.withVault", "/api/legalcode/workspace/execute-with-vault", {
      payload: LegalCode.WorkspaceExecuteWithVaultRequest,
      success: Schema.Struct({ data: LegalCode.WorkspaceExecuteResponse }),
      error: [InvalidRequestError, ServiceUnavailableError],
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.legalcode.workspace.execute.withVault",
        summary: "Execute workspace operation with token vault",
        description:
          "Execute or dry-run a matter-scoped Google Workspace or Microsoft 365 operation by resolving the bearer token from the encrypted local vault.",
      }),
    ),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "legalcode",
      description: "LegalCode litigation coworker and trust-layer metadata.",
    }),
  )
