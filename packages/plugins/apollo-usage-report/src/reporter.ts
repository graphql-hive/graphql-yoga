import { google, Report, ReportHeader } from '@apollo/usage-reporting-protobuf';
import { YogaLogger } from '@graphql-yoga/logger';
import { YogaServer } from '@graphql-yoga/types';
import type { ApolloUsageReportOptions } from './index';
import { OurReport } from './stats.js';

const DEFAULT_REPORTING_ENDPOINT =
  'https://usage-reporting.api.apollographql.com/api/ingress/traces';

export class Reporter {
  private reportHeaders: {
    graphRef: string;
    hostname: string;
    uname: string;
    runtimeVersion: string;
    agentVersion: string;
  };
  private options: {
    apiKey?: string;
    endpoint?: string;
    alwaysSend?: boolean;
    maxBatchDelay: number;
    maxBatchUncompressedSize: number;
    maxTraceSize: number;
    exportTimeout: number;
    onError: (err: Error) => void;
  };

  private reportsBySchema: Record<string, OurReport> = {};
  private nextSendAfterDelay?: ReturnType<typeof setTimeout>;
  private sending: Promise<unknown>[] = [];

  constructor(
    options: ApolloUsageReportOptions,
    private yoga: YogaServer<Record<string, unknown>, Record<string, unknown>>,
    private logger: YogaLogger,
  ) {
    this.options = {
      ...options,
      maxBatchDelay: options.maxBatchDelay ?? 20_000, // 20s
      maxBatchUncompressedSize: options.maxBatchUncompressedSize ?? 4 * 1024 * 1024, // 4mb
      maxTraceSize: options.maxTraceSize ?? 10 * 1024 * 1024, // 10mb
      exportTimeout: options.exportTimeout ?? 30_000, // 30s
      onError: options.onError ?? (err => this.logger.error('Failed to send report', err)),
    };
    this.reportHeaders = {
      graphRef: getGraphRef(options),
      hostname: options.hostname ?? getEnvVar('HOSTNAME') ?? '',
      uname: options.uname ?? '', // TODO: find a cross-platform way to get the uname
      runtimeVersion: options.runtimeVersion ?? '',
      agentVersion: options.agentVersion || `graphql-yoga@${yoga.version}`,
    };
  }

  addTrace(schemaId: string, options: Parameters<OurReport['addTrace']>[0]) {
    const report = this.getReport(schemaId);
    report.addTrace(options);

    if (
      this.options.alwaysSend ||
      report.sizeEstimator.bytes >= this.options.maxBatchUncompressedSize!
    ) {
      return this._sendReport(schemaId);
    }

    this.nextSendAfterDelay ||= setTimeout(() => this.flush(), this.options.maxBatchDelay);

    return;
  }

  async flush() {
    return Promise.allSettled([
      ...this.sending, // When flushing, we want to also wait for previous traces to be sent, because it's mostly used for clean up
      ...Object.keys(this.reportsBySchema).map(schemaId => this._sendReport(schemaId)),
    ]);
  }

  async sendReport(schemaId: string) {
    const sending = this._sendReport(schemaId);
    this.sending.push(sending);
    sending.finally(() => (this.sending = this.sending?.filter(p => p !== sending)));
    return sending;
  }

  private async _sendReport(schemaId: string) {
    const {
      fetchAPI: { fetch, CompressionStream, ReadableStream },
    } = this.yoga;
    const report = this.reportsBySchema[schemaId];
    if (!report) {
      throw new Error(`No report to send for schema ${schemaId}`);
    }

    if (this.nextSendAfterDelay != null) {
      clearTimeout(this.nextSendAfterDelay);
      this.nextSendAfterDelay = undefined;
    }

    delete this.reportsBySchema[schemaId];
    report.endTime = dateToProtoTimestamp(new Date());
    report.ensureCountsAreIntegers();

    const validationError = Report.verify(report);
    if (validationError) {
      throw new TypeError(`Invalid report: ${validationError}`);
    }

    const { apiKey = getEnvVar('APOLLO_KEY'), endpoint = DEFAULT_REPORTING_ENDPOINT } =
      this.options;

    const encodedReport = Report.encode(report).finish();

    let lastError: unknown;
    for (let tries = 0; tries < 5; tries++) {
      try {
        this.logger.debug(`Sending report (try ${tries}/5)`);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/protobuf',
            'content-encoding': 'gzip',
            // The presence of the api key is already checked at Yoga initialization time
            'x-api-key': apiKey!,
            accept: 'application/json',
          },
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(encodedReport);
              controller.close();
            },
          }).pipeThrough(new CompressionStream('gzip')),
          signal: AbortSignal.timeout(this.options.exportTimeout),
        });

        const result = await response.text();
        if (response.ok) {
          this.logger.debug('Report sent:', result);
          return;
        }

        throw result;
      } catch (err) {
        lastError = err;
        this.logger.error('Failed to send report:', err);
      }
    }

    this.options.onError(new Error('Failed to send traces after 5 tries', { cause: lastError }));
  }

  private getReport(schemaId: string): OurReport {
    const report = this.reportsBySchema[schemaId];
    if (report) {
      return report;
    }
    return (this.reportsBySchema[schemaId] = new OurReport(
      new ReportHeader({
        ...this.reportHeaders,
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
