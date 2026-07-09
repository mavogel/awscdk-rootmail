const spyGetAccountSendingEnabled = jest.fn();
const spyGetIdentityVerificationAttributes = jest.fn();
const spyGetIdentityDkimAttributes = jest.fn();
const spyGetIdentityNotificationAttributes = jest.fn();
const spySES = jest.fn(() => ({
  getAccountSendingEnabled: spyGetAccountSendingEnabled,
  getIdentityVerificationAttributes: spyGetIdentityVerificationAttributes,
  getIdentityDkimAttributes: spyGetIdentityDkimAttributes,
  getIdentityNotificationAttributes: spyGetIdentityNotificationAttributes,
}));

jest.mock('@aws-sdk/client-ses', () => ({
  SES: spySES,
}));

import { OnEventRequest } from '../src/custom-resource-types';
import { handler } from '../src/hosted-zone-dkim-propagation.is-complete-handler';

describe('hosted-zone-dkim-propagation-completion', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('verifies-create-dkim-propagation-completion', async () => {
    spyGetAccountSendingEnabled.mockImplementation(() => (
      { Enabled: true }
    ));

    spyGetIdentityVerificationAttributes.mockImplementation(() => (
      { VerificationAttributes: { 'aws.manuel-vogel.de': { VerificationStatus: 'Success' } } }
    ));

    spyGetIdentityDkimAttributes.mockImplementation(() => (
      { DkimAttributes: { 'aws.manuel-vogel.de': { DkimVerificationStatus: 'Success' } } }
    ));

    spyGetIdentityNotificationAttributes.mockImplementation(() => (
      { NotificationAttributes: { 'aws.manuel-vogel.de': { ForwardingEnabled: true } } }
    ));

    const result = await handler(
      {
        RequestType: 'Create',
        ResourceProperties: {
          Domain: 'aws.manuel-vogel.de',
        },
      } as unknown as OnEventRequest,
    );

    expect(result).toMatchObject({ IsComplete: true });
  });

  it('verifies-update-dkim-propagation-completion', async () => {
    const result = await handler(
      {
        RequestType: 'Update',
        ResourceProperties: {
          Domain: 'aws.manuel-vogel.de',
        },
      } as unknown as OnEventRequest,
    );

    expect(result).toMatchObject({ IsComplete: true });
  });

  it('verifies-delete-dkim-propagation-completion', async () => {
    const result = await handler(
      {
        RequestType: 'Delete',
        ResourceProperties: {
          Domain: 'aws.manuel-vogel.de',
        },
      } as unknown as OnEventRequest,
    );

    expect(result).toMatchObject({ IsComplete: true });
  });
});