/* eslint-disable no-undef */
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { githubComment } from 'https://raw.githubusercontent.com/dotansimha/k6-github-pr-comment/master/lib.js';
import { check } from 'k6';
import { Trend } from 'k6/metrics';
import { checkNoErrors, graphql } from './utils.js';

const DURATION = 30;
const VUS = 10;

function buildOptions(scenarioToThresholdsMap) {
  const result = {
    scenarios: {},
    thresholds: {},
  };

  let index = 0;

  for (const [scenario, thresholds] of Object.entries(scenarioToThresholdsMap)) {
    result.scenarios[scenario] = {
      executor: 'constant-vus',
      exec: 'run',
      startTime: DURATION * index + 's',
      vus: VUS,
      duration: DURATION + 's',
      env: { MODE: scenario },
      tags: { mode: scenario },
    };

    for (const key of Object.keys(thresholds || {})) {
      result.thresholds[`${key}{mode:${scenario}}`] = thresholds[key];
    }

    index++;
  }

  return result;
}

const trace = {
  init: new Trend('envelop_init', true),
  parse: new Trend('graphql_parse', true),
  validate: new Trend('graphql_validate', true),
  context: new Trend('graphql_context', true),
  execute: new Trend('graphql_execute', true),
  total: new Trend('envelop_total', true),
};

const perfHooksTrace = new Trend('event_loop_lag', true);

export const options = buildOptions({
  'graphql-js': {
    checks: ['rate>0.98'],
    http_req_duration: ['p(95)<=20'],
    graphql_execute: ['p(95)<=2'],
    graphql_context: ['p(95)<=1'],
    graphql_validate: ['p(95)<=1'],
    graphql_parse: ['p(95)<=1'],
    envelop_init: ['p(95)<=1'],
    envelop_total: ['p(95)<=2'],
    event_loop_lag: ['avg==0', 'p(99)==0'],
  },
  'envelop-just-cache': {
    checks: ['rate>0.98'],
    http_req_duration: ['p(95)<=12'],
    graphql_execute: ['p(95)<=1'],
    graphql_context: ['p(95)<=1'],
    graphql_validate: ['p(95)<=1'],
    graphql_parse: ['p(95)<=1'],
    envelop_init: ['p(95)<=1'],
    envelop_total: ['p(95)<=1'],
    event_loop_lag: ['avg==0', 'p(99)==0'],
  },
  'envelop-cache-and-no-internal-tracing': {
    checks: ['rate>0.98'],
    http_req_duration: ['p(95)<=12'],
    event_loop_lag: ['avg==0', 'p(99)==0'],
  },
  'envelop-cache-jit': {
    checks: ['rate>0.98'],
    http_req_duration: ['p(95)<=11'],
    graphql_execute: ['p(95)<=1'],
    graphql_context: ['p(95)<=1'],
    graphql_validate: ['p(95)<=1'],
    graphql_parse: ['p(95)<=1'],
    envelop_init: ['p(95)<=1'],
    envelop_total: ['p(95)<=1'],
    event_loop_lag: ['avg==0', 'p(99)==0'],
  },
});

export function handleSummary(data) {
  githubComment(data, {
    token: __ENV.GITHUB_TOKEN,
    commit: __ENV.GITHUB_SHA,
    pr: __ENV.GITHUB_PR,
    org: 'dotansimha',
    repo: 'envelop',
    renderTitle({ passes }) {
      return passes ? '✅ Benchmark Results' : '❌ Benchmark Failed';
    },
    renderMessage({ passes, checks, thresholds }) {
      const result = [];

      if (thresholds.failures) {
        result.push(
          `**Performance regression detected**: it seems like your Pull Request adds some extra latency to the GraphQL requests, or to envelop runtime.`,
        );
      }

      if (checks.failures) {
        result.push(
          '**Failed assertions detected**: some GraphQL operations included in the loadtest are failing.',
        );
      }

      if (!passes) {
        result.push(
          `> If the performance regression is expected, please increase the failing threshold.`,
        );
      }

      return result.join('\n');
    },
  });

  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

export function run() {
  const res = graphql({
    query: /* GraphQL */ `
      query authors {
        authors {
          id
          name
          company
          books {
            id
            name
            numPages
          }
        }
      }
    `,
    variables: {},
    operationName: 'authors',
  });

  const extensions = res.json().extensions || {};
  const tracingData = extensions.envelopTracing || {};
  tracingData.parse && trace.parse.add(tracingData.parse);
  tracingData.validate && trace.validate.add(tracingData.validate);
  tracingData.contextFactory && trace.context.add(tracingData.contextFactory);
  tracingData.execute && trace.execute.add(tracingData.execute);
  tracingData.subscribe && trace.subscribe.add(tracingData.subscribe);
  tracingData.init && trace.init.add(tracingData.init);
  const eventLoopLag = extensions.eventLoopLag;
  perfHooksTrace.add(eventLoopLag);

  const total = [
    tracingData.parse,
    tracingData.validate,
    tracingData.contextFactory,
    tracingData.execute,
    tracingData.subscribe,
    tracingData.init,
  ]
    .filter(Boolean)
    .reduce((a, b) => a + b, 0);

  trace.total.add(total);

  check(res, {
    no_errors: checkNoErrors,
    expected_result: resp => {
      const data = resp.json().data;
      return data && data.authors[0].id;
    },
  });
}
