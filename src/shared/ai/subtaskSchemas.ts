import { z } from 'zod'

/** Single AI-proposed subtask row (preview before human confirm). */
export const aiSubtaskProposalSchema = z.object({
  title: z.string().trim().min(1).max(200),
  suggestedAssigneeUserId: z.string().min(1).optional(),
  suggestedEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  rationale: z.string().max(500).optional()
})

export const aiSubtaskProposalListSchema = z.array(aiSubtaskProposalSchema).max(20)

/** LLM JSON envelope: `{ "subtasks": [...] }` */
export const aiSubtaskLlmResponseSchema = z.object({
  subtasks: aiSubtaskProposalListSchema
})

export type AiSubtaskProposal = z.infer<typeof aiSubtaskProposalSchema>

export type AiProposeSubtasksErrorCode =
  | 'ai_disabled'
  | 'no_api_key'
  | 'external_failed'
  | 'parse_failed'
  | 'task_not_found'

export interface AiProposeSubtasksInput {
  groupId: string
  parentTaskId: string
}

export interface AiProposeSubtasksResult {
  proposals: AiSubtaskProposal[]
  usedExternalAi: boolean
  errorCode?: AiProposeSubtasksErrorCode
}

export interface AiConfirmSubtaskItem {
  title: string
  assigneeUserId?: string
  endDate?: string
}

export interface AiConfirmSubtasksInput {
  groupId: string
  parentTaskId: string
  items: AiConfirmSubtaskItem[]
}

export interface AiConfirmSubtasksResult {
  createdTaskIds: string[]
}

/** Parse and validate LLM JSON text into proposals. */
export function parseAiSubtaskLlmJson(text: string): AiSubtaskProposal[] {
  const trimmed = text.trim()
  const jsonStart = trimmed.indexOf('{')
  const jsonEnd = trimmed.lastIndexOf('}')
  const slice =
    jsonStart >= 0 && jsonEnd > jsonStart ? trimmed.slice(jsonStart, jsonEnd + 1) : trimmed
  const raw = JSON.parse(slice) as unknown
  const parsed = aiSubtaskLlmResponseSchema.parse(raw)
  return parsed.subtasks
}
