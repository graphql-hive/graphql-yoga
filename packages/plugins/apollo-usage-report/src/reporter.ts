import { YogaLogger, YogaServer } from 'graphql-yoga';
import { google, Report, ReportHeader } from '@apollo/usage-reporting-protobuf';
import type { ApolloUsageReportOptions } from './index';
import { OurReport } from './stats.js';

const DEFAULT_REPORTING_ENDPOINT =
  'https://usage-reporting.api.apollographql.com/api/ingress/traces';

export class Reporter {
  #yoga: YogaServer<Record<string, unknown>, Record<string, unknown>>;
  #logger: YogaLogger = console;
  #reportHeaders: {
    graphRef: string;
    hostname: string;
    uname: string;
    runtimeVersion: string;
    agentVersion: string;
  };
  #options: {
    apiKey?: string;
    endpoint?: string;
    alwaysSend?: boolean;
    maxBatchDelay: number;
    maxBatchUncompressedSize: number;
    maxTraceSize: number;
    exportTimeout: number;
  };

  #reportsBySchema: Record<string, OurReport> = {};
  #nextSendAfterDelay?: ReturnType<typeof setTimeout>;
  #sending: Promise<unknown>[] = [];

  constructor(
    options: ApolloUsageReportOptions,
    yoga: YogaServer<Record<string, unknown>, Record<string, unknown>>,
    logger: YogaLogger,
  ) {
    this.#logger = logger;
    this.#yoga = yoga;
    this.#options = {
      ...options,
      maxBatchDelay: options.maxBatchDelay ?? 20 * 60 * 1000, // 20min
      maxBatchUncompressedSize: options.maxBatchUncompressedSize ?? 4 * 1024 * 1024, // 4mb
      maxTraceSize: options.maxTraceSize ?? 10 * 1024 * 1024, // 10mb
      exportTimeout: options.exportTimeout ?? 30 * 1000, // 60s
    };
    this.#reportHeaders = {
      graphRef: getGraphRef(options),
      hostname: options.hostname ?? getEnvVar('HOSTNAME') ?? '',
      uname: options.uname ?? '', // TODO: find a cross-platform way to get the uname
      runtimeVersion: options.runtimeVersion ?? '',
      agentVersion: options.agentVersion || `graphql-yoga@${yoga.version}`,
    };
  }

  addTrace(schemaId: string, options: Parameters<OurReport['addTrace']>[0]) {
    const report = this.#getReport(schemaId);
    report.addTrace(options);

    if (
      this.#options.alwaysSend ||
      report.sizeEstimator.bytes >= this.#options.maxBatchUncompressedSize!
    ) {
      return this.sendReport(schemaId);
    }

    this.#nextSendAfterDelay ||= setTimeout(() => this.flush(), this.#options.maxBatchDelay);

    return;
  }

  async flush() {
    return Promise.allSettled([
      ...this.#sending, // When flushing, we want to also wait for previous traces to be sent, because it's mostly used for clean up
      ...Object.keys(this.#reportsBySchema).map(schemaId => this.sendReport(schemaId)),
    ]);
  }

  async sendReport(schemaId: string) {
    const sending = this.#sendReport(schemaId);
    this.#sending.push(sending);
    sending.finally(() => this.#sending?.filter(p => p !== sending));
    return sending;
  }

  async #sendReport(schemaId: string) {
    const {
      fetchAPI: { fetch, CompressionStream, ReadableStream },
    } = this.#yoga;
    const report = this.#reportsBySchema[schemaId];
    if (!report) {
      throw new Error(`No report to send for schema ${schemaId}`);
    }

    if (this.#nextSendAfterDelay != null) {
      clearTimeout(this.#nextSendAfterDelay);
    }

    delete this.#reportsBySchema[schemaId];
    report.endTime = dateToProtoTimestamp(new Date());
    report.ensureCountsAreIntegers();

    const validationError = Report.verify(report);
    if (!validationError) {
      throw new TypeError(`Invalid report: ${validationError}`);
    }

    const encodedReport = Report.encode(report).finish();
    const compressedReport = new ReadableStream({
      start(controller) {
        controller.enqueue(encodedReport);
        controller.close();
      },
    }).pipeThrough(new CompressionStream('gzip'));

    const { apiKey = getEnvVar('APOLLO_KEY'), endpoint = DEFAULT_REPORTING_ENDPOINT } =
      this.#options;

    for (let tries = 0; tries < 5; tries++) {
      try {
        const abortCtl = new AbortController();
        this.#logger?.debug(`Sending report (try ${tries}/5)`);
        const timeout = setTimeout(() => abortCtl.abort(), this.#options.exportTimeout);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/protobuf',
            'content-encoding': 'gzip',
            // The presence of the api key is already checked at Yoga initialization time
            'x-api-key': apiKey!,
            accept: 'application/json',
          },
          body: compressedReport,
          signal: abortCtl.signal,
        });
        clearTimeout(timeout);

        const result = await response.text();
        if (response.ok) {
          this.#logger?.debug('Report sent:', result);
          return;
        }

        throw result;
      } catch (err) {
        this.#logger?.error('Failed to send report:', err);
      }
    }

    throw new Error('Failed to send traces after 5 tries');
  }

  #getReport(schemaId: string): OurReport {
    const report = this.#reportsBySchema[schemaId];
    if (report) {
      return report;
    }
    return (this.#reportsBySchema[schemaId] = new OurReport(
      new ReportHeader({
        ...this.#reportHeaders,
        executableSchemaId: schemaId,
      }),
    ));
  }
}

function getGraphRef(options: ApolloUsageReportOptions): string {
  const graphRef = options.graphRef || getEnvVar('APOLLO_GRAPH_REF');
  if (!graphRef) {
    throw new Error(
      'Missing GraphRef. Either provide `graphRef` option or `APOLLO_GRAPH_REF` environment variable',
    );
  }
  return graphRef;
}

export function getEnvVar<T>(name: string, defaultValue?: T): string | T | undefined {
  return globalThis.process?.env?.[name] || defaultValue || undefined;
}

// Converts a JS Date into a Timestamp.
export function dateToProtoTimestamp(date: Date): google.protobuf.Timestamp {
  const totalMillis = date.getTime();
  const millis = totalMillis % 1000;
  return new google.protobuf.Timestamp({
    seconds: (totalMillis - millis) / 1000,
    nanos: millis * 1e6,
  });
}
