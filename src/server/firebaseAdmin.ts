import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getFirebaseProjectId(): string {
  if (process.env.FIREBASE_PROJECT_ID) {
    return process.env.FIREBASE_PROJECT_ID;
  }
  try {
    const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.projectId === 'string' && parsed.projectId.trim()) {
      return parsed.projectId.trim();
    }
  } catch {
    // Fallback to known project ID
  }
  return 'plexiform-collector-mxjsq';
}

export function ensureFirebaseAdminApp() {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }
  const projectId = getFirebaseProjectId();
  return initializeApp({ projectId });
}

export class AuthVerificationError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 401, code = 'UNAUTHENTICATED') {
    super(message);
    this.name = 'AuthVerificationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
}

/**
 * Verifies a Firebase ID token from the Authorization: Bearer <token> header
 * using Firebase Admin SDK. Rejects unauthenticated or invalid requests.
 * Never trusts any userId sent in the request body.
 */
export async function verifyFirebaseIdToken(
  authorizationHeader: string | undefined
): Promise<VerifiedFirebaseUser> {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') {
    throw new AuthVerificationError(
      'Missing Authorization header. Please sign in with Google to use AI Food Recognition.',
      401,
      'MISSING_AUTH_HEADER'
    );
  }

  const trimmed = authorizationHeader.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    throw new AuthVerificationError(
      'Invalid Authorization header format. Expected Bearer <Firebase_ID_Token>.',
      401,
      'INVALID_AUTH_FORMAT'
    );
  }

  const idToken = trimmed.slice(7).trim();
  if (!idToken || idToken.length < 20) {
    throw new AuthVerificationError(
      'Empty or malformed Firebase ID token.',
      401,
      'MALFORMED_TOKEN'
    );
  }

  try {
    ensureFirebaseAdminApp();
    const decoded: DecodedIdToken = await getAuth().verifyIdToken(idToken);
    if (!decoded || !decoded.uid) {
      throw new AuthVerificationError(
        'Token verification succeeded but no valid Firebase UID was found.',
        401,
        'MISSING_UID'
      );
    }
    return {
      uid: decoded.uid,
      email: decoded.email,
    };
  } catch (err) {
    if (err instanceof AuthVerificationError) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : 'Invalid or expired Firebase ID token';
    throw new AuthVerificationError(
      `Authentication failed: ${msg}`,
      401,
      'INVALID_ID_TOKEN'
    );
  }
}

// ============================================================================
// Per-User Sliding-Window Rate Limiter
// ============================================================================

const userRequestBuckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkUserRateLimit(
  uid: string,
  maxRequestsPerWindow = 10,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const previous = (userRequestBuckets.get(uid) || []).filter((ts) => ts > cutoff);

  if (previous.length >= maxRequestsPerWindow) {
    const oldestInWindow = previous[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestInWindow + windowMs - now) / 1000)
    );
    userRequestBuckets.set(uid, previous);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  previous.push(now);
  userRequestBuckets.set(uid, previous);

  return {
    allowed: true,
    remaining: Math.max(0, maxRequestsPerWindow - previous.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimitForUser(uid?: string): void {
  if (uid) {
    userRequestBuckets.delete(uid);
  } else {
    userRequestBuckets.clear();
  }
}

// ============================================================================
// Server-Side Image MIME Type, Magic Bytes & File Size Validation
// ============================================================================

export const ALLOWED_FOOD_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedFoodImageMime = (typeof ALLOWED_FOOD_IMAGE_MIMES)[number];

export const MAX_SERVER_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB decoded binary max
export const MIN_SERVER_IMAGE_BYTES = 32; // Minimum valid image header size

export class PayloadValidationError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'INVALID_PAYLOAD') {
    super(message);
    this.name = 'PayloadValidationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface ValidatedFoodImagePayload {
  cleanBase64: string;
  mimeType: AllowedFoodImageMime;
  byteLength: number;
  language: 'en' | 'bn';
}

function matchesMagicBytes(buf: Buffer, mimeType: AllowedFoodImageMime): boolean {
  if (buf.length < 12) return false;

  if (mimeType === 'image/jpeg') {
    // JPEG starts with FF D8 FF
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    // PNG starts with 89 50 4E 47 0D 0A 1A 0A
    return (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
    );
  }

  if (mimeType === 'image/webp') {
    // WebP starts with "RIFF" (52 49 46 46) at 0..3 and "WEBP" (57 45 42 50) at 8..11
    return (
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    );
  }

  return false;
}

export function validateFoodImagePayload(body: unknown): ValidatedFoodImagePayload {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new PayloadValidationError(
      'Request body must be a valid JSON object.',
      400,
      'INVALID_JSON_OBJECT'
    );
  }

  const record = body as Record<string, unknown>;
  const rawMime = typeof record.mimeType === 'string' ? record.mimeType.trim().toLowerCase() : '';
  const rawImage = typeof record.imageBase64 === 'string' ? record.imageBase64.trim() : '';
  const rawLang = record.language;

  if (rawLang !== undefined && rawLang !== 'en' && rawLang !== 'bn') {
    throw new PayloadValidationError(
      'Invalid language parameter. Must be "en" or "bn".',
      400,
      'INVALID_LANGUAGE'
    );
  }

  if (!ALLOWED_FOOD_IMAGE_MIMES.includes(rawMime as AllowedFoodImageMime)) {
    throw new PayloadValidationError(
      'Unsupported image format. Only JPEG, PNG, and WebP images are supported.',
      400,
      'UNSUPPORTED_MIME_TYPE'
    );
  }

  const mimeType = rawMime as AllowedFoodImageMime;

  if (!rawImage) {
    throw new PayloadValidationError(
      'Image data is required.',
      400,
      'MISSING_IMAGE_DATA'
    );
  }

  // Strip optional data URI prefix if present
  let cleanBase64 = rawImage;
  const dataUriMatch = rawImage.match(/^data:([^;]+);base64,(.+)$/i);
  if (dataUriMatch) {
    const prefixMime = dataUriMatch[1].trim().toLowerCase();
    if (prefixMime !== mimeType) {
      throw new PayloadValidationError(
        `Data URI MIME type (${prefixMime}) does not match declared mimeType (${mimeType}).`,
        400,
        'MIME_MISMATCH'
      );
    }
    cleanBase64 = dataUriMatch[2].trim();
  }

  // Remove whitespace/newlines
  cleanBase64 = cleanBase64.replace(/\s+/g, '');

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64)) {
    throw new PayloadValidationError(
      'Invalid base64 image encoding.',
      400,
      'INVALID_BASE64'
    );
  }

  const decodedBuffer = Buffer.from(cleanBase64, 'base64');
  const byteLength = decodedBuffer.byteLength;

  if (byteLength < MIN_SERVER_IMAGE_BYTES) {
    throw new PayloadValidationError(
      'Uploaded image is empty or corrupted.',
      400,
      'IMAGE_TOO_SMALL'
    );
  }

  if (byteLength > MAX_SERVER_IMAGE_BYTES) {
    throw new PayloadValidationError(
      'Image file size exceeds the 4 MB server limit. Please compress or resize the image.',
      413,
      'IMAGE_TOO_LARGE'
    );
  }

  if (!matchesMagicBytes(decodedBuffer, mimeType)) {
    throw new PayloadValidationError(
      `File binary header does not match ${mimeType}. Please upload a valid JPEG, PNG, or WebP image.`,
      400,
      'INVALID_IMAGE_HEADER'
    );
  }

  return {
    cleanBase64,
    mimeType,
    byteLength,
    language: rawLang === 'bn' ? 'bn' : 'en',
  };
}
