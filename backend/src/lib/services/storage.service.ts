import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';


export class StorageService {
  private static uploadDir = path.join(process.cwd(), 'public', 'uploads');

  /**
   * Uploads a file to the specified directory within the uploads folder.
   * Returns the relative URL for public access.
   */
  static async uploadFile(file: Express.Multer.File, directory: string): Promise<string> {
    const targetDir = path.join(this.uploadDir, directory);
    
    // Ensure the target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fileExtension = path.extname(file.originalname);
    const fileName = `${randomUUID()}${fileExtension}`;

    const filePath = path.join(targetDir, fileName);

    // Save the file to local storage
    // If we migrate to S3, we would replace this with the S3 SDK's upload command
    fs.writeFileSync(filePath, file.buffer);

    // Return the relative URL string
    // In production (S3), this would return the full S3 URL or the key
    return `/uploads/${directory}/${fileName}`;
  }

  /**
   * Deletes a file from storage given its public URL.
   */
  static async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;

    // Convert public URL back to a local filesystem path
    const relativePath = fileUrl.replace('/uploads/', '');
    const filePath = path.join(this.uploadDir, relativePath);

    if (fs.existsSync(filePath)) {
      // In production (S3), we would call the S3 delete object command
      fs.unlinkSync(filePath);
    }
  }
}
