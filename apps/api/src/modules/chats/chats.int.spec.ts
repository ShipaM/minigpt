import {
  ChatListResponseSchema,
  ChatResponseSchema,
  ErrorResponseSchema,
  MessageListResponseSchema,
  SendMessageResponseSchema,
  type AuthResponse,
} from '@minigpt/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LlmProvider } from './llm/llm-provider.ts';
import { startTestApp, stopTestApp, type TestApp } from '../../test/test-app.ts';
import { callApi, registerUser } from '../../test/test-client.ts';

describe('Chats API (integration, real Postgres)', () => {
  let t: TestApp;
  let alice: AuthResponse;
  let bob: AuthResponse;
  const call = (
    as: AuthResponse | null,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ) => callApi(t.baseUrl, method, path, as?.accessToken, body);

  const createChat = async (as: AuthResponse, title?: string) =>
    ChatResponseSchema.parse(
      await (await call(as, 'POST', '/chats', title ? { title } : {})).json(),
    );

  beforeAll(async () => {
    t = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp(t);
  });

  beforeEach(async () => {
    await t.ds.query('TRUNCATE TABLE users CASCADE');
    alice = await registerUser(t.baseUrl, 'alice@example.com');
    bob = await registerUser(t.baseUrl, 'bob@example.com');
  });

  describe('create and validation', () => {
    it('201: default title, custom title, response matches the contract', async () => {
      const plain = await call(alice, 'POST', '/chats', {});
      const named = await call(alice, 'POST', '/chats', { title: ' Trip planning ' });

      expect(plain.status).toBe(201);
      expect(ChatResponseSchema.parse(await plain.json()).title).toBe('New chat');
      expect(ChatResponseSchema.parse(await named.json()).title).toBe('Trip planning');
    });

    it('401 without a token', async () => {
      expect((await call(null, 'GET', '/chats')).status).toBe(401);
      expect((await call(null, 'POST', '/chats', {})).status).toBe(401);
    });

    it('400 for an empty or too long title and for extra fields (cannot set the owner)', async () => {
      const bad = [
        { title: ' ' },
        { title: 'x'.repeat(101) },
        { title: 'ok', userId: bob.user.id },
      ];

      for (const body of bad) {
        const res = await call(alice, 'POST', '/chats', body);
        expect(res.status).toBe(400);
        expect(ErrorResponseSchema.safeParse(await res.json()).success).toBe(true);
      }

      expect(await t.ds.query('SELECT count(*)::int AS n FROM chats')).toEqual([{ n: 0 }]);
    });
  });

  describe('list and cursor pagination', () => {
    it('shows only your chats, the newest activity first', async () => {
      const first = await createChat(alice, 'first');
      const second = await createChat(alice, 'second');
      await createChat(bob, 'bobs');
      // A message in the oldest chat moves it to the top.
      await call(alice, 'POST', `/chats/${first.id}/messages`, { content: 'hello' });
      const list = ChatListResponseSchema.parse(await (await call(alice, 'GET', '/chats')).json());
      expect(list.items.map((c) => c.title)).toEqual(['first', 'second']);
      expect(list.items.map((c) => c.id)).toEqual([first.id, second.id]);
      expect(list.nextCursor).toBeNull();
    });
    it('walks all chats exactly once with a cursor', async () => {
      const created = [];
      for (let i = 0; i < 5; i++) created.push(await createChat(alice, `chat ${i}`));
      const seen: string[] = [];
      const pageSizes: number[] = [];
      let cursor: string | null = null;
      do {
        const query: string = `?limit=2${cursor ? `&cursor=${cursor}` : ''}`;
        const page = ChatListResponseSchema.parse(
          await (await call(alice, 'GET', `/chats${query}`)).json(),
        );
        pageSizes.push(page.items.length);
        seen.push(...page.items.map((c) => c.id));
        cursor = page.nextCursor;
      } while (cursor);
      expect(pageSizes).toEqual([2, 2, 1]);
      expect(new Set(seen).size).toBe(5);
      expect(seen).toEqual(created.map((c) => c.id).reverse());
    });
    it('400 for a bad limit, a bad cursor and unknown query parameters', async () => {
      const bad = ['?limit=0', '?limit=101', '?limit=abc', '?cursor=garbage', '?page=2'];
      for (const query of bad) {
        expect((await call(alice, 'GET', `/chats${query}`)).status, query).toBe(400);
      }
    });
  });
  describe('ownership: a foreign chat does not exist for you', () => {
    it('get: your own is 200; a foreign and a made-up id give the same 404', async () => {
      const mine = await createChat(alice);
      const bobs = await createChat(bob);
      expect((await call(alice, 'GET', `/chats/${mine.id}`)).status).toBe(200);
      const foreign = await call(alice, 'GET', `/chats/${bobs.id}`);
      const missing = await call(alice, 'GET', '/chats/00000000-0000-4000-8000-000000000000');
      expect(foreign.status).toBe(404);
      expect(missing.status).toBe(404);
      expect(ErrorResponseSchema.parse(await foreign.json()).message).toBe(
        ErrorResponseSchema.parse(await missing.json()).message,
      );
    });
    it('rename: yours changes, a foreign one gives 404 and stays unchanged', async () => {
      const mine = await createChat(alice, 'old');
      const bobs = await createChat(bob, 'bobs');
      const ok = await call(alice, 'PATCH', `/chats/${mine.id}`, { title: 'new' });
      const foreign = await call(alice, 'PATCH', `/chats/${bobs.id}`, { title: 'hacked' });

      expect(ChatResponseSchema.parse(await ok.json()).title).toBe('new');
      expect(foreign.status).toBe(404);
      expect(await t.ds.query('SELECT title FROM chats WHERE id = $1', [bobs.id])).toEqual([
        { title: 'bobs' },
      ]);
    });

    it('delete: yours removes the chat and its messages; a foreign one gives 404 and stays', async () => {
      const mine = await createChat(alice);
      const bobs = await createChat(bob);

      await call(alice, 'POST', `/chats/${mine.id}/messages`, { content: 'hi' });

      expect((await call(alice, 'DELETE', `/chats/${bobs.id}`)).status).toBe(404);
      expect((await call(alice, 'DELETE', `/chats/${mine.id}`)).status).toBe(204);
      expect(await t.ds.query('SELECT count(*)::int AS n FROM chats')).toEqual([{ n: 1 }]);
      expect(await t.ds.query('SELECT count(*)::int AS n FROM messages')).toEqual([{ n: 0 }]);
    });

    it('messages: you cannot read or write messages of a foreign chat', async () => {
      const bobs = await createChat(bob);
      const read = await call(alice, 'GET', `/chats/${bobs.id}/messages`);
      const write = await call(alice, 'POST', `/chats/${bobs.id}/messages`, {
        content: 'intruder',
      });

      expect(read.status).toBe(404);
      expect(write.status).toBe(404);
      expect(await t.ds.query('SELECT count(*)::int AS n FROM messages')).toEqual([{ n: 0 }]);
    });
  });

  describe('messages', () => {
    it('201: the question and the answer are stored in order, the response matches the contract', async () => {
      const chat = await createChat(alice);
      const res = await call(alice, 'POST', `/chats/${chat.id}/messages`, { content: ' Hello ' });
      const pair = SendMessageResponseSchema.parse(await res.json());
      const history = MessageListResponseSchema.parse(
        await (await call(alice, 'GET', `/chats/${chat.id}/messages`)).json(),
      );

      expect(res.status).toBe(201);
      expect(pair.userMessage).toMatchObject({ role: 'user', content: 'Hello' });
      expect(pair.assistantMessage).toMatchObject({ role: 'assistant', content: 'Echo: Hello' });
      expect(history.items.map((m) => [m.role, m.content])).toEqual([
        ['user', 'Hello'],
        ['assistant', 'Echo: Hello'],
      ]);
      expect(Object.keys(pair.userMessage)).not.toContain('seq');
    });

    it('keeps the order across several messages', async () => {
      const chat = await createChat(alice);
      for (const text of ['one', 'two', 'three']) {
        await call(alice, 'POST', `/chats/${chat.id}/messages`, { content: text });
      }

      const history = MessageListResponseSchema.parse(
        await (await call(alice, 'GET', `/chats/${chat.id}/messages`)).json(),
      );

      expect(history.items.map((m) => m.content)).toEqual([
        'one',
        'Echo: one',
        'two',
        'Echo: two',
        'three',
        'Echo: three',
      ]);
    });

    it('400 for empty, whitespace-only, too long content and extra fields; nothing is stored', async () => {
      const chat = await createChat(alice);
      const bad = [
        { content: '' },
        { content: ' ' },
        { content: 'x'.repeat(4001) },
        { content: 'hi', role: 'assistant' },
        {},
      ];

      for (const body of bad) {
        expect((await call(alice, 'POST', `/chats/${chat.id}/messages`, body)).status).toBe(400);
      }
      expect(await t.ds.query('SELECT count(*)::int AS n FROM messages')).toEqual([{ n: 0 }]);
    });

    it('parallel messages into one chat all succeed and keep unique, increasing seq numbers', async () => {
      const chat = await createChat(alice);
      const results = await Promise.all(
        ['a', 'b', 'c', 'd'].map((content) =>
          call(alice, 'POST', `/chats/${chat.id}/messages`, { content }),
        ),
      );

      expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201]);

      const rows = await t.ds.query('SELECT seq FROM messages ORDER BY seq');

      expect(rows).toHaveLength(8);
      expect(new Set(rows.map((r: { seq: string }) => r.seq)).size).toBe(8);
    });
  });
});

describe('Chats API when the model fails (integration)', () => {
  let t: TestApp;
  let alice: AuthResponse;

  beforeAll(async () => {
    t = await startTestApp({
      override: (builder) =>
        builder.overrideProvider(LlmProvider).useValue({
          complete: () => Promise.reject(new Error('upstream timeout, api key sk-secret')),
        }),
    });
    alice = await registerUser(t.baseUrl, 'alice-failing@example.com');
  });

  afterAll(async () => {
    await stopTestApp(t);
  });

  it('502 without internals; the question stays in the chat, there is no answer', async () => {
    const chat = ChatResponseSchema.parse(
      await (await callApi(t.baseUrl, 'POST', '/chats', alice.accessToken, {})).json(),
    );
    const res = await callApi(t.baseUrl, 'POST', `/chats/${chat.id}/messages`, alice.accessToken, {
      content: 'Hello?',
    });
    const body = ErrorResponseSchema.parse(await res.json());
    const stored = await t.ds.query('SELECT role, content FROM messages');

    expect(res.status).toBe(502);
    expect(JSON.stringify(body)).not.toContain('sk-secret');
    expect(stored).toEqual([{ role: 'user', content: 'Hello?' }]);
  });
});
