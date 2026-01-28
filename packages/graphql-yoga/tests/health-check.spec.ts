import { createYoga } from '../src/index.js';

describe('health check', () => {
  it('return 200 status code for health check endpoint', async () => {
    const yoga = createYoga({
      logging: false,
    });
    const result = await yoga.fetch('http://yoga/health');
    expect(result.status).toBe(200);
  });
});
