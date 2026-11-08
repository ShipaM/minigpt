import { z } from 'zod';

/** The single error format of the API. The frontend parses only this. */
export const ErrorResponseSchema = z.object({
  statusCode: z.number().int().min(400).max(599),
  error: z.string(),
  message: z.string(),
  /** Validation problems, if any (one string per field). */
  details: z.array(z.string()).optional(),
  path: z.string(),
  timestamp: z.iso.datetime(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
