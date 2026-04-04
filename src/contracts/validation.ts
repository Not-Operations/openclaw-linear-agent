import { z } from 'zod';

export const issueCreateSchema = z.object({
  teamId: z.string().min(1, 'teamId is required'),
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  assigneeId: z.string().min(1).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD').optional(),
  projectId: z.string().min(1).optional(),
  stateId: z.string().min(1).optional()
});

export const issueUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD').nullable().optional(),
  stateId: z.string().min(1).optional()
}).refine((value) => Object.values(value).some((v) => v !== undefined), {
  message: 'At least one field must be provided for issue update'
});

export const commentBodySchema = z.object({
  body: z.string().min(1, 'body is required')
});

export const issueRelationSchema = z.object({
  issueId: z.string().min(1, 'issueId is required'),
  relatedIssueId: z.string().min(1, 'relatedIssueId is required'),
  type: z.enum(['blocks', 'related'])
});

export const projectIssueListSchema = z.object({
  projectId: z.string().min(1).optional(),
  projectName: z.string().min(1).optional(),
  stateName: z.string().min(1).optional(),
  assigneeId: z.string().min(1).optional(),
  teamKey: z.string().min(1).optional(),
  dueDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}).refine((value) => !!value.projectId || !!value.projectName, {
  message: 'projectId or projectName is required'
});

export const projectCreateSchema = z.object({
  name: z.string().min(1, 'name is required'),
  teamIds: z.array(z.string().min(1)).optional(),
  leadId: z.string().min(1).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().optional()
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  leadId: z.string().min(1).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().optional()
}).refine((value) => Object.values(value).some((v) => v !== undefined), {
  message: 'At least one field must be provided for project update'
});

export const milestoneCreateSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const milestoneUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}).refine((value) => Object.values(value).some((v) => v !== undefined), {
  message: 'At least one field must be provided for milestone update'
});

export const issueMilestoneLinkSchema = z.object({
  projectMilestoneId: z.string().min(1, 'projectMilestoneId is required')
});

export function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code
  }));
}
