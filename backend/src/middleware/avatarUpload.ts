import { mkdirSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";

export const avatarUploadDir =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

mkdirSync(avatarUploadDir, { recursive: true });

const extensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export class AvatarUploadError extends Error {}

export const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: avatarUploadDir,
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${extensions[file.mimetype]}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!extensions[file.mimetype]) {
      callback(new AvatarUploadError("Use a JPG, PNG, or WebP image."));
      return;
    }
    callback(null, true);
  },
});
