// Copied from https://github.com/apollographql/apollo-server/blob/8c6579e5b61276b62dc7e30e6fac9a4242e24daa/packages/server/src/plugin/usageReporting/stats.ts
/* eslint-disable */

import type { NonFtv1ErrorPath } from '@apollo/server-gateway-interface';
import {
  Trace,
  type google,
  type IContextualizedStats,
  type IFieldStat,
  type IPathErrorStats,
  type IQueryLatencyStats,
  type IReport,
  type IStatsContext,
  type ITracesAndStats,
  type ITypeStat,
  type ReportHeader,
} from '@apollo/usage-reporting-protobuf';
import type { ReferencedFieldsByType } from '@apollo/utils.usagereporting';

// protobuf.js exports both a class and an interface (starting with I) for each
// message type. The class is what it produces when it decodes the message; the
// interface is what is accepted as input. We build up our messages using custom
// types implementing the interfaces, so that we can take advantage of the
// js_use_toArray option we added to our protobuf.js fork which allows us to use
// classes like DurationHistogram to generate repeated fields. We end up
// re-creating most of the report structure as custom classes (starting with
// "Our"). TypeScript validates that we've properly listed all of the message
// fields with the appropriate types (we use `Required` to ensure we implement
// all message fields). Using our own classes has other advantages, like being
// able to specify that nested messages are instances of the same class rather
// than the interface type and thus that they have non-null fields (because the
// interface type allows all fields to be optional, even though the protobuf
// format doesn't differentiate between missing and falsey).

export class SizeEstimator {
  bytes = 0;
}
export class OurReport implements Required<IReport> {
  // Apollo Server includes each operation either as aggregated stats or as a
  // trace, but not both. Other reporting agents such as Apollo Router include
  // all operations in stats (even those that are sent as traces), and they set
  // this flag to true.
  tracesPreAggregated = false;

  constructor(readonly header: ReportHeader) {}
  readonly tracesPerQuery: Record<string, OurTracesAndStats> = Object.create(null);
  endTime: google.protobuf.ITimestamp | null = null;
  operationCount = 0;
  // A rough estimate of the number of bytes currently in the report. We start
  // at zero and don't count `header` and `endTime`, which have the same size
  // for every report. This really is a rough estimate, so we don't stress too
  // much about counting bytes for the tags and string/message lengths, etc:
  // we mostly just count the lengths of strings plus some estimates for the
  // messages with a bunch of numbers in them.
  //
  // We store this in a class so we can pass it down as a reference to other
  // methods which increment it.
  readonly sizeEstimator = new SizeEstimator();

  ensureCountsAreIntegers() {
    for (const tracesAndStats of Object.values(this.tracesPerQuery)) {
      tracesAndStats.ensureCountsAreIntegers();
    }
  }

  addTrace({
    statsReportKey,
    trace,
    asTrace,
    referencedFieldsByType,
    // The max size a trace can be before it is sent as stats. Note that the
    // Apollo reporting ingress server will never store any traces over 10mb
    // anyway. They will still be converted to stats as we would do here.
    maxTraceBytes = 10 * 1024 * 1024,
    nonFtv1ErrorPaths,
  }: {
    statsReportKey: string;
    trace: Trace;
    asTrace: boolean;
    referencedFieldsByType: ReferencedFieldsByType;
    maxTraceBytes?: number;
    nonFtv1ErrorPaths: NonFtv1ErrorPath[];
  }) {
    const tracesAndStats = this.getTracesAndStats({
      statsReportKey,
      referencedFieldsByType,
    });
    if (asTrace) {
      const encodedTrace = Trace.encode(trace).finish();

      if (!isNaN(maxTraceBytes) && encodedTrace.length > maxTraceBytes) {
        tracesAndStats.statsWithContext.addTrace(trace, this.sizeEstimator, nonFtv1ErrorPaths);
      } else {
        tracesAndStats.trace.push(encodedTrace);
        this.sizeEstimator.bytes += 2 + encodedTrace.length;
      }
    } else {
      tracesAndStats.statsWithContext.addTrace(trace, this.sizeEstimator, nonFtv1ErrorPaths);
    }
  }

