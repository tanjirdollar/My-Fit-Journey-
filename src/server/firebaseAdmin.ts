import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import crypto from 'crypto';
import firebaseAppletConfig from '../../firebase-applet-config.json';

// ============================================================================
// Safe Server-Side Diagnostic Logger & Correlation ID Generator
// ============================================================================

export type FoodRecognitionStage =
  | 'CLIENT_HEADER_CHECK'
  | 'AUTH_TOKEN_VERIFICATION'
  | 'RATE_LIMIT_CHECK'
  | 'IMAGE_PAYLOAD_VALIDATION'
  | 'GEMINI_API_CONFIG'
  | 'GEMINI_VISION_REQUEST'
  | 'AI_RESPONSE_PARSING'
  | 'REQUEST_COMPLETED';

export type FoodRecognitionErrorCategory =
  | 'NONE'
  | 'AUTHENTICATION_FAILURE'
  | 'INVALID_IMAGE'
  | 'GEMINI_CONFIG_FAILURE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'GEMINI_SERVICE_UNAVAILABLE'
  | 'INVALID_AI_RESPONSE'
  | 'UNKNOWN_SERVER_ERROR';

export interface DiagnosticLogEntry {
  correlationId: string;
  stage: FoodRecognitionStage;
  statusCode: number;
  category: FoodRecognitionErrorCategory;
  code: string;
  message: string;
  meta?: Record<string, string | number | boolean>;
}

export function createCorrelationId(): string {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString('hex');
  return `fr_${ts}_${rand}`;
}

/**
 * Scrubs any potential secrets, JWTs, API keys, emails, or long base64 payloads
 * before writing diagnostic logs to stdout/stderr.
 */
export function sanitizeDiagnosticMessage(raw: string): string {
  if (!raw || typeof raw !== 'string') return 'Unknown error';
  return raw
    // Redact Bearer tokens / JWTs
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_JWT]')
    // Redact Google API keys
    .replace(/AIza[0-9A-Za-z_-]{25,}/g, '[REDACTED_API_KEY]')
    // Redact email addresses
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]')
    // Redact accidental long base64 sequences (>120 chars)
    .replace(/[A-Za-z0-9+/]{120,}={0,2}/g, '[REDACTED_BASE64]')
    .slice(0, 500);
}

export function logFoodRecognitionDiagnostic(entry: DiagnosticLogEntry): void {
  const safePayload = {
    timestamp: new Date().toISOString(),
    correlationId: entry.correlationId,
    stage: entry.stage,
    statusCode: entry.statusCode,
    category: entry.category,
    code: entry.code,
    message: sanitizeDiagnosticMessage(entry.message),
    ...(entry.meta ? { meta: entry.meta } : {}),
  };

  if (entry.statusCode >= 400) {
    console.error('[AI_FOOD_RECOGNITION_DIAGNOSTIC]', JSON.stringify(safePayload));
  } else {
    console.info('[AI_FOOD_RECOGNITION_DIAGNOSTIC]', JSON.stringify(safePayload));
  }
}

// ============================================================================
// Firebase Project Configuration & Admin Initialization
// ============================================================================

export function getFirebaseProjectId(): string {
  const envProjectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (envProjectId) {
    return envProjectId;
  }
  if (
    firebaseAppletConfig &&
    typeof firebaseAppletConfig.projectId === 'string' &&
    firebaseAppletConfig.projectId.trim()
  ) {
    return firebaseAppletConfig.projectId.trim();
  }
  throw new Error('Firebase projectId is missing in firebase-applet-config.json and environment variables.');
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
  category: FoodRecognitionErrorCategory = 'AUTHENTICATION_FAILURE';
  stage: FoodRecognitionStage = 'AUTH_TOKEN_VERIFICATION';
  messageBn: string;

  constructor(
    message: string,
    statusCode = 401,
    code = 'UNAUTHENTICATED',
    messageBn = 'আপনার লগইন সেশন যাচাই করা যায়নি। অনুগ্রহ করে পুনরায় গুগল দিয়ে লগইন করে চেষ্টা করুন।'
  ) {
    super(message);
    this.name = 'AuthVerificationError';
    this.statusCode = statusCode;
    this.code = code;
    this.messageBn = messageBn;
  }
}

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
}

