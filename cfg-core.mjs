/**
 * Conservative Source CFG helpers. Unrecognized configuration is never deleted.
 * The editor only interprets standalone, straightforward bind/unbind statements.
 */
const quotedBind = /^\s*bind\s+"((?:\\.|[^"\\])*)"\s+"((?:\\.|[^"\\])*)"\s*(?:\/\/.*)?$/i;
const plainBind = /^\s*bind\s+([^\s";]+)\s+([^\s";]+)\s*(?:\/\/.*)?$/i;
const quotedUnbind = /^\s*unbind\s+"((?:\\.|[^"\\])*)"\s*(?:\/\/.*)?$/i;
const plainUnbind = /^\s*unbind\s+([^\s";]+)\s*(?:\/\/.*)?$/i;
const unbindAll = /^\s*unbindall\s*(?:\/\/.*)?$/i;

const decode = value => value.replace(/\\(["\\])/g, '$1');
const normalize = key => key.toLowerCase();
const escapeQuoted = value => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

export function parseBindings(source) {
  const bindings = {};
  let unsupportedLines = 0;
  for (const line of source.split(/\r\n|\n|\r/)) {
    if (unbindAll.test(line)) {
      for (const key of Object.keys(bindings)) delete bindings[key];
      continue;
    }
    const qb = line.match(quotedBind);
    if (qb) {
      bindings[normalize(decode(qb[1]))] = decode(qb[2]);
      continue;
    }
    const pb = line.match(plainBind);
    if (pb) {
      bindings[normalize(pb[1])] = pb[2];
      continue;
    }
    const qu = line.match(quotedUnbind);
    if (qu) {
      delete bindings[normalize(decode(qu[1]))];
      continue;
    }
    const pu = line.match(plainUnbind);
    if (pu) {
      delete bindings[normalize(pu[1])];
      continue;
    }
    if (/^\s*(?:bind|unbind)\b/i.test(line)) unsupportedLines++;
  }
  return {bindings, unsupportedLines};
}

/** Preserve every byte of the loaded CFG, then place explicit overrides last. */
export function exportWithOverrides(source, initial, current) {
  const changes = [];
  const allKeys = new Set([...Object.keys(initial), ...Object.keys(current)]);
  for (const key of [...allKeys].sort()) {
    const wasBound = Object.hasOwn(initial, key);
    const isBound = Object.hasOwn(current, key);
    if (wasBound === isBound && (!wasBound || initial[key] === current[key])) continue;
    if (isBound) {
      changes.push('bind "' + escapeQuoted(key) + '" "' + escapeQuoted(current[key]) + '"');
    } else {
      changes.push('unbind "' + escapeQuoted(key) + '"');
    }
  }
  if (!changes.length) return source;
  const separator = source.endsWith('\n') ? '\n' : '\n\n';
  return source + separator + '// BEGIN ERNOLDUS KEYBIND EDITOR OVERRIDES\n' +
    changes.join('\n') + '\n// END ERNOLDUS KEYBIND EDITOR OVERRIDES\n';
}
