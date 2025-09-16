/* eslint-disable */
// @ts-check

// @ts-expect-error - TS doesn't know this import
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
// @ts-expect-error - TS doesn't know this import
import { githubComment } from 'https://raw.githubusercontent.com/dotansimha/k6-github-pr-comment/master/lib.js';
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  scenarios: {},
  thresholds: {},
};

const DURATION = 30;
const VUS = 1;

function getOptionsForScenario(scenario, index) {
  const noErrors = `no_errors{mode:${scenario}}`;
  const expectedResult = `expected_result{mode:${scenario}}`;
  const httpReqDuration = `http_req_duration{mode:${scenario}}`;
  const scenarioField = {
    executor: 'constant-vus',
    exec: 'run',
    startTime: DURATION * index + 's',
    vus: VUS,
    duration: DURATION + 's',
    env: { MODE: scenario },
    tags: { mode: scenario },
  };
  if (scenario === 'graphql-no-parse-validate-cache') {
    return {
      scenario: scenarioField,
      thresholds: {
        [noErrors]: ['rate>0.99'],
        [expectedResult]: ['rate>0.99'],
        [httpReqDuration]: ['avg<=2'],
      },
    };
  }
  return {
    scenario: scenarioField,
    thresholds: {
      [noErrors]: ['rate>0.99'],
      [expectedResult]: ['rate>0.99'],
      [httpReqDuration]: ['avg<=1'],
    },
  };
}

const scenarioNames = [
  'graphql',
  'graphql-jit',
  'graphql-response-cache',
  'graphql-no-parse-validate-cache',
  'uws',
];

scenarioNames.forEach((name, index) => {
  const { scenario, thresholds } = getOptionsForScenario(name, index);
  options.scenarios[name] = scenario;
  Object.assign(options.thresholds, thresholds);
});

export function handleSummary(data) {
  if (__ENV.GITHUB_TOKEN) {
    githubComment(data, {
      token: __ENV.GITHUB_TOKEN,
      commit: __ENV.GITHUB_SHA,
      pr: __ENV.GITHUB_PR,
      org: 'dotansimha',
      repo: 'graphql-yoga',
      renderTitle({ passes }) {
        return passes ? '✅ Benchmark Results' : '❌ Benchmark Failed';
      },
      renderMessage({ passes, checks, thresholds }) {
        const result = [];

        if (thresholds.failures) {
          result.push(
            `**Performance regression detected**: it seems like your Pull Request adds some extra latency to GraphQL Yoga`,
          );
        }

        if (checks.failures) {
          result.push('**Failed assertions detected**');
        }

        if (!passes) {
          result.push(
            `> If the performance regression is expected, please increase the failing threshold.`,
          );
        }

        return result.join('\n');
      },
    });
  }
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

export function run() {
  let url = 'http://localhost:4000/graphql';
  if (__ENV.MODE.startsWith('uws')) {
    url = 'http://localhost:4001/graphql';
  } else {
    url = `http://localhost:4000/${__ENV.MODE}`;
  }
  const res = http.post(url, {
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
  });

  const noErrors = `no_errors{mode:${__ENV.MODE}}`;
  const expectedResult = `expected_result{mode:${__ENV.MODE}}`;
  check(res, {
    [noErrors]: resp => {
      const json = resp.json();
      return !!json && typeof json === 'object' && !Array.isArray(json) && !json.errors;
    },
    [expectedResult]: resp => {
      const json = resp.json();
      return (
        !!json &&
        typeof json === 'object' &&
        !Array.isArray(json) &&
        !!json.data &&
        typeof json.data === 'object' &&
        !Array.isArray(json.data) &&
        !!json.data.authors &&
        Array.isArray(json.data.authors) &&
        json.data.authors.length > 0 &&
        !!json.data.authors[0] &&
        typeof json.data.authors[0] === 'object' &&
        !Array.isArray(json.data.authors[0]) &&
        !!json.data.authors[0].id
      );
    },
  });
}
