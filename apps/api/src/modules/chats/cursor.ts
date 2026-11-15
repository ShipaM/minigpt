import { z } from 'zod';

const CursorSchema = z.object({ updatedAt: z.iso.datetime(), id: z.uuid() });

export type ChatCursor = z.infer<typeof CursorSchema>;

//The cursor is "where the previous page ended": the sort key of its last chat. To the client it is an opaque
//string. It carries no secrets (it is not signed), so the server validates it like any other input.
export function encodeCursor(cursor: ChatCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

// Returns null for anything that is not a cursor created by encodeCursor.
export function decodeCursor(raw: string): ChatCursor | null {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    return null; // not JSON: just "not a cursor"
  }

  const parsed = CursorSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
}
