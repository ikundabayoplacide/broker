import { v2 as cloudinary } from "cloudinary";

let isConfigured = false;

const ensureConfigured = () => {
  if (isConfigured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary environment variables are not fully set. Please define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
    // Add timeout and retry for cPanel
    timeout: 60000,
    ...(process.env.NODE_ENV === 'production' && {
      // Use different upload endpoint for cPanel
      upload_prefix: 'https://api.cloudinary.com',
    }),
  });

  isConfigured = true;
};

export const getCloudinary = () => {
  ensureConfigured();
  return cloudinary;
};

export type CloudinaryAssetFolder =
  | "passport_photos"
  | "id_documents"
  | "general_uploads";

export const CLOUDINARY_DEFAULT_UPLOAD_FOLDER: CloudinaryAssetFolder = "general_uploads";

export const getFolderForField = (field: string): CloudinaryAssetFolder => {
  switch (field) {
    case "passportPhoto":
      return "passport_photos";
    case "idDocument":
      return "id_documents";
    default:
      return CLOUDINARY_DEFAULT_UPLOAD_FOLDER;
  }
};
