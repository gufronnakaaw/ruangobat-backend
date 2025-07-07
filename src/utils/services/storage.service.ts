import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

    this.bucket = `${process.env.MODE === 'prod' ? 'ruangobat' : 'ruangobatdev'}`;
  }

  createFolder(name: string, by: string) {
    try {
      return this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: `${name}/`,
          Body: Buffer.alloc(0),
          ACL: 'public-read',
          Metadata: {
            'x-created-by': by,
          },
          ContentType: 'application/x-directory',
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'Error pada cloud storage saat membuat folder',
      );
    }
  }

  getSignedUrl({ key, type, by }: { key: string; type: string; by: string }) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: type,
        ACL: 'public-read',
        Metadata: {
          'x-created-by': by,
        },
      });

      return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    } catch (error) {
      throw new InternalServerErrorException(
        'Error pada cloud storage saat mendapatkan signed URL',
      );
    }
  }

  getLists(prefix = '') {
    try {
      return this.s3Client.send(
        new ListObjectsCommand({
          Bucket: this.bucket,
          Prefix: prefix,
          Delimiter: '/',
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'Error pada cloud storage saat mendapatkan daftar objek',
      );
    }
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

  async deleteFolder(key: string) {
    try {
      const objects = await this.s3Client.send(
        new ListObjectsCommand({
          Bucket: this.bucket,
          Prefix: key.endsWith('/') ? key : `${key}/`,
        }),
      );

      const keys = objects.Contents?.map((obj) => ({ Key: obj.Key })) ?? [];

      if (
        !keys.find((obj) => obj.Key === (key.endsWith('/') ? key : `${key}/`))
      ) {
        keys.push({ Key: key.endsWith('/') ? key : `${key}/` });
      }

      if (keys.length) {
        await this.s3Client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
              Objects: keys,
            },
          }),
        );
      }
    } catch (error) {
      throw new InternalServerErrorException(
        'Error pada cloud storage saat menghapus folder',
      );
    }
  }
}
