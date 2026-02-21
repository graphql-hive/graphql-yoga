import { fetchPackageInfo } from '@theguild/components';

const cache = new Map<string, Awaited<ReturnType<typeof fetchPackageInfo>>>();

export async function fetchPackageInfoCachedAndRetried(
  packageName: string,
  githubReadme?: { repo: string; path: string },
  retriesLeft = 3,
  interval = 1000,
): Promise<Awaited<ReturnType<typeof fetchPackageInfo>>> {
  const cacheKey = githubReadme
    ? `${packageName}::${githubReadme.repo}::${githubReadme.path}`
    : packageName;
  if (cache.has(cacheKey)) {
    return Promise.resolve(cache.get(cacheKey)!);
  }
  try {
    const result = await retry(
      () => fetchPackageInfo(packageName, githubReadme),
      retriesLeft,
      interval,
    );
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn(`failed to fetch package info for ${packageName}`, error);
    return {
      readme: 'Readme not available',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: 'Description not available',
      weeklyNPMDownloads: 0,
    };
  }
}

function retry<T>(fn: () => Promise<T>, retriesLeft = 3, interval = 1000): Promise<T> {
  return fn().catch(error => {
    if (retriesLeft === 1) {
      throw error;
    }
    return new Promise<T>(resolve => {
      setTimeout(() => {
        resolve(retry(fn, retriesLeft - 1, interval));
      }, interval);
    });
  });
}
