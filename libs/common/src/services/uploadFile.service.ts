import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import * as crypto from 'crypto';
import * as path from 'path';
import { CloudinaryConfig } from './cloudinaryConfig';

export interface UploadResult {
  publicUrl: string;
  filename: string;
  originalName: string;
  size: number;
  contentType: string;
}

export interface FileUploadOptions {
  allowedMimeTypes?: string[];
  maxSize?: number; // in bytes
}

@Injectable()
export class UploadFileService {
  private storage: Storage;
  private bucketName: string;
  private cloudinary: any;

  constructor(private configService: ConfigService) {
    this.cloudinary = CloudinaryConfig.initialize(
      this.configService.get('CLOUDINARY_NAME'),
      this.configService.get('CLOUDINARY_KEY'),
      this.configService.get('CLOUDINARY_SECRET'),
    );
    // Initialize Google Cloud Storage
    // this.bucketName = this.configService.getOrThrow('GCS_BUCKET_NAME');
    // const serviceAccountPath = path.join(process.cwd(), 'urcabpassenger-demo.json');
    // this.storage = new Storage({
    //   keyFilename: serviceAccountPath,
    //   projectId: this.configService.getOrThrow('FIREBASE_PROJECT_ID'),
    // });
  }

  async uploadFileCloudinary(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    options: FileUploadOptions = {},
  ): Promise<UploadResult> {
    try {
      // Validate file
      this.validateFile(fileBuffer, mimeType, options);

      const base64File = fileBuffer.toString('base64');
      const base64String = `data:${mimeType};base64,${base64File}`;

      // Upload to Cloudinary
      const uploadResponse = await this.cloudinary.uploader.upload(base64String, {
        resource_type: 'auto',
        filename_override: originalName,
      });

      return {
        publicUrl: uploadResponse.secure_url,
        filename: uploadResponse.public_id,
        originalName,
        size: fileBuffer.length,
        contentType: mimeType,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      console.error('Cloudinary Upload error:', error);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  // async uploadFile(
  //   fileBuffer: Buffer,
  //   originalName: string,
  //   mimeType: string,
  //   options: FileUploadOptions = {},
  // ): Promise<UploadResult> {
  //   try {
  //     // Validate file
  //     this.validateFile(fileBuffer, mimeType, options);

  //     // Generate unique filename
  //     const filename = this.generateUniqueFilename(originalName, null);

  //     // Get bucket reference
  //     const bucket = this.storage.bucket(this.bucketName);
  //     const file = bucket.file(filename);

  //     // Create write stream
  //     const stream = file.createWriteStream({
  //       metadata: {
  //         contentType: mimeType,
  //         metadata: {
  //           originalName,
  //           uploadedAt: new Date().toISOString(),
  //         },
  //       },
  //       resumable: false, // Use simple upload for smaller files
  //     });

  //     // Upload the file
  //     await new Promise<void>((resolve, reject) => {
  //       stream.on('error', (error) => {
  //         console.error('Upload error:', error);
  //         reject(new InternalServerErrorException('File upload failed'));
  //       });

  //       stream.on('finish', () => {
  //         resolve();
  //       });

  //       stream.end(fileBuffer);
  //     });

  //     // Make file public if requested
  //     // if (options.makePublic !== false) {
  //     //   await file.makePublic();
  //     // }

  //     // Generate public URL
  //     const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filename}`;

  //     return {
  //       publicUrl,
  //       filename,
  //       originalName,
  //       size: fileBuffer.length,
  //       contentType: mimeType,
  //     };
  //   } catch (error) {
  //     if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
  //       throw error;
  //     }
  //     console.error('Upload service error:', error);
  //     throw new InternalServerErrorException('File upload failed');
  //   }
  // }

  // async uploadMultipleFiles(
  //   files: Array<{ buffer: Buffer; originalName: string; mimeType: string }>,
  //   options: FileUploadOptions = {},
  // ): Promise<UploadResult[]> {
  //   const uploadPromises = files.map((file) => this.uploadFile(file.buffer, file.originalName, file.mimeType, options));

  //   return Promise.all(uploadPromises);
  // }

  // async deleteFile(filename: string): Promise<void> {
  //   try {
  //     const bucket = this.storage.bucket(this.bucketName);
  //     const file = bucket.file(filename);

  //     await file.delete();
  //     console.log(`File ${filename} deleted successfully`);
  //   } catch (error) {
  //     console.error('Delete error:', error);
  //     throw new InternalServerErrorException('File deletion failed');
  //   }
  // }

  // async getFileMetadata(filename: string) {
  //   try {
  //     const bucket = this.storage.bucket(this.bucketName);
  //     const file = bucket.file(filename);

  //     const [metadata] = await file.getMetadata();
  //     return metadata;
  //   } catch (error) {
  //     console.error('Get metadata error:', error);
  //     throw new InternalServerErrorException('Failed to get file metadata');
  //   }
  // }

  private validateFile(buffer: Buffer, mimeType: string, options: FileUploadOptions): void {
    // Check file size
    const maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB default
    if (buffer.length > maxSize) {
      throw new BadRequestException(`File size exceeds limit of ${maxSize} bytes`);
    }

    // Check mime type
    if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(`File type ${mimeType} not allowed`);
    }

    // Check if buffer is empty
    if (buffer.length === 0) {
      throw new BadRequestException('File is empty');
    }
  }

  private generateUniqueFilename(originalName: string, folder?: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(6).toString('hex');
    const fileExtension = path.extname(originalName);
    const baseName = path.basename(originalName, fileExtension);

    // Sanitize filename
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${timestamp}-${randomString}-${sanitizedBaseName}${fileExtension}`;

    return folder ? `${folder}/${uniqueFilename}` : uniqueFilename;
  }

  // Utility method to get file from URL
  extractFilenameFromUrl(url: string): string | null {
    try {
      const urlPattern = new RegExp(`https://storage\\.googleapis\\.com/${this.bucketName}/(.+)`);
      const match = url.match(urlPattern);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }
}
