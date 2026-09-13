// CDK asset hashes (e.g. Lambda bundle `S3Key`) are derived from bundled
// dependency content, so they change on every dependency version bump even
// when nothing about the stack's structure changed. Snapshotting them raw
// makes every dependency bump touch these tests for no functional reason -
// normalize them to a stable placeholder before comparing.
const ASSET_HASH_PATTERN = /[0-9a-f]{64}\.(zip|jar)\b/g;

export function normalizeAssetHashes(template: object): object {
  return JSON.parse(JSON.stringify(template).replace(ASSET_HASH_PATTERN, '<ASSET_HASH>.$1'));
}
