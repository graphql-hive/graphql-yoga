---
'@envelop/core': patch
'@envelop/types': patch
---

Fix swapped `options` and `typeInfo` in the `onValidate` hook params.

The validate wrapper now follows the graphql-js v16/v17 `validate(schema, documentAST, rules, options, typeInfo)` argument order, so `params.options` contains the validation options (e.g. `maxErrors`, `hideSuggestions`) and `params.typeInfo` contains the (deprecated) `TypeInfo` instance. Previously, the two were swapped. Arguments are still forwarded to the validate function in the same positions they were passed.
