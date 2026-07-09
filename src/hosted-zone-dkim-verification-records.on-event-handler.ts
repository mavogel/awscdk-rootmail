import { SES } from '@aws-sdk/client-ses';
import { OnEventRequest, OnEventResponse } from './custom-resource-types';
export const PROP_DOMAIN = 'Domain';
export const ATTR_VERIFICATION_TOKEN = 'VerificationToken';
export const ATTR_DKIM_TOKENS = 'DkimTokens';

const ses = new SES();

export async function handler(event: OnEventRequest): Promise<OnEventResponse> {
  const domain = event.ResourceProperties[PROP_DOMAIN];
  switch (event.RequestType) {
    case 'Create':
    case 'Update':
      let physicalResourceId = event.PhysicalResourceId;
      if (event.RequestType === 'Create') {
        physicalResourceId = event.RequestId;
      }

      console.log(`${event.RequestType}: Do Domain verification and DKIM records for ${event.LogicalResourceId} and domain '${domain}' with PhysicalResourceId '${physicalResourceId}'`);
      const verifyDomainResponse = await ses.verifyDomainIdentity({ Domain: domain });
      const verificationToken = verifyDomainResponse.VerificationToken;
      console.log(`${event.RequestType}: Got verification token '${verificationToken}' for domain '${domain}'`);

      const verifyDomainDkimResponse = await ses.verifyDomainDkim({ Domain: domain });
      const dkimTokens = verifyDomainDkimResponse.DkimTokens;
      console.log(`${event.RequestType}: Got DKIM tokens '${dkimTokens}' for domain '${domain}'`);

      return {
        PhysicalResourceId: physicalResourceId,
        Data: {
          [ATTR_VERIFICATION_TOKEN]: verificationToken,
          [ATTR_DKIM_TOKENS]: dkimTokens,
        },
      };
    // TODO check if delete should do nothing: https://github.com/superwerker/superwerker/blob/main/templates/rootmail.yaml#L170
    // we store in Parameter Store as well
    case 'Delete':
      console.log(`Deleting Domain identity for domain '${domain}' with PhysicalResourceId '${event.PhysicalResourceId}'`);
      const deleteResponse = await ses.deleteIdentity({ Identity: domain });
      console.log(`Deleted Domain identity for domain '${domain}'`, deleteResponse);
      return {
        PhysicalResourceId: event.PhysicalResourceId,
      };
  }
}

