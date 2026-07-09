const spyGetParameter = jest.fn();
const spyPutParameter = jest.fn();
const spySSM = jest.fn(() => ({
  getParameter: spyGetParameter,
  putParameter: spyPutParameter,
}));
const spyListHostedZonesByName = jest.fn();
const spyListResourceRecordSets = jest.fn();
const spyChangeResourceRecordSets = jest.fn();
const spyRoute53 = jest.fn(() => ({
  listHostedZonesByName: spyListHostedZonesByName,
  listResourceRecordSets: spyListResourceRecordSets,
  changeResourceRecordSets: spyChangeResourceRecordSets,
}));

jest.mock('@aws-sdk/client-ssm', () => ({
  SSM: spySSM,
}));

jest.mock('@aws-sdk/client-route-53', () => ({
  Route53: spyRoute53,
}));

import { OnEventRequest } from '../src/custom-resource-types';
import { handler } from '../src/rootmail-autowire-dns.on-event-handler';

describe('wire-rootmail-dns', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('wire-dns-ns-records', async () => {
    spyGetParameter.mockImplementation(() => ({
      Parameter: {
        Value: 'ns-1111.awsdns-00.co.uk,ns-2222.awsdns-00.co.uk,ns-3333.awsdns-00.de,ns-4444.awsdns-00.com',
      },
    }));

    spyListHostedZonesByName.mockImplementation(() => ({
      HostedZones: [
        { Id: '/hostedzone/Z1234567890CC2' },
      ],
    }));

    spyListResourceRecordSets.mockImplementation(() => ({
      ResourceRecordSets: [
        { Name: 'another.domain.com.', Type: 'NS' },
      ],
    }));

    spyChangeResourceRecordSets.mockImplementation(() => ({
      ChangeInfo: { Status: 'PENDING' },
    }));

    spyPutParameter.mockImplementation(() => ({}));

    await handler(
      {
        RequestType: 'Create',
        ResourceProperties: {
          Domain: 'manuel-vogel.de',
          Subdomain: 'aws',
          HostedZoneParameterName: '/rootmail/dns_name_servers',
          R53ChangeInfoIdParameterName: '/rootmail/auto_wire_r53_changeinfo_id',
          ParentHostedZoneId: 'Z1234567890CC2',
        },
      } as unknown as OnEventRequest,
    );

    expect(spyGetParameter).toHaveBeenCalledTimes(1);
    expect(spyListHostedZonesByName).toHaveBeenCalledTimes(1);
    expect(spyListResourceRecordSets).toHaveBeenCalledTimes(1);
    expect(spyChangeResourceRecordSets).toHaveBeenCalledTimes(1);
    expect(spyPutParameter).toHaveBeenCalledTimes(1);
  });

  it('dns-ns-records-already-exist', async () => {
    spyGetParameter.mockImplementation(() => ({
      Parameter: {
        Value: 'ns-1111.awsdns-00.co.uk,ns-2222.awsdns-00.co.uk,ns-3333.awsdns-00.de,ns-4444.awsdns-00.com',
      },
    }));

    spyListHostedZonesByName.mockImplementation(() => ({
      HostedZones: [
        { Id: '/hostedzone/Z1234567890CC2' },
      ],
    }));

    spyListResourceRecordSets.mockImplementation(() => ({
      ResourceRecordSets: [
        // record already exist
        { Name: 'aws.manuel-vogel.de.', Type: 'NS' },
      ],
    }));

    await handler(
      {
        RequestType: 'Create',
        ResourceProperties: {
          Domain: 'manuel-vogel.de',
          Subdomain: 'aws',
          HostedZoneParameterName: '/rootmail/dns_name_servers',
          R53ChangeInfoIdParameterName: '/rootmail/auto_wire_r53_changeinfo_id',
          ParentHostedZoneId: 'Z1234567890CC2',
        },
      } as unknown as OnEventRequest,
    );

    expect(spyGetParameter).toHaveBeenCalledTimes(1);
    expect(spyListHostedZonesByName).toHaveBeenCalledTimes(1);
    expect(spyListResourceRecordSets).toHaveBeenCalledTimes(1);
    expect(spyChangeResourceRecordSets).not.toHaveBeenCalled();
    expect(spyPutParameter).not.toHaveBeenCalled();
  });

  it('dns-ns-records-on-update', async () => {
    await handler(
      {
        RequestType: 'Update',
        ResourceProperties: {
          Domain: 'manuel-vogel.de',
          Subdomain: 'aws',
          HostedZoneParameterName: '/rootmail/dns_name_servers',
          R53ChangeInfoIdParameterName: '/rootmail/auto_wire_r53_changeinfo_id',
          ParentHostedZoneId: 'Z1234567890CC2',
        },
      } as unknown as OnEventRequest,
    );

    expect(spyGetParameter).not.toHaveBeenCalled();
    expect(spyListHostedZonesByName).not.toHaveBeenCalled();
    expect(spyListResourceRecordSets).not.toHaveBeenCalled();
    expect(spyChangeResourceRecordSets).not.toHaveBeenCalled();
    expect(spyPutParameter).not.toHaveBeenCalled();
  });
});

it('dns-ns-records-on-delete', async () => {
  spyListResourceRecordSets.mockImplementation(() => ({
    ResourceRecordSets: [
      { Name: 'aws.manuel-vogel.de.', Type: 'NS' },
    ],
  }));

  spyChangeResourceRecordSets.mockImplementation(() => ({}));

  await handler(
    {
      RequestType: 'Delete',
      ResourceProperties: {
        Domain: 'manuel-vogel.de',
        Subdomain: 'aws',
        ParentHostedZoneId: 'Z1234567890CC2',
      },
    } as unknown as OnEventRequest,
  );

  expect(spyListResourceRecordSets).toHaveBeenCalledTimes(1);
  expect(spyChangeResourceRecordSets).toHaveBeenCalledTimes(1);
});