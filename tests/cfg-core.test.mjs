import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBindings, exportWithOverrides} from '../cfg-core.mjs';

test('unchanged imported CFG exports byte-for-byte, including aliases, exec and CRLF', () => {
  const raw = '// keep me\r\nalias "hello" "say hi"\r\nexec autoexec.cfg\r\nbind "w" "+forward"\r\n';
  const {bindings} = parseBindings(raw);
  assert.equal(bindings.w, '+forward');
  assert.equal(exportWithOverrides(raw, bindings, {...bindings}), raw);
});

test('changes override existing binds at end without deleting anything', () => {
  const raw = '// commentary\nbind "w" "+forward"\nexec other.cfg\n';
  const before = parseBindings(raw).bindings;
  const out = exportWithOverrides(raw, before, {...before, w: '+back', x: 'say "hello"; +attack'});
  assert.ok(out.startsWith(raw));
  assert.match(out, /bind "w" "\+back"/);
  assert.match(out, /bind "x" "say \\"hello\\"; \+attack"/);
  assert.equal(parseBindings(out).bindings.w, '+back');
  assert.equal(parseBindings(out).bindings.x, 'say "hello"; +attack');
  assert.equal(out.match(/BEGIN ERNOLDUS/g)?.length, 1);
});

test('unbind emits a final unbind instead of modifying original', () => {
  const raw = 'bind "space" "+jump"\n';
  const before = parseBindings(raw).bindings;
  const out = exportWithOverrides(raw, before, {});
  assert.ok(out.startsWith(raw));
  assert.match(out, /unbind "space"/);
  assert.deepEqual(parseBindings(out).bindings, {});
});

test('simple quoted and unquoted binds, unbind and unbindall are interpreted', () => {
  const text = 'bind w +forward\nbind "x" "say \\"Hello\\"; +attack"\nunbind w\n' +
    'unbindall\nbind a +moveleft // comment\nbind "A" "+moveright"\n';
  assert.deepEqual(parseBindings(text), {bindings:{a:'+moveright'}, unsupportedLines:0});
});

test('unrecognized complex bind lines are counted and preserved unchanged', () => {
  const raw = '// bind ignored\nbind "z" "say x"; echo later\nbind "q" "+attack"\n';
  const {bindings, unsupportedLines} = parseBindings(raw);
  assert.equal(unsupportedLines, 1);
  assert.equal(bindings.z, undefined);
  assert.equal(bindings.q, '+attack');
  assert.equal(exportWithOverrides(raw, bindings, bindings), raw);
});

test('no-op reassignments add no override block', () => {
  const raw = 'bind "1" "slot1"';
  const {bindings} = parseBindings(raw);
  assert.equal(exportWithOverrides(raw, bindings, {...bindings, '1':'slot1'}), raw);
});