  private getTracesAndStats({
    statsReportKey,
    referencedFieldsByType,
  }: {
    statsReportKey: string;
    referencedFieldsByType: ReferencedFieldsByType;
  }) {
    const existing = this.tracesPerQuery[statsReportKey];
    if (existing) {
      return existing;
    }
    this.sizeEstimator.bytes += estimatedBytesForString(statsReportKey);

    // Update the size estimator for the referenced field structure.
    for (const [typeName, referencedFieldsForType] of Object.entries(referencedFieldsByType)) {
      // Two bytes each for the map entry and for the ReferencedFieldsForType,
      // and for the isInterface bool if it's set.
      this.sizeEstimator.bytes += 2 + 2;
      if (referencedFieldsForType.isInterface) {
        this.sizeEstimator.bytes += 2;
      }
      this.sizeEstimator.bytes += estimatedBytesForString(typeName);
      for (const fieldName of referencedFieldsForType.fieldNames) {
        this.sizeEstimator.bytes += estimatedBytesForString(fieldName);
      }
    }

    // Include the referenced fields map in the report. (In an ideal world we
    // could have a slightly more sophisticated protocol and ingestion pipeline
    // that allowed us to only have to send this data once for each
    // schema/operation pair.)
    return (this.tracesPerQuery[statsReportKey] = new OurTracesAndStats(referencedFieldsByType));
  }
}

class OurTracesAndStats implements Required<ITracesAndStats> {
  constructor(readonly referencedFieldsByType: ReferencedFieldsByType) {}
  readonly trace: Uint8Array[] = [];
  readonly statsWithContext = new StatsByContext();
  readonly internalTracesContributingToStats: Uint8Array[] = [];

  ensureCountsAreIntegers() {
    this.statsWithContext.ensureCountsAreIntegers();
  }
}

class StatsByContext {
  readonly map: { [k: string]: OurContextualizedStats } = Object.create(null);

  /**
   * This function is used by the protobuf generator to convert this map into
   * an array of contextualized stats to serialize
   */
  toArray(): IContextualizedStats[] {
    return Object.values(this.map);
  }

  ensureCountsAreIntegers() {
    for (const contextualizedStats of Object.values(this.map)) {
      contextualizedStats.ensureCountsAreIntegers();
    }
  }

  addTrace(trace: Trace, sizeEstimator: SizeEstimator, nonFtv1ErrorPaths: NonFtv1ErrorPath[]) {
    this.getContextualizedStats(trace, sizeEstimator).addTrace(
      trace,
      sizeEstimator,
      nonFtv1ErrorPaths,
    );
  }

  private getContextualizedStats(
    trace: Trace,
    sizeEstimator: SizeEstimator,
  ): OurContextualizedStats {
    const statsContext: IStatsContext = {
      clientName: trace.clientName,
      clientVersion: trace.clientVersion,
    };
    const statsContextKey = JSON.stringify(statsContext);

    const existing = this.map[statsContextKey];
    if (existing) {
      return existing;
    }
    // Adding a ContextualizedStats means adding a StatsContext plus a
    // QueryLatencyStats. Let's guess about 20 bytes for a QueryLatencyStats;
    // it'll be more if more features are used (like cache, APQ, etc).
    sizeEstimator.bytes +=
      20 + estimatedBytesForString(trace.clientName) + estimatedBytesForString(trace.clientVersion);
    const contextualizedStats = new OurContextualizedStats(statsContext);
    this.map[statsContextKey] = contextualizedStats;
    return contextualizedStats;
  }
}

export class OurContextualizedStats implements Required<IContextualizedStats> {
  queryLatencyStats = new OurQueryLatencyStats();
  perTypeStat: { [k: string]: OurTypeStat } = Object.create(null);

  constructor(readonly context: IStatsContext) {}

  ensureCountsAreIntegers() {
    for (const typeStat of Object.values(this.perTypeStat)) {
      typeStat.ensureCountsAreIntegers();
    }
  }

