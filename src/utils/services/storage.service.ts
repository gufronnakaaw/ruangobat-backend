import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.STORAGE_REGION,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY,
        secretAccessKey: process.env.STORAGE_SECRET_KEY,
      },
      endpoint: process.env.STORAGE_ENDPOINT,
    });

    this.bucket = `${process.env.MODE === 'prod' ? 'cdn.ruangobat.id' : 'ruangobatdev'}`;
  }

  async checkFile(key: string) {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  async uploadFile(params: { buffer: Buffer; key: string; mimetype: string }) {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: params.key,
          Body: params.buffer,
          ContentType: params.mimetype,
          ACL: 'public-read',
        }),
      );

      return `${process.env.STORAGE_ENDPOINT}/${this.bucket}/${params.key}`;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Error pada cloud storage saat mengupload file',
      );
    }
  }

  deleteFile(key: string) {
    try {
      return this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'Error pada cloud storage saat menghapus file',
      );
    }
  }
}
