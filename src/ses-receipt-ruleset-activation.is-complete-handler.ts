import { S3 } from '@aws-sdk/client-s3';
import { OnEventRequest } from './custom-resource-types';
export const PROP_EMAILBUCKET_NAME = 'EmailBucketName';

const fileKey = 'RootMail/AMAZON_SES_SETUP_NOTIFICATION';

const s3 = new S3();

export interface IsCompleteHandlerResponse {
  IsComplete: boolean;
}

export async function handler(event: OnEventRequest): Promise<IsCompleteHandlerResponse> {
  const emailBucketName = event.ResourceProperties[PROP_EMAILBUCKET_NAME];

  switch (event.RequestType) {
    case 'Create':
      console.log(`Testing if '${fileKey}' file is present in the S3 bucket: ${emailBucketName}`);
      // RootMail/AMAZON_SES_SETUP_NOTIFICATION mail in the S3 bucket
      // and the test run the setup being complete.
      const result = await s3.headObject({
        Bucket: emailBucketName,
        Key: fileKey,
      });

      // check if file is present
      if (result.$metadata.httpStatusCode === 404) {
        console.log(`File ${fileKey} NOT found. IsComplete: false`);
        return {
          IsComplete: false,
        };
      }

      console.log(`File ${fileKey} found. SES setup complete. Proceeding`);
      return {
        IsComplete: true,
      };
    case 'Update':
    case 'Delete':
      return {
        IsComplete: true,
      };
  }
};