  // Extract statistics from the trace, and increment the estimated report size.
  // We only add to the estimate when adding whole sub-messages. If it really
  // mattered, we could do a lot more careful things like incrementing it
  // whenever a numeric field on queryLatencyStats gets incremented over 0.
  addTrace(trace: Trace, sizeEstimator: SizeEstimator, nonFtv1ErrorPaths: NonFtv1ErrorPath[] = []) {
    const { fieldExecutionWeight } = trace;
    if (!fieldExecutionWeight) {
      this.queryLatencyStats.requestsWithoutFieldInstrumentation++;
    }

    this.queryLatencyStats.requestCount++;
    if (trace.fullQueryCacheHit) {
      this.queryLatencyStats.cacheLatencyCount.incrementDuration(trace.durationNs);
      this.queryLatencyStats.cacheHits++;
    } else {
      this.queryLatencyStats.latencyCount.incrementDuration(trace.durationNs);
    }

    // We only provide stats about cache TTLs on cache misses (ie, TTLs directly
    // calculated by the backend), not for cache hits. This matches the
    // behavior we've had for a while when converting traces into statistics
    // in Studio's servers.
    if (!trace.fullQueryCacheHit && trace.cachePolicy?.maxAgeNs != null) {
      switch (trace.cachePolicy.scope) {
        case Trace.CachePolicy.Scope.PRIVATE:
          this.queryLatencyStats.privateCacheTtlCount.incrementDuration(trace.cachePolicy.maxAgeNs);
          break;
        case Trace.CachePolicy.Scope.PUBLIC:
          this.queryLatencyStats.publicCacheTtlCount.incrementDuration(trace.cachePolicy.maxAgeNs);
          break;
      }
    }

    if (trace.persistedQueryHit) {
      this.queryLatencyStats.persistedQueryHits++;
    }
    if (trace.persistedQueryRegister) {
      this.queryLatencyStats.persistedQueryMisses++;
    }

    if (trace.forbiddenOperation) {
      this.queryLatencyStats.forbiddenOperationCount++;
    }
    if (trace.registeredOperation) {
      this.queryLatencyStats.registeredOperationCount++;
    }

    let hasError = false;

    const errorPathStats = new Set<OurPathErrorStats>();

    const traceNodeStats = (node: Trace.INode, path: ResponseNamePath) => {
      // Generate error stats and error path information
      if (node.error?.length) {
        hasError = true;

        let currPathErrorStats = this.queryLatencyStats.rootErrorStats;
        path.toArray().forEach(subPath => {
          currPathErrorStats = currPathErrorStats.getChild(subPath, sizeEstimator);
        });

        errorPathStats.add(currPathErrorStats);
        currPathErrorStats.errorsCount += node.error.length;
      }

      if (fieldExecutionWeight) {
        // The actual field name behind the node; originalFieldName is set
        // if an alias was used, otherwise responseName. (This is falsey for
        // nodes that are not fields (root, array index, etc).)
        const fieldName = node.originalFieldName || node.responseName;

        // Protobuf doesn't really differentiate between "unset" and "falsey" so
        // we're mostly actually checking that these things are non-empty string /
        // non-zero numbers. The time fields represent the number of nanoseconds
        // since the beginning of the entire trace, so let's pretend for the
        // moment that it's plausible for a node to start or even end exactly when
        // the trace started (ie, for the time values to be 0). This is unlikely
        // in practice (everything should take at least 1ns). In practice we only
        // write `type` and `parentType` on a Node when we write `startTime`, so
        // the main thing we're looking out for by checking the time values is
        // whether we somehow failed to write `endTime` at the end of the field;
        // in this case, the `endTime >= startTime` check won't match.
        if (
          node.parentType &&
          fieldName &&
          node.type &&
          node.endTime != null &&
          node.startTime != null &&
          node.endTime >= node.startTime
        ) {
          const typeStat = this.getTypeStat(node.parentType, sizeEstimator);

          const fieldStat = typeStat.getFieldStat(fieldName, node.type, sizeEstimator);

          fieldStat.errorsCount += node.error?.length ?? 0;
          fieldStat.observedExecutionCount++;
          fieldStat.estimatedExecutionCount += fieldExecutionWeight;
          // Note: this is actually counting the number of resolver calls for this
          // field that had at least one error, not the number of overall GraphQL
          // queries that had at least one error for this field. That doesn't seem
          // to match the name, but it does match the other implementations of this
          // logic.
          fieldStat.requestsWithErrorsCount += (node.error?.length ?? 0) > 0 ? 1 : 0;
          fieldStat.latencyCount.incrementDuration(
            node.endTime - node.startTime,
            // The latency histogram is always "estimated"; we don't track
            // "observed" and "estimated" separately.
            fieldExecutionWeight,
          );
        }
      }

      return false;
    };

    iterateOverTrace(trace, traceNodeStats, true);

    // iterate over nonFtv1ErrorPaths, using some bits from traceNodeStats function
    for (const { subgraph, path } of nonFtv1ErrorPaths) {
      hasError = true;
      if (path) {
        let currPathErrorStats = this.queryLatencyStats.rootErrorStats.getChild(
          `service:${subgraph}`,
          sizeEstimator,
        );
        path.forEach(subPath => {
          if (typeof subPath === 'string') {
            currPathErrorStats = currPathErrorStats.getChild(subPath, sizeEstimator);
          }
        });

        errorPathStats.add(currPathErrorStats);
        currPathErrorStats.errorsCount += 1;
      }
    }

    for (const errorPath of errorPathStats) {
      errorPath.requestsWithErrorsCount += 1;
    }

    if (hasError) {
      this.queryLatencyStats.requestsWithErrorsCount++;
    }
  }

