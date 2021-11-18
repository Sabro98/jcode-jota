import * as assert from 'assert';
import { after } from 'mocha';
import { encodeUserId, decodeUserID } from '../../function';
import * as vscode from 'vscode';

suite('Function Test Suite', () => {
  after(() => {
    vscode.window.showInformationMessage('All tests done!');
  });

  test('base64 test', () => {
    assert.strictEqual('aW5oeXVr', encodeUserId('inhyuk'));
    assert.strictEqual('inhyuk', decodeUserID('aW5oeXVr'));
  });
});
