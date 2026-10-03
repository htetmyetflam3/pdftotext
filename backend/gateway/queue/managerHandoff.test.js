import test from 'node:test';
import assert from 'node:assert/strict';
import { managerPayload } from './managerHandoff.js';
test('passes conversion output selected by the user', () => {
  assert.deepEqual(
    managerPayload({ job: 'extracting', method: 'default', outputFormat: 'pdf' }),
    { job: 'extracting', method: 'default', output: 'pdf' },
  );
});
test('forces only conversion-analysis manager output to docx', () => {
  assert.deepEqual(
    managerPayload({ job: 'conversion-analysis', method: 'manual', outputFormat: 'pdf' }),
    { job: 'conversion-analysis', method: 'manual', output: 'docx' },
  );
  assert.deepEqual(
    managerPayload({ job: 'extracting-analysis', method: 'default', outputFormat: 'pdf' }),
    { job: 'extracting-analysis', method: 'default', output: 'pdf' },
  );
});