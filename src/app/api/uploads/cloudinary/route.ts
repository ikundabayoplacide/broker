import { NextResponse, type NextRequest } from "next/server";
import { getCloudinary, getFolderForField } from "@/lib/cloudinary";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const DEFAULT_FOLDER = "general_uploads";

const asError = (err: unknown): Error => {
  if (err instanceof Error) return err;
  return new Error(typeof err === "string" ? err : "Unknown error");
};

export async function POST(request: NextRequest) {
  try {
    const { image, field, fileName, fileType, fileSize } = await request.json();

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    if (!image.startsWith("data:")) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }

    if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds the 10MB limit" },
        { status: 413 }
      );
    }

    const folder = typeof field === "string" ? getFolderForField(field) : DEFAULT_FOLDER;
    const cloudinary = getCloudinary();

    const uploadResult = await cloudinary.uploader.upload(image, {
      folder,
      resource_type: "auto",
      use_filename: fileName ? true : false,
      unique_filename: true,
      overwrite: false,
      ...(fileName && { public_id: fileName.split('.')[0] }),
    });

    return NextResponse.json(
      {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        bytes: uploadResult.bytes,
        format: uploadResult.format,
        resourceType: uploadResult.resource_type,
        folder: uploadResult.folder,
      },
      { status: 201 }
    );
  } catch (err) {
    const error = asError(err);
    console.error("Cloudinary upload failed", error);
    
    // Check for network connectivity issues
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return NextResponse.json(
        { error: "Cannot connect to Cloudinary. Please check network connectivity." },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return NextResponse.json(null, {
    status: 204,
    headers: {
      "Allow": "POST, OPTIONS",
    },
  });
}
