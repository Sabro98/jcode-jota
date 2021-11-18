import { expect } from 'chai';
import { encodeUserId, decodeUserID } from '../../function';

describe('run test', () => {
  it('base64 encode test', () => {
    expect(encodeUserId('inhyuk')).to.equal('aW5oeXVr');
  });
  it('base', () => {
    expect(encodeUserId('aW5oeXVr')).to.equal('inhyuk');
  });
});
