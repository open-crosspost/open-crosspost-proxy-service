import { ApiErrorCode } from '@crosspost/types';
import { assertEquals, assertExists } from 'jsr:@std/assert';
import { beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { Hono } from '../../deps.ts';
import { ValidationMiddleware } from '../../src/middleware/validation.middleware.ts';
import { z } from '../../deps.ts';

describe('Validation Middleware', () => {
  type Variables = {
    validatedBody?: unknown;
    validatedParams?: unknown;
    validatedQuery?: unknown;
  };

  let app: Hono<{ Variables: Variables }>;

  beforeEach(() => {
    app = new Hono<{ Variables: Variables }>();
  });

  describe('validateBody', () => {
    const schema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
    });

    beforeEach(() => {
      app.post('/test', ValidationMiddleware.validateBody(schema), (c) => {
        return c.json({ success: true, data: c.get('validatedBody') });
      });
    });

    it('should validate valid request body', async () => {
      const req = new Request('https://example.com/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
        }),
      });

      const res = await app.fetch(req);
      assertEquals(res.status, 200);

      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.data.username, 'testuser');
      assertEquals(body.data.email, 'test@example.com');
    });

    it('should return validation error for invalid body', async () => {
      const req = new Request('https://example.com/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'te', // too short
          email: 'invalid-email',
        }),
      });

      const res = await app.fetch(req);
      assertEquals(res.status, 400);

      const body = await res.json();
      assertEquals(body.success, false);
      assertExists(body.errors);
      assertEquals(body.errors[0].code, ApiErrorCode.VALIDATION_ERROR);
      assertExists(body.errors[0].details.validationErrors);
    });

    it('should return validation error for invalid JSON', async () => {
      const req = new Request('https://example.com/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const res = await app.fetch(req);
      assertEquals(res.status, 400);

      const body = await res.json();
      assertEquals(body.success, false);
      assertExists(body.errors);
      assertEquals(body.errors[0].code, ApiErrorCode.VALIDATION_ERROR);
      assertEquals(body.errors[0].message, 'Invalid JSON in request body');
    });
  });

  describe('validateParams', () => {
    const schema = z.object({
      id: z.string().min(5),
      type: z.enum(['user', 'admin']),
    });

    beforeEach(() => {
      app.get('/test/:id/:type', ValidationMiddleware.validateParams(schema), (c) => {
        return c.json({ success: true, data: c.get('validatedParams') });
      });
    });

    it('should validate valid params', async () => {
      const req = new Request('https://example.com/test/user123/admin');
      const res = await app.fetch(req);
      assertEquals(res.status, 200);

      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.data.id, 'user123');
      assertEquals(body.data.type, 'admin');
    });

    it('should return validation error for invalid params', async () => {
      const req = new Request('https://example.com/test/usr/invalid');
      const res = await app.fetch(req);
      assertEquals(res.status, 400);

      const body = await res.json();
      assertEquals(body.success, false);
      assertExists(body.errors);
      assertEquals(body.errors[0].code, ApiErrorCode.VALIDATION_ERROR);
      assertExists(body.errors[0].details.validationErrors);
    });
  });

  describe('validateQuery', () => {
    const schema = z.object({
      page: z.string().transform(Number).pipe(z.number().min(1)),
      limit: z.string().transform(Number).pipe(z.number().min(1).max(100)),
    });

    beforeEach(() => {
      app.get('/test', ValidationMiddleware.validateQuery(schema), (c) => {
        return c.json({ success: true, data: c.get('validatedQuery') });
      });
    });

    it('should validate valid query params', async () => {
      const req = new Request('https://example.com/test?page=1&limit=50');
      const res = await app.fetch(req);
      assertEquals(res.status, 200);

      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.data.page, 1);
      assertEquals(body.data.limit, 50);
    });

    it('should return validation error for invalid query params', async () => {
      const req = new Request('https://example.com/test?page=0&limit=200');
      const res = await app.fetch(req);
      assertEquals(res.status, 400);

      const body = await res.json();
      assertEquals(body.success, false);
      assertExists(body.errors);
      assertEquals(body.errors[0].code, ApiErrorCode.VALIDATION_ERROR);
      assertExists(body.errors[0].details.validationErrors);
    });
  });
});
