const spyCreateReceiptRuleSet = jest.fn();
const spyCreateReceiptRule = jest.fn();
const spySetActiveReceiptRuleSet = jest.fn();
const spyDeleteReceiptRule = jest.fn();
const spyDeleteReceiptRuleSet = jest.fn();
const spySES = jest.fn(() => ({
  createReceiptRuleSet: spyCreateReceiptRuleSet,
  createReceiptRule: spyCreateReceiptRule,
  setActiveReceiptRuleSet: spySetActiveReceiptRuleSet,
  deleteReceiptRule: spyDeleteReceiptRule,
  deleteReceiptRuleSet: spyDeleteReceiptRuleSet,
}));

jest.mock('@aws-sdk/client-ses', () => ({
  SES: spySES,
}));

import { OnEventRequest } from '../src/custom-resource-types';
import { handler } from '../src/ses-receipt-ruleset-activation.on-event-handler';

describe('ses-receipt-ruleset-activation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('create-ses-receipt-ruleset-activation', async () => {
    spyCreateReceiptRuleSet.mockImplementation(() => ({}));

    spyCreateReceiptRule.mockImplementation(() => ({}));

    spySetActiveReceiptRuleSet.mockImplementation(() => ({}));

    await handler(
      {
        RequestType: 'Create',
        ResourceProperties: {
          Domain: 'manuel-vogel.de',
          Subdomain: 'aws',
          EmailBucket: 'email-bucket',
          OpsSantaFunctionArn: 'func-arn',
        },
      } as unknown as OnEventRequest,
    );

    expect(spyCreateReceiptRuleSet).toHaveBeenCalledTimes(1);
    expect(spyCreateReceiptRule).toHaveBeenCalledTimes(1);
    expect(spySetActiveReceiptRuleSet).toHaveBeenCalledTimes(1);
  });

  it('update-ses-receipt-ruleset-activation', async () => {
    spyCreateReceiptRuleSet.mockImplementation(() => ({}));

    spyCreateReceiptRule.mockImplementation(() => ({}));

    spySetActiveReceiptRuleSet.mockImplementation(() => ({}));

    await handler(
      {
        RequestType: 'Update',
        ResourceProperties: {
          Domain: 'manuel-vogel.de',
          Subdomain: 'aws',
          EmailBucket: 'email-bucket',
          OpsSantaFunctionArn: 'func-arn',
          RulesetSettleTimeSeconds: 1,
        },
      } as unknown as OnEventRequest,
    );

    expect(spyCreateReceiptRuleSet).not.toHaveBeenCalled();
    expect(spyCreateReceiptRule).not.toHaveBeenCalled();
    expect(spySetActiveReceiptRuleSet).not.toHaveBeenCalled();
  });

  it('delete: ses receipt ruleset activation', async () => {
    spyDeleteReceiptRuleSet.mockImplementation(() => ({}));

    spyDeleteReceiptRule.mockImplementation(() => ({
      promise() {
        return Promise.resolve();
      },
    }));

    spySetActiveReceiptRuleSet.mockImplementation(() => ({}));

    await handler(
      {
        RequestType: 'Delete',
        ResourceProperties: {
          Domain: 'manuel-vogel.de',
          Subdomain: 'aws',
          EmailBucket: 'email-bucket',
          OpsSantaFunctionArn: 'func-arn',
          RulesetSettleTimeSeconds: 1,
        },
      } as unknown as OnEventRequest,
    );

    expect(spySetActiveReceiptRuleSet).toHaveBeenCalledTimes(1);
    expect(spyDeleteReceiptRule).toHaveBeenCalledTimes(1);
    expect(spyDeleteReceiptRuleSet).toHaveBeenCalledTimes(1);
  });
});