  getTypeStat(parentType: string, sizeEstimator: SizeEstimator): OurTypeStat {
    const existing = this.perTypeStat[parentType];
    if (existing) {
      return existing;
    }
    sizeEstimator.bytes += estimatedBytesForString(parentType);
    const typeStat = new OurTypeStat();
    this.perTypeStat[parentType] = typeStat;
    return typeStat;
  }
}

class OurQueryLatencyStats implements Required<IQueryLatencyStats> {
  latencyCount: DurationHistogram = new DurationHistogram();
  requestCount = 0;
  requestsWithoutFieldInstrumentation = 0;
  cacheHits = 0;
  persistedQueryHits = 0;
  persistedQueryMisses = 0;
  cacheLatencyCount: DurationHistogram = new DurationHistogram();
  rootErrorStats: OurPathErrorStats = new OurPathErrorStats();
  requestsWithErrorsCount = 0;
  publicCacheTtlCount: DurationHistogram = new DurationHistogram();
  privateCacheTtlCount: DurationHistogram = new DurationHistogram();
  registeredOperationCount = 0;
  forbiddenOperationCount = 0;
}

class OurPathErrorStats implements Required<IPathErrorStats> {
  children: { [k: string]: OurPathErrorStats } = Object.create(null);
  errorsCount = 0;
  requestsWithErrorsCount = 0;

  getChild(subPath: string, sizeEstimator: SizeEstimator): OurPathErrorStats {
    const existing = this.children[subPath];
    if (existing) {
      return existing;
    }
    const child = new OurPathErrorStats();
    this.children[subPath] = child;
    // Include a few bytes in the estimate for the numbers etc.
    sizeEstimator.bytes += estimatedBytesForString(subPath) + 4;
    return child;
  }
}

class OurTypeStat implements Required<ITypeStat> {
  perFieldStat: { [k: string]: OurFieldStat } = Object.create(null);

  getFieldStat(fieldName: string, returnType: string, sizeEstimator: SizeEstimator): OurFieldStat {
    const existing = this.perFieldStat[fieldName];
    if (existing) {
      return existing;
    }
    // Rough estimate of 10 bytes for the numbers in the FieldStat.
    sizeEstimator.bytes +=
      estimatedBytesForString(fieldName) + estimatedBytesForString(returnType) + 10;
    const fieldStat = new OurFieldStat(returnType);
    this.perFieldStat[fieldName] = fieldStat;
    return fieldStat;
  }

  ensureCountsAreIntegers() {
    for (const fieldStat of Object.values(this.perFieldStat)) {
      fieldStat.ensureCountsAreIntegers();
    }
  }
}

