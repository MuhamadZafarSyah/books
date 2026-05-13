import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export type UploadResult = {
  url: string;
  publicId: string;
  width: number;
  height: number;
};

/**
 * Upload an image buffer to Cloudinary.
 * Converts the buffer to a base64 data URI before uploading.
 * Returns the secure URL and metadata.
 */
export async function uploadImage(
  file: Buffer,
  options: {
    folder: string;
    publicId?: string;
    transformation?: Record<string, unknown>;
  },
): Promise<UploadResult> {
  const dataUri = `data:image/webp;base64,${file.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: options.folder,
    public_id: options.publicId,
    overwrite: true,
    resource_type: "image",
    transformation: options.transformation
      ? [options.transformation]
      : undefined,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  };
}

/**
 * Delete an image from Cloudinary by its public ID.
 */
export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
