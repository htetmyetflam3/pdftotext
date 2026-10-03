# Pending parser map changes

These corrections are currently applied by the Python cleanup path but are not yet sealed into `master.json`. They must be applied together so the JavaScript engine and parser remain equivalent.

## Asat imposter

The extracted grammar text contains `ဥ်` where the intended Unicode spelling is `ဉ်`. The correction is:

```text
ဥ် -> ဉ်
```

The same correction is needed for words such as `မျဉ်း`, `ယှဉ်`, `အကျဉ်း`, and `စီစဉ်`. Legitimate standalone `ဥ` forms must remain unchanged.

## NFC spelling

U+1037 and U+103A have different combining classes. NFC can rewrite the sequence, so entries containing both marks need both spellings:

```text
ဥ်  -> ဉ်
ဥ့် -> ဉ့်
```

This is a general rule for every imposter key containing both an asat and a dot below, not only the examples above. Regenerate the sealed map before moving this file to history.