class OurFieldStat implements Required<IFieldStat> {
  errorsCount = 0;
  observedExecutionCount = 0;
  // Note that this number isn't necessarily an integer while it is being
  // aggregated. Before encoding as a protobuf we call ensureCountsAreIntegers
  // which floors it.
  estimatedExecutionCount = 0;
  requestsWithErrorsCount = 0;
  latencyCount: DurationHistogram = new DurationHistogram();

  constructor(readonly returnType: string) {}

  ensureCountsAreIntegers() {
    // This is the only one that ever can receive non-integers.
    this.estimatedExecutionCount = Math.floor(this.estimatedExecutionCount);
  }
}

function estimatedBytesForString(s: string) {
  // 2 is for the tag (field ID + wire type) plus the encoded length. (The
  // encoded length takes up more than 1 byte for strings that are longer than
  // 127 bytes, but this is an estimate.)
  return 2 + Buffer.byteLength(s);
}

export interface DurationHistogramOptions {
  initSize?: number;
  buckets?: number[];
}
export class DurationHistogram {
  // Note that it's legal for the values in "buckets" to be non-integers; they
  // will be floored by toArray (which is called by the protobuf encoder).
  // (We take advantage of this for field latencies specifically, because
  // the ability to return a non-1 weight from fieldLevelInstrumentation
  // means we want to build up our histograms as floating-point rather than
  // rounding after every operation.)
  private readonly buckets: number[];
  static readonly BUCKET_COUNT = 384;
  static readonly EXPONENT_LOG = Math.log(1.1);

  toArray(): number[] {
    let bufferedZeroes = 0;
    const outputArray: number[] = [];

    for (const value of this.buckets) {
      if (value === 0) {
        bufferedZeroes++;
      } else {
        if (bufferedZeroes === 1) {
          outputArray.push(0);
        } else if (bufferedZeroes !== 0) {
          outputArray.push(-bufferedZeroes);
        }
        outputArray.push(Math.floor(value));
        bufferedZeroes = 0;
      }
    }
    return outputArray;
  }

  static durationToBucket(durationNs: number): number {
    const log = Math.log(durationNs / 1000.0);
    const unboundedBucket = Math.ceil(log / DurationHistogram.EXPONENT_LOG);

    // Compare <= 0 to catch -0 and -infinity
    return unboundedBucket <= 0 || Number.isNaN(unboundedBucket)
      ? 0
      : unboundedBucket >= DurationHistogram.BUCKET_COUNT
        ? DurationHistogram.BUCKET_COUNT - 1
        : unboundedBucket;
  }

  incrementDuration(durationNs: number, value = 1): DurationHistogram {
    this.incrementBucket(DurationHistogram.durationToBucket(durationNs), value);
    return this;
  }

  incrementBucket(bucket: number, value = 1) {
    if (bucket >= DurationHistogram.BUCKET_COUNT) {
      // Since we don't have fixed size arrays I'd rather throw the error manually
      throw Error('Bucket is out of bounds of the buckets array');
    }

    // Extend the array if we haven't gotten it long enough to handle the new bucket
    if (bucket >= this.buckets.length) {
      const oldLength = this.buckets.length;
      this.buckets.length = bucket + 1;
      this.buckets.fill(0, oldLength);
    }

    this.buckets[bucket]! += value; // ! is safe, we've already ensured the array is long enough
  }

  combine(otherHistogram: DurationHistogram) {
    for (let i = 0; i < otherHistogram.buckets.length; i++) {
      this.incrementBucket(i, otherHistogram.buckets[i]);
    }
  }

  constructor(options?: DurationHistogramOptions) {
    const initSize = options?.initSize || 74;
    const buckets = options?.buckets;

    const arrayInitSize = Math.max(buckets?.length || 0, initSize);

    this.buckets = Array<number>(arrayInitSize).fill(0);

    if (buckets) {
      buckets.forEach((val, index) => (this.buckets[index] = val));
    }
  }
}

