import { z } from 'zod';

export const postChatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  profileId: z.string().uuid('Invalid profile ID format').optional(),
  sessionId: z.string().uuid('Invalid session ID format').optional(),
  useVectorSearch: z.boolean().optional(),
});

export const createSessionSchema = z.object({
  profileId: z.string().uuid('Invalid profile ID format'),
  title: z.string().min(1).max(200).optional(),
});

export const renameSessionSchema = z.object({
  title: z.string().min(1).max(200),
});

export const listSessionsQuerySchema = z.object({
  profileId: z.string().uuid('Invalid profile ID format').optional(),
});

export type PostChatDto = z.infer<typeof postChatSchema>;
export type CreateSessionDto = z.infer<typeof createSessionSchema>;
export type RenameSessionDto = z.infer<typeof renameSessionSchema>;
export type ListSessionsQueryDto = z.infer<typeof listSessionsQuerySchema>;
