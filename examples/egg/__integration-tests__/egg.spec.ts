import { execSync } from 'node:child_process';
import { join } from 'path';
import { mock } from 'egg-mock/bootstrap';

describe('Egg', () => {
  const baseDir = join(__dirname, '..');
  let app: ReturnType<typeof mock.app>;
  beforeAll(() => {
    execSync('tsc', {
      cwd: baseDir,
    });
    app = mock.app({
      baseDir,
      clean: true,
      cache: false,
    });
    return app.ready();
  });
  afterAll(() => app.close());
  it('should show GraphiQL', async () => {
    const response = await app.httpRequest().get('/graphql').set('Accept', 'text/html');
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
  });
  it('should handle POST requests', async () => {
    const response = await app
      .httpRequest()
      .post('/graphql')
      .send({ query: '{ testList { count data { id name} } }' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toStrictEqual({
      data: {
        testList: {
          count: 3,
          data: [
            {
              id: '1',
              name: 'Test 1',
            },
            {
              id: '2',
              name: 'Test 2',
            },
            {
              id: '3',
              name: 'Test 3',
            },
          ],
        },
      },
    });
  });
});