/**
 * Iterates over the entire trace, calling `f` on each Trace.Node found. It
 * looks under the "root" node as well as any inside the query plan. If any `f`
 * returns true, it stops walking the tree.
 *
 * Each call to `f` will receive an object that implements ResponseNamePath. If
 * `includePath` is true, `f` can call `toArray()` on it to convert the
 * linked-list representation to an array of the response name (field name)
 * nodes that you navigate to get to the node (including a "service:subgraph"
 * top-level node if this is a federated trace). Note that we don't add anything
 * to the path for index (list element) nodes. This is because the only use case
 * we have (error path statistics) does not care about list indexes (it's not
 * that interesting to know that sometimes an error was at foo.3.bar and
 * sometimes foo.5.bar, vs just generally foo.bar).
 *
 * If `includePath` is false, we don't bother to build up the linked lists, and
 * calling `toArray()` will throw.
 */
export function iterateOverTrace(
  trace: Trace,
  f: (node: Trace.INode, path: ResponseNamePath) => boolean,
  includePath: boolean,
) {
  const rootPath = includePath
    ? new RootCollectingPathsResponseNamePath()
    : notCollectingPathsResponseNamePath;
  if (trace.root) {
    if (iterateOverTraceNode(trace.root, rootPath, f)) return;
  }

  if (trace.queryPlan) {
    if (iterateOverQueryPlan(trace.queryPlan, rootPath, f)) return;
  }
}

// Helper for iterateOverTrace; returns true to stop the overall walk.
function iterateOverQueryPlan(
  node: Trace.IQueryPlanNode,
  rootPath: ResponseNamePath,
  f: (node: Trace.INode, path: ResponseNamePath) => boolean,
): boolean {
  if (!node) return false;

  if (node.fetch?.trace?.root && node.fetch.serviceName) {
    return iterateOverTraceNode(
      node.fetch.trace.root,
      rootPath.child(`service:${node.fetch.serviceName}`),
      f,
    );
  }
  if (node.flatten?.node) {
    return iterateOverQueryPlan(node.flatten.node, rootPath, f);
  }
  if (node.parallel?.nodes) {
    // We want to stop as soon as some call returns true, which happens to be
    // exactly what 'some' does.
    return node.parallel.nodes.some(node => iterateOverQueryPlan(node, rootPath, f));
  }
  if (node.sequence?.nodes) {
    // We want to stop as soon as some call returns true, which happens to be
    // exactly what 'some' does.
    return node.sequence.nodes.some(node => iterateOverQueryPlan(node, rootPath, f));
  }

  return false;
}

// Helper for iterateOverTrace; returns true to stop the overall walk.
function iterateOverTraceNode(
  node: Trace.INode,
  path: ResponseNamePath,
  f: (node: Trace.INode, path: ResponseNamePath) => boolean,
): boolean {
  // Invoke the function; if it returns true, don't descend and tell callers to
  // stop walking.
  if (f(node, path)) {
    return true;
  }

  return (
    // We want to stop as soon as some call returns true, which happens to be
    // exactly what 'some' does.
    node.child?.some(child => {
      const childPath = child.responseName ? path.child(child.responseName) : path;
      return iterateOverTraceNode(child, childPath, f);
    }) ?? false
  );
}

export interface ResponseNamePath {
  toArray(): string[];
  child(responseName: string): ResponseNamePath;
}

const notCollectingPathsResponseNamePath: ResponseNamePath = {
  toArray() {
    throw Error('not collecting paths!');
  },
  child() {
    return this;
  },
};

type CollectingPathsResponseNamePath =
  | RootCollectingPathsResponseNamePath
  | ChildCollectingPathsResponseNamePath;
class RootCollectingPathsResponseNamePath implements ResponseNamePath {
  toArray() {
    return [];
  }
  child(responseName: string) {
    return new ChildCollectingPathsResponseNamePath(responseName, this);
  }
}
class ChildCollectingPathsResponseNamePath implements ResponseNamePath {
  constructor(
    readonly responseName: string,
    readonly prev: CollectingPathsResponseNamePath,
  ) {}
  toArray() {
    const out = [];
    let curr: CollectingPathsResponseNamePath = this;
    while (curr instanceof ChildCollectingPathsResponseNamePath) {
      out.push(curr.responseName);
      curr = curr.prev;
    }
    return out.reverse();
  }
  child(responseName: string) {
    return new ChildCollectingPathsResponseNamePath(responseName, this);
  }
}
