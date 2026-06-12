import type { LegalCode } from "@opencode-ai/core/legalcode"
import type { ServerConnection } from "@/context/server"
import { authTokenFromCredentials } from "@/utils/server"

type FetchLike = typeof fetch

type ClientInput = {
  server: ServerConnection.HttpBase
  fetch?: FetchLike
}

type ApiResponse<Data> = {
  data: Data
}

export type LegalCodeSourceIntegrationSnapshot = {
  profiles: LegalCode.LegalDataSourceProfile[]
  sourceRegistry: LegalCode.SourceRegistryPolicy
  computerUse: LegalCode.ComputerUsePolicy
}

export type LegalCodeWorkspaceIntegrationSnapshot = {
  profiles: LegalCode.WorkspaceIntegrationProfile[]
  operationPlans: LegalCode.WorkspaceOperationPlan[]
}

export type LegalCodeMatterOSSnapshot = {
  roadmap: LegalCode.ProductReliabilityRoadmap
  sources: LegalCodeSourceIntegrationSnapshot
  memory: LegalCode.MemoryPolicy
  jurisdictions: LegalCode.JurisdictionPack[]
  workspace: LegalCodeWorkspaceIntegrationSnapshot
}

export function createLegalCodeMatterOSClient(input: ClientInput) {
  const request = createRequester(input)
  const roadmap = () => request<LegalCode.ProductReliabilityRoadmap>("/api/legalcode/product-roadmap")
  const sources = () => request<LegalCodeSourceIntegrationSnapshot>("/api/legalcode/source-integrations")
  const memory = () => request<LegalCode.MemoryPolicy>("/api/legalcode/memory-integrations")
  const jurisdictions = () => request<LegalCode.JurisdictionPack[]>("/api/legalcode/jurisdictions")
  const workspace = () => request<LegalCodeWorkspaceIntegrationSnapshot>("/api/legalcode/workspace-integrations")
  return {
    roadmap,
    sources,
    memory,
    jurisdictions,
    workspace,
    snapshot() {
      return Promise.all([roadmap(), sources(), memory(), jurisdictions(), workspace()]).then(([a, b, c, d, e]) => ({
        roadmap: a,
        sources: b,
        memory: c,
        jurisdictions: d,
        workspace: e,
      }))
    },
  }
}

function createRequester(input: ClientInput) {
  const fetchFn = input.fetch ?? fetch
  return async function request<Data>(path: string): Promise<Data> {
    const response = await fetchFn(new URL(path, input.server.url).toString(), {
      headers: authHeader(input.server),
    })
    const json = await response.json().catch(() => undefined)
    if (!response.ok) {
      throw new Error(errorMessage(json) ?? `LegalCode Matter OS request failed with HTTP ${response.status}`)
    }
    return (json as ApiResponse<Data>).data
  }
}

function authHeader(server: ServerConnection.HttpBase): Record<string, string> {
  if (!server.password) return {}
  return {
    Authorization: `Basic ${authTokenFromCredentials({ username: server.username, password: server.password })}`,
  }
}

function errorMessage(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return
  const record = value as Record<string, unknown>
  if (typeof record.message === "string") return record.message
  const error = record.error
  if (error && typeof error === "object" && typeof (error as Record<string, unknown>).message === "string") {
    return (error as Record<string, string>).message
  }
}
