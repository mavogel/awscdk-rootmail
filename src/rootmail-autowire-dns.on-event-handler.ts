import { Route53 } from '@aws-sdk/client-route-53';
import { SSM } from '@aws-sdk/client-ssm';
import { OnEventRequest, OnEventResponse } from './custom-resource-types';
export const PROP_DOMAIN = 'Domain';
export const PROP_SUB_DOMAIN = 'Subdomain';
export const PROP_PARENT_HOSTED_ZONE_ID = 'ParentHostedZoneId';
export const PROP_HOSTED_ZONE_PARAMETER_NAME = 'HostedZoneParameterName';
export const PROP_R53_CHANGEINFO_ID_PARAMETER_NAME = 'R53ChangeInfoIdParameterName';

const route53 = new Route53();
const ssm = new SSM();

export async function handler(event: OnEventRequest): Promise<OnEventResponse> {
  const domain = event.ResourceProperties[PROP_DOMAIN];
  // NOTE: this has to happen here as if we do this around the whole CR
  // it is not sythesized at all
  const parentHostedZoneId = event.ResourceProperties[PROP_PARENT_HOSTED_ZONE_ID];
  if (parentHostedZoneId === undefined || parentHostedZoneId.trim().length === 0) {
    switch (event.RequestType) {
      case 'Create':
        log(`${event.RequestType}: Autowire DNS is disabled for '${domain}'. Skipping. PhysicalResourceId: ${event.RequestId}`);
        return {
          PhysicalResourceId: event.RequestId,
        };
      case 'Update':
      case 'Delete':
        log(`${event.RequestType}: Autowire DNS is disabled for '${domain}'. Skipping. PhysicalResourceId: ${event.PhysicalResourceId}`);
        return {
          PhysicalResourceId: event.PhysicalResourceId,
        };
    }
  }

  const subdomain = event.ResourceProperties[PROP_SUB_DOMAIN];
  const hostedZoneParameterName = event.ResourceProperties[PROP_HOSTED_ZONE_PARAMETER_NAME];
  const r53ChangeInfoIdParameterName = event.ResourceProperties[PROP_R53_CHANGEINFO_ID_PARAMETER_NAME];

  switch (event.RequestType) {
    case 'Create':
      // 1: check if the subdomain was created and get its NS records
      const hostedZoneNameServerParameterResponse = await ssm.getParameter({
        Name: hostedZoneParameterName,
      });

      const hostedZoneNameServersAsString = hostedZoneNameServerParameterResponse.Parameter?.Value;
      log({
        event: hostedZoneNameServersAsString,
        level: 'debug',
      });

      if (hostedZoneNameServersAsString === undefined || hostedZoneNameServersAsString === '') {
        throw new Error(`hosted zone name servers not found or empty in parameter store for ${domain}: ${hostedZoneNameServersAsString}`);
      }

      const hostedZoneNameServers = hostedZoneNameServersAsString?.split(',');
      if (hostedZoneNameServers.length !== 4) {
        throw new Error(`expected exactly 4 hosted zone name servers for ${domain}. Got ${hostedZoneNameServers.length}: ${hostedZoneNameServers}`);
      }

      // 2: check if the domain has a hosted zone in the same AWS Account
      // which is a prerequisite for autowiring the DNS records
      const hostedZoneResponse = await route53.listHostedZonesByName({
        DNSName: domain,
      });

      if (hostedZoneResponse.HostedZones === undefined || hostedZoneResponse.HostedZones?.length === 0) {
        log({
          event: hostedZoneResponse,
          level: 'debug',
        });

        throw new Error(`expected to find at least one hosted zone for ${domain}`);
      }

      const filteredHostedZones = hostedZoneResponse.HostedZones?.filter((hostedZone) => {
        // the response prefix is /hostedzone/ but the input parameter is without the prefix
        return hostedZone.Id === `/hostedzone/${parentHostedZoneId}`;
      });

      if (filteredHostedZones.length !== 1) {
        log({
          event: hostedZoneResponse,
          level: 'debug',
        });

        throw new Error(`expected to find & filter exactly 1 hosted zone for ${domain}. Got ${filteredHostedZones.length}`);
      }

      // 3: now we continue with the given parent hosted zone ID

      // iterate over hosted zone records
      const listResourceRecordSetsResponse = await route53.listResourceRecordSets({
        // remove the prefix for using it as parameter
        HostedZoneId: parentHostedZoneId.replace('/hostedzone/', ''),
      });

      if (listResourceRecordSetsResponse.ResourceRecordSets === undefined) {
        log({
          event: listResourceRecordSetsResponse,
          level: 'debug',
        });

        throw new Error(`expected to find at least one resource record set for ${domain}`);
      }

      const existingNSRecordSet = listResourceRecordSetsResponse.ResourceRecordSets?.find((recordSet) => {
        // Note the trainling dot in the name at the end
        return recordSet.Name === `${subdomain}.${domain}.` && recordSet.Type === 'NS';
      });

      if (existingNSRecordSet !== undefined) {
        log({
          event: existingNSRecordSet,
          level: 'debug',
        });

        log(`NS record for Name '${subdomain}.${domain}' and type NS already exists. Skipping.`);
        return {
          PhysicalResourceId: event.RequestId,
        };
      }

      log(`NS record for Name '${subdomain}.${domain}' and type NS does not exist. Creating.`);
      // in the HZ of the domain (parentHostedZone) we create the NS record for the subdomain
      const recordSetCreationResponse = await route53.changeResourceRecordSets({
        HostedZoneId: parentHostedZoneId,
        ChangeBatch: {
          Comment: 'rootmail-autowire-dns',
          Changes: [
            {
              Action: 'CREATE',
              ResourceRecordSet: {
                Name: `${subdomain}.${domain}`,
                Type: 'NS',
                TTL: 60,
                ResourceRecords: [ // are always 4
                  { Value: hostedZoneNameServers[0] },
                  { Value: hostedZoneNameServers[1] },
                  { Value: hostedZoneNameServers[2] },
                  { Value: hostedZoneNameServers[3] },
                ],
              },
            },
          ],
        },
      });

      // we add the change info id to the parameter store so we use it in the is-complete-handler
      await ssm.putParameter({
        Name: r53ChangeInfoIdParameterName,
        Value: recordSetCreationResponse.ChangeInfo!.Id,
        Overwrite: true,
      });

      return {
        PhysicalResourceId: event.RequestId,
      };
    case 'Update':
      log(`Skipping update for NS record for Name '${subdomain}.${domain}'`);
      return {
        PhysicalResourceId: event.PhysicalResourceId,
      };
    case 'Delete':
      log(`Deleting NS record for Name '${subdomain}.${domain}' in the hosted zone with ID ${parentHostedZoneId}`);
      const recordName = `${subdomain}.${domain}`;

      try {
        let nextRecordName: string | undefined;
        let isRecordDeleted = false;
        do {
          const recordsResponse = await route53.listResourceRecordSets({
            HostedZoneId: parentHostedZoneId,
            StartRecordName: nextRecordName,
          });

          for (const recordSet of recordsResponse.ResourceRecordSets || []) {
            // Note the trainling dot in the name at the end
            if (recordSet.Name === `${recordName}.` && recordSet.Type === 'NS') {
              console.log(`Deleting record: ${recordSet.Name} ${recordSet.Type}`);
              await route53.changeResourceRecordSets({
                HostedZoneId: parentHostedZoneId,
                ChangeBatch: {
                  Changes: [
                    {
                      Action: 'DELETE',
                      ResourceRecordSet: recordSet,
                    },
                  ],
                },
              });
              console.log(`Deleted record: ${recordSet.Name} ${recordSet.Type}. Stopping here.`);
              isRecordDeleted = true;
              // we exit here as there should be only one record with the given name and type
              break;
            }
          }

          nextRecordName = recordsResponse.NextRecordName;
          if (isRecordDeleted) {
            console.log(`Record deleted: ${recordName} type 'NS'. Quitting.`);
            break;
          }
        } while (nextRecordName);
      } catch (err) {
        console.log(`Error deleting records: ${err}`);
        throw err;
      }

      return {
        PhysicalResourceId: event.PhysicalResourceId,
      };
  }
}

function log(msg: any) {
  console.log(JSON.stringify(msg));
}
