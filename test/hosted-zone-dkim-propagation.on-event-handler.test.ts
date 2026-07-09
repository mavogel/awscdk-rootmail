import { OnEventRequest } from '../src/custom-resource-types';
import { handler } from '../src/hosted-zone-dkim-propagation.on-event-handler';

describe('hosted-zone-dkim-propagation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('verifies-create-dkim-propagation', async () => {
    const result = await handler(
      {
        RequestType: 'Create',
        RequestId: 'mocked-event-request-id',
      } as unknown as OnEventRequest,
    );

    expect(result).toMatchObject(
      {
        PhysicalResourceId: 'mocked-event-request-id',
      },
    );
  });

  it('verifies-update-dkim-propagation', async () => {
    const result = await handler(
      {
        RequestType: 'Update',
        RequestId: 'mocked-event-request-id',
        PhysicalResourceId: 'mocked-physical-resource-id',
      } as unknown as OnEventRequest,
    );

    expect(result).toMatchObject(
      {
        PhysicalResourceId: 'mocked-physical-resource-id',
      },
    );
  });

  it('verifies-delete-dkim-propagation', async () => {
    const result = await handler(
      {
        RequestType: 'Delete',
        RequestId: 'mocked-event-request-id',
        PhysicalResourceId: 'mocked-physical-resource-id',
      } as unknown as OnEventRequest,
    );

    expect(result).toMatchObject(
      {
        PhysicalResourceId: 'mocked-physical-resource-id',
      },
    );
  });
});