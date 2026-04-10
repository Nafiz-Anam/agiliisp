import path from 'path';
import fs from 'fs';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

/** Ensure a directory exists */
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

/**
 * Move an uploaded file (from multer temp) into an organized folder and return its public URL path.
 * E.g. folder = "customers/abc123", filename kept from multer.
 */
const upload = (file: Express.Multer.File, folder: string): string => {
  const targetDir = path.join(UPLOADS_ROOT, folder);
  ensureDir(targetDir);

  const dest = path.join(targetDir, file.filename);
  fs.renameSync(file.path, dest);

  return `/uploads/${folder}/${file.filename}`;
};

/**
 * Delete a file given its public URL path (e.g. "/uploads/customers/abc/file.jpg").
 */
const remove = (urlPath: string): void => {
  if (!urlPath) return;
  const filePath = path.join(process.cwd(), urlPath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export default { upload, remove };
