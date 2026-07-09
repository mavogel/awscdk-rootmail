const spyVerifyDomainIdentity = jest.fn();
const spyVerifyDomainDkim = jest.fn();
const spyDeleteIdentity = jest.fn();
const spySES = jest.fn(() => ({
  verifyDomainIdentity: spyVerifyDomainIdentity,
  verifyDomainDkim: spyVerifyDomainDkim,
  deleteIdentity: spyDeleteIdentity,
}));

jest.mock('@aws-sdk/client-ses', () => ({
  SES: spySES,
}));

import { OnEventRequest } from '../src/custom-resource-types';
import { handler } from '../src/hosted-zone-dkim-verification-records.on-event-handler';

describe('hosted-zone-dkim-verification-records', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('verifies-create-domain-and-dkim-records', async () => {
    spyVerifyDomainIdentity.mockImplementation(() => (
      { VerificationToken: 'abc-token' }
    ));

    spyVerifyDomainDkim.mockImplementation(() => (
      { DkimTokens: ['dkim-token-1', 'dkim-token-2'] }
    ));

    const result = await handler(
      {
        RequestType: 'Create',
        ResourceProperties: {
          Domain: 'aws.manuel-vogel.de',
        },
      } as unknown as OnEventRequest,
    );

    expect(spyVerifyDomainIdentity).toHaveBeenCalledTimes(1);
    expect(spyVerifyDomainDkim).toHaveBeenCalledTimes(1);

    expect(result).toMatchObject(
      {
        Data: {
          VerificationToken: expect.stringMatching(/abc-token/),
          DkimTokens: expect.arrayContaining(['dkim-token-1', 'dkim-token-2']),
        },
      },
    );
  });

  it('verifies-delete-domain-and-dkim-records', async () => {
    spyDeleteIdentity.mockImplementation(() => ({}));

    await handler(
      {
        RequestType: 'Delete',
        ResourceProperties: {
          Domain: 'aws.manuel-vogel.de',
        },
      } as unknown as OnEventRequest,
    );

    expect(spyDeleteIdentity).toHaveBeenCalledTimes(1);
  });
});