// Cache Google SecureToken public certificates in memory with TTL
let cachedCerts: Record<string, string> | null = null;
let cachedCertsExpiresAt = 0;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCerts && now < cachedCertsExpiresAt) {
    return cachedCerts;
  }
  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Google public certificates (HTTP ${res.status})`);
  }
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;
  cachedCerts = (await res.json()) as Record<string, string>;
  cachedCertsExpiresAt = now + maxAgeSec * 1000;
  return cachedCerts;
}

/**
 * Direct RS256 cryptographic fallback verifier using Google's official x509 certs.
 * Used if Firebase Admin SDK fails due to missing GCP metadata/ADC in external serverless runtimes.
 */
async function verifyFirebaseJwtWithGoogleCerts(
  idToken: string,
  expectedProjectId: string
): Promise<VerifiedFirebaseUser> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new AuthVerificationError(
      'Malformed JWT structure in Firebase ID token.',
      401,
      'MALFORMED_TOKEN',
      'অবৈধ অথেনটিকেশন টোকেন। অনুগ্রহ করে পুনরায় লগইন করুন।'
    );
  }

  const headerJson = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  const payloadJson = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

  if (headerJson.alg !== 'RS256' || typeof headerJson.kid !== 'string') {
    throw new AuthVerificationError(
      'Invalid JWT algorithm or missing key ID.',
      401,
      'INVALID_ID_TOKEN',
      'লগইন টোকেনটি বৈধ নয়। অনুগ্রহ করে পুনরায় সাইন-ইন করুন।'
    );
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const clockToleranceSec = 300; // 5 minutes tolerance for minor clock skew

  if (typeof payloadJson.exp !== 'number' || payloadJson.exp + clockToleranceSec < nowSec) {
    throw new AuthVerificationError(
      'Firebase ID token has expired. Please refresh your session or sign in again.',
      401,
      'TOKEN_EXPIRED',
      'আপনার লগইন সেশনের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন বা পুনরায় লগইন করুন।'
    );
  }

  if (typeof payloadJson.iat !== 'number' || payloadJson.iat - clockToleranceSec > nowSec) {
    throw new AuthVerificationError(
      'Firebase ID token issue time is invalid.',
      401,
      'INVALID_ID_TOKEN',
      'লগইন টোকেনের সময়কাল অসামঞ্জস্যপূর্ণ। অনুগ্রহ করে পুনরায় লগইন করুন।'
    );
  }

  const expectedIssuer = `https://securetoken.google.com/${expectedProjectId}`;
  if (payloadJson.aud !== expectedProjectId || payloadJson.iss !== expectedIssuer) {
    throw new AuthVerificationError(
      `Firebase project mismatch: token aud="${String(payloadJson.aud)}" does not match server projectId="${expectedProjectId}".`,
      401,
      'PROJECT_ID_MISMATCH',
      'ফায়ারবেস প্রজেক্ট কনফিগারেশন মেলেনি। অনুগ্রহ করে সঠিক অ্যাকাউন্ট দিয়ে লগইন করুন।'
    );
  }

  const sub = typeof payloadJson.sub === 'string' ? payloadJson.sub.trim() : '';
  if (!sub || sub.length > 128) {
    throw new AuthVerificationError(
      'Firebase ID token is missing a valid subject (uid) claim.',
      401,
      'MISSING_UID',
      'ব্যবহারকারীর আইডি যাচাই করা যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।'
    );
  }

  const certs = await getGooglePublicCerts();
  const cert = certs[headerJson.kid];
  if (!cert) {
    throw new AuthVerificationError(
      'Firebase ID token key ID (kid) does not match any active Google public key.',
      401,
      'INVALID_ID_TOKEN',
      'আপনার লগইন টোকেনটি পুরনো বা অকার্যকর। অনুগ্রহ করে পুনরায় লগইন করুন।'
    );
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();

  const signatureBuffer = Buffer.from(parts[2], 'base64url');
  const isSignatureValid = verifier.verify(cert, signatureBuffer);
  if (!isSignatureValid) {
    throw new AuthVerificationError(
      'Firebase ID token cryptographic signature verification failed.',
      401,
      'INVALID_ID_TOKEN',
      'লগইন টোকেনের নিরাপত্তা স্বাক্ষর যাচাই ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় লগইন করুন।'
    );
  }

  return {
    uid: sub,
    email: typeof payloadJson.email === 'string' ? payloadJson.email : undefined,
  };
}

/**
 * Verifies a Firebase ID token from the Authorization: Bearer <token> header
 * using Firebase Admin SDK (with cryptographic Google x509 fallback).
 * Rejects unauthenticated or invalid requests and never trusts any userId in the body.
 */
