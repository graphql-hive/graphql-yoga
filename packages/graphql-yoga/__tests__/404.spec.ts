import { createYoga } from '../src/index.js';

describe('404', () => {
  it('returns 404 if request path does not match with the defined graphql endpoint (POST)', async () => {
    const yoga = createYoga({
      logging: false,
    });
    const response = await yoga.fetch(
      'http://yoga/notgraphql?query=' + encodeURIComponent('{ __typename }'),
    );

    expect(response.status).toEqual(404);
    expect(await response.text()).toEqual('');
  });
  it('returns 404 if request path does not match with the defined graphql endpoint (GET)', async () => {
    const yoga = createYoga({
      logging: false,
    });
    const url = `http://localhost:4000/notgraphql`;
    const response = await yoga.fetch(url + '?query=' + encodeURIComponent('{ __typename }'), {
      method: 'GET',
    });

    expect(response.status).toEqual(404);
    expect(await response.text()).toEqual('');
  });
  it('returns 200 with landing page when accepting text/html and sending a GET request', async () => {
    const yoga = createYoga({
      logging: false,
    });
    const url = `http://localhost:4000/notgraphql`;
    const response = await yoga.fetch(url + '?query=' + encodeURIComponent('{ __typename }'), {
      method: 'GET',
      headers: { Accept: 'text/html' },
    });

    expect(response.status).toEqual(200);
    const body = await response.text();
    expect(body).toMatch(/<!DOCTYPE html>/i);
    expect(body).toContain('GraphQL Yoga');
  });
  it('returns 404 without landing page when accepting text/html and sending a GET request but disabled landing page', async () => {
    const yoga = createYoga({
      logging: false,
      landingPage: false,
    });
    const response = await yoga.fetch(
      `http://yoga/notgraphql/yourpath?query=` + encodeURIComponent('{ __typename }'),
      { method: 'GET', headers: { Accept: 'text/html' } },
    );

    expect(response.status).toEqual(404);
    const body = await response.text();
    expect(body).toEqual('');
  });
  it('404 handling does allow defining different route handlers', async () => {
    const yoga = createYoga({
      logging: false,
      plugins: [
        {
          onRequest({ request, endResponse, fetchAPI }) {
            if (request.url.endsWith('/iliketurtles')) {
              endResponse(
                new fetchAPI.Response('Do you really like em?', {
                  status: 566,
                }),
              );
            }
          },
        },
      ],
    });
    const response = await yoga.fetch(`http://localhost:4000/iliketurtles`);

    expect(response.status).toEqual(566);
    const body = await response.text();
    expect(body).toEqual('Do you really like em?');
  });
  it('supports custom landing page', async () => {
    const customLandingPageContent = 'My Custom Landing Page';
    const yoga = createYoga({
      logging: false,
      landingPage({ fetchAPI }) {
        return new fetchAPI.Response(customLandingPageContent, {
          status: 200,
        });
      },
    });
    const response = await yoga.fetch(`http://localhost:4000/notgraphql`, {
      method: 'GET',
      headers: { Accept: 'text/html' },
    });
    expect(response.status).toEqual(200);
    const body = await response.text();
    expect(body).toEqual(customLandingPageContent);
  });
});
