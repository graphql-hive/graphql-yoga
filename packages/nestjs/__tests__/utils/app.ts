import type { INestApplication } from '@nestjs/common';
import type { AbstractHttpAdapter } from '@nestjs/core';
import type { TestingModule } from '@nestjs/testing';

export function useTestApp(
  createModule: () => Promise<TestingModule>,
  createHttpAdapter?: () => AbstractHttpAdapter,
) {
  let app: INestApplication;
  let url: string;
  // Tracked separately from jest's `beforeAll` so `afterAll` can always wait for setup to settle
  // before closing - if `beforeAll` ever exceeds jest's hook timeout, jest moves on without
  // cancelling this promise, and calling `app.close()` while `app.listen()` is still in flight can
  // lose the race and leave the underlying server listening (an unclosed handle) forever.
  let ready: Promise<unknown>;

  beforeAll(() => {
    ready = (async () => {
      const module = await createModule();
      app = createHttpAdapter
        ? module.createNestApplication(createHttpAdapter())
        : module.createNestApplication();
      await app.listen(0);
      url = (await app.getUrl()) + '/graphql';
    })();
    return ready;
  });

  afterAll(async () => {
    await ready.catch(() => {});
    await app?.close();
  });

  return {
    getApp: () => app,
    getUrl: () => url,
  };
}
