import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: Bun.env.AWS_REGION,
  endpoint: Bun.env.MINIO_ENDPOINT,
  credentials: {
    accessKeyId: Bun.env.MINIO_ROOT_USER!,
    secretAccessKey: Bun.env.MINIO_ROOT_PASSWORD!,
  },
  forcePathStyle: true,
});

export const BUCKET_NAME = Bun.env.MINIO_BUCKET;