export async function verifyFirebaseIdToken(
  authorizationHeader: string | undefined
): Promise<VerifiedFirebaseUser> {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') {
    throw new AuthVerificationError(
      'Missing Authorization header. Please sign in with Google to use AI Food Recognition.',
      401,
      'MISSING_AUTH_HEADER',
      'এআই ফুড রিকগনিশন ব্যবহার করতে গুগল অ্যাকাউন্ট দিয়ে লগইন করা প্রয়োজন।'
    );
  }

  const trimmed = authorizationHeader.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    throw new AuthVerificationError(
      'Invalid Authorization header format. Expected Bearer <Firebase_ID_Token>.',
      401,
      'INVALID_AUTH_FORMAT',
      'অথেনটিকেশন হেডার সঠিক নয়। অনুগ্রহ করে পুনরায় লগইন করুন।'
    );
  }

  const idToken = trimmed.slice(7).trim();
  if (!idToken || idToken.length < 20 || idToken.split('.').length !== 3) {
    throw new AuthVerificationError(
      'Empty or malformed Firebase ID token.',
      401,
      'MALFORMED_TOKEN',
      'লগইন টোকেনটি অসম্পূর্ণ বা ত্রুটিপূর্ণ। অনুগ্রহ করে পুনরায় গুগল দিয়ে লগইন করুন।'
    );
  }

  const expectedProjectId = getFirebaseProjectId();

  // Pre-check JWT payload for project mismatch or expiration before Admin SDK call
  try {
    const payloadPart = idToken.split('.')[1];
    const decodedPayload = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf8')
    );
    if (
      decodedPayload &&
      typeof decodedPayload.aud === 'string' &&
      decodedPayload.aud !== expectedProjectId
    ) {
      throw new AuthVerificationError(
        `Firebase project ID mismatch: token was issued for "${decodedPayload.aud}", but server is configured for "${expectedProjectId}".`,
        401,
        'PROJECT_ID_MISMATCH',
        'ফায়ারবেস প্রজেক্ট আইডি মেলেনি। অনুগ্রহ করে পেজটি রিফ্রেশ করে পুনরায় লগইন করুন।'
      );
    }
  } catch (preErr) {
    if (preErr instanceof AuthVerificationError) {
      throw preErr;
    }
    throw new AuthVerificationError(
      'Malformed Firebase ID token payload.',
      401,
      'MALFORMED_TOKEN',
      'লগইন টোকেনটি পড়া যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।'
    );
  }

  try {
    const app = ensureFirebaseAdminApp();
    const decoded: DecodedIdToken = await getAuth(app).verifyIdToken(idToken);
    if (!decoded || !decoded.uid) {
      throw new AuthVerificationError(
        'Token verification succeeded but no valid Firebase UID was found.',
        401,
        'MISSING_UID',
        'ব্যবহারকারীর পরিচয় নিশ্চিত করা যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।'
      );
    }
    return {
      uid: decoded.uid,
      email: decoded.email,
    };
  } catch (err: any) {
    if (err instanceof AuthVerificationError) {
      throw err;
    }

    const errCode = typeof err?.code === 'string' ? err.code : '';
    const errMsg = err instanceof Error ? err.message : String(err);

    if (errCode === 'auth/id-token-expired' || errMsg.includes('expired')) {
      throw new AuthVerificationError(
        'Your sign-in session token has expired. Please try again or sign in with Google again.',
        401,
        'TOKEN_EXPIRED',
        'আপনার লগইন সেশনের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন বা পুনরায় লগইন করুন।'
      );
    }

    // If Firebase Admin fails due to environment/ADC metadata lookup issues, fall back to direct Google x509 verification
    if (
      errCode === 'auth/internal-error' ||
      errMsg.includes('metadata') ||
      errMsg.includes('credential') ||
      errMsg.includes('ENOTFOUND')
    ) {
      return await verifyFirebaseJwtWithGoogleCerts(idToken, expectedProjectId);
    }

    throw new AuthVerificationError(
      `Authentication failed: ${sanitizeDiagnosticMessage(errMsg)}`,
      401,
      'INVALID_ID_TOKEN',
      'আপনার লগইন যাচাই করা যায়নি। অনুগ্রহ করে পুনরায় গুগল অ্যাকাউন্ট দিয়ে লগইন করুন।'
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
  category: FoodRecognitionErrorCategory = 'INVALID_IMAGE';
  stage: FoodRecognitionStage = 'IMAGE_PAYLOAD_VALIDATION';
  messageBn: string;

  constructor(
    message: string,
    statusCode = 400,
    code = 'INVALID_PAYLOAD',
    messageBn = 'প্রদত্ত ছবির ফাইলটি সঠিক নয়। অনুগ্রহ করে একটি বৈধ JPEG, PNG বা WebP ছবি নির্বাচন করুন।'
  ) {
    super(message);
    this.name = 'PayloadValidationError';
    this.statusCode = statusCode;
    this.code = code;
    this.messageBn = messageBn;
  }
}

export interface ValidatedFoodImagePayload {
  cleanBase64: string;
  mimeType: AllowedFoodImageMime;
  byteLength: number;
  language: 'en' | 'bn';
}

function detectMimeFromMagicBytes(buf: Buffer): AllowedFoodImageMime | null {
  if (buf.length < 12) return null;

  // JPEG starts with FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG starts with 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP starts with "RIFF" (52 49 46 46) at 0..3 and "WEBP" (57 45 42 50) at 8..11
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

function normalizeDeclaredMime(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower === 'image/jpg' || lower === 'image/pjpeg') {
    return 'image/jpeg';
  }
  return lower;
}

export function validateFoodImagePayload(body: unknown): ValidatedFoodImagePayload {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new PayloadValidationError(
      'Request body must be a valid JSON object.',
      400,
      'INVALID_JSON_OBJECT',
      'অনুরোধের ডেটা ফরম্যাট সঠিক নয়। অনুগ্রহ করে আবার চেষ্টা করুন।'
    );
  }

  const record = body as Record<string, unknown>;
  const rawMime =
    typeof record.mimeType === 'string' ? normalizeDeclaredMime(record.mimeType) : '';
  const rawImage = typeof record.imageBase64 === 'string' ? record.imageBase64.trim() : '';
  const rawLang = record.language;

  if (rawLang !== undefined && rawLang !== 'en' && rawLang !== 'bn') {
    throw new PayloadValidationError(
      'Invalid language parameter. Must be "en" or "bn".',
      400,
      'INVALID_LANGUAGE',
      'ভাষার প্যারামিটার সঠিক নয়।'
    );
  }

  if (!ALLOWED_FOOD_IMAGE_MIMES.includes(rawMime as AllowedFoodImageMime)) {
    throw new PayloadValidationError(
      'Unsupported image format. Only JPEG, PNG, and WebP images are supported.',
      400,
      'UNSUPPORTED_MIME_TYPE',
      'অসমর্থিত ছবির ফরম্যাট। শুধুমাত্র JPEG, PNG এবং WebP ছবি সমর্থিত।'
    );
  }

  let mimeType = rawMime as AllowedFoodImageMime;

  if (!rawImage) {
    throw new PayloadValidationError(
      'Image data is required.',
      400,
      'MISSING_IMAGE_DATA',
      'খাবারের ছবির ডেটা পাওয়া যায়নি। অনুগ্রহ করে আবার ছবি নির্বাচন করুন।'
    );
  }

  // Strip optional data URI prefix if present
  let cleanBase64 = rawImage;
  const dataUriMatch = rawImage.match(/^data:([^;]+);base64,(.+)$/is);
  if (dataUriMatch) {
    const prefixMime = normalizeDeclaredMime(dataUriMatch[1]);
    if (prefixMime !== mimeType) {
      throw new PayloadValidationError(
        `Data URI MIME type (${prefixMime}) does not match declared mimeType (${mimeType}).`,
        400,
        'MIME_MISMATCH',
        'ছবির ফরম্যাট তথ্যে অসামঞ্জস্য পাওয়া গেছে। অনুগ্রহ করে অন্য একটি ছবি চেষ্টা করুন।'
      );
    }
    cleanBase64 = dataUriMatch[2].trim();
  }

  // Remove whitespace/newlines and normalize URL-safe base64 if present
  cleanBase64 = cleanBase64.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64)) {
    throw new PayloadValidationError(
      'Invalid base64 image encoding.',
      400,
      'INVALID_BASE64',
      'ছবির এনকোডিং সঠিক নয়। অনুগ্রহ করে পুনরায় ছবি নির্বাচন করুন।'
    );
  }

  const decodedBuffer = Buffer.from(cleanBase64, 'base64');
  const byteLength = decodedBuffer.byteLength;

  if (byteLength < MIN_SERVER_IMAGE_BYTES) {
    throw new PayloadValidationError(
      'Uploaded image is empty or corrupted.',
      400,
      'IMAGE_TOO_SMALL',
      'আপলোড করা ছবিটি খালি বা ত্রুটিপূর্ণ। অনুগ্রহ করে অন্য একটি পরিষ্কার ছবি দিন।'
    );
  }

  if (byteLength > MAX_SERVER_IMAGE_BYTES) {
    throw new PayloadValidationError(
      'Image file size exceeds the 4 MB server limit. Please compress or resize the image.',
      413,
      'IMAGE_TOO_LARGE',
      'ছবির সাইজ ৪ মেগাবাইটের বেশি। অনুগ্রহ করে ছোট সাইজের ছবি ব্যবহার করুন।'
    );
  }

  const detectedMime = detectMimeFromMagicBytes(decodedBuffer);
  if (!detectedMime || detectedMime !== mimeType) {
    throw new PayloadValidationError(
      `File binary header does not match ${mimeType}. Please upload a valid JPEG, PNG, or WebP image.`,
      400,
      'INVALID_IMAGE_HEADER',
      'ছবির ফাইলটি বৈধ JPEG, PNG বা WebP নয়। অনুগ্রহ করে একটি সঠিক খাবারের ছবি নির্বাচন করুন।'
    );
  }

  return {
    cleanBase64,
    mimeType,
    byteLength,
    language: rawLang === 'bn' ? 'bn' : 'en',
  };
}
