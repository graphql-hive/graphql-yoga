---
'@envelop/sentry': minor
---

Add support for `@sentry/node` v11.

The supported peer dependency range is now
`^8.0.0 || ^9.0.0 || ^10.0.0 || ^11.0.0` — v8, v9 and v10 remain supported.

No changes to your `useSentry()` configuration are required. The v11 breaking changes affect
`Sentry.init` options and the OpenTelemetry setup, which this plugin does not touch — see
[Sentry's v10 to v11 migration guide](https://docs.sentry.io/platforms/javascript/migration/v10-to-v11/)
for the SDK-level changes you may need to make (for example `sendDefaultPii` → `dataCollection` and
`skipOpenTelemetrySetup` → `enableOpenTelemetrySetup`).

Note that Sentry deprecated the underlying `forceTransaction` span option in v11 and plans to remove
it in v12. The plugin's `forceTransaction` option is still honored by `@sentry/node` v11 and is left
unchanged for now.
