import { SES } from '@aws-sdk/client-ses';
import { OnEventRequest } from './custom-resource-types';
export const PROP_DOMAIN = 'Domain';

const ses = new SES();

export interface IsCompleteHandlerResponse {
  IsComplete: boolean;
}

export async function handler(event: OnEventRequest): Promise<IsCompleteHandlerResponse> {
  const domain = event.ResourceProperties[PROP_DOMAIN];

  switch (event.RequestType) {
    case 'Create':
      const isReady = await internalHandler(domain);
      return { IsComplete: isReady };
    case 'Update':
    case 'Delete':
      return {
        IsComplete: true,
      };
  }
}

function log(msg: any) {
  console.log(JSON.stringify(msg));
}

async function internalHandler(domain: string): Promise<boolean> {

  log({
    domain: domain,
    level: 'debug',
  });

  const sendingResponse = await ses.getAccountSendingEnabled({});
  if (!sendingResponse.Enabled) {
    return false;
  }
  log('sending enabled');

  const identityVerificationResponse = await ses.getIdentityVerificationAttributes({ Identities: [domain] });
  const identityVerificationStatus = identityVerificationResponse.VerificationAttributes![domain].VerificationStatus;
  if (identityVerificationStatus !== 'Success') {
    log(`Identity Verification status not successful. Was '${identityVerificationStatus}'`);
    return false;
  }
  log('identitity verification successful');

  const identityDkimRes = await ses.getIdentityDkimAttributes({ Identities: [domain] });
  const identityDkimStatus = identityDkimRes.DkimAttributes![domain].DkimVerificationStatus;
  if (identityDkimStatus !== 'Success') {
    log(`DKIM status not successful. Was '${identityDkimStatus}'`);
    return false;
  }
  log('DKIM verification successful');

  const identityNotificationRes = await ses.getIdentityNotificationAttributes({ Identities: [domain] });
  const forwardingEnabled = identityNotificationRes.NotificationAttributes![domain].ForwardingEnabled;
  if (!forwardingEnabled) {
    log(`Forwarding not enabled. Was '${forwardingEnabled}'`);
    return false;
  }
  log('forwarding enabled');
  return true;
}

