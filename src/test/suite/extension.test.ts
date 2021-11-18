// import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
// import * as myExtension from '../../extension';
import { expect } from 'chai';

describe('run test', () => {
  it('test index', () => {
    expect([1, 2, 3].indexOf(5)).to.equal(-1);
    expect([1, 2, 3].indexOf(0)).to.equal(-1);
    expect([1, 2, 3].indexOf(3)).to.equal(2);
  });
});
// suite('Extension Test Suite', () => {
//   test('Sample test', () => {
//     assert.strictEqual(-1, [1, 2, 3].indexOf(5));
//     assert.strictEqual(-1, [1, 2, 3].indexOf(0));
//   });
// });
