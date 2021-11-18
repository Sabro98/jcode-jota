import { expect } from 'chai';

describe('run test', () => {
  it('test index', () => {
    expect([1, 2, 3].indexOf(5)).to.equal(-1);
    expect([1, 2, 3].indexOf(0)).to.equal(-1);
    expect([1, 2, 3].indexOf(3)).to.equal(2);
  });
});
