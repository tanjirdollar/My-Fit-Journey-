import {
  analyzeFoodImage,
  FoodRecognitionServiceError,
} from '../../src/server/geminiService.ts';
import {
  verifyFirebaseIdToken,
  AuthVerificationError,
  checkUserRateLimit,
  validateFoodImagePayload,
  PayloadValidationError,
  createCorrelationId,
  logFoodRecognitionDiagnostic,
} from '../../src/server/firebaseAdmin.ts';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb',
    },
  },
  maxDuration: 30,
};

const MAX_RAW_BODY_BYTES = 6 * 1024 * 1024; // 6 MB JSON payload limit

/**
 * Safely parses the request JSON body exactly once across Vercel Serverless
 * and Node.js IncomingMessage runtimes while preserving Base64 image payloads.
 */
async function parseRequestBodyOnce(req: any): Promise<unknown> {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) {
      return JSON.parse(req.body.toString('utf8'));
    }
    if (typeof req.body === 'string') {
      return JSON.parse(req.body);
    }
    if (typeof req.body === 'object') {
      return req.body;
    }
  }

  if (typeof req.on !== 'function') {
    return {};
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    req.on('data', (chunk: Buffer | string) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf8');
      totalBytes += buf.byteLength;
      if (totalBytes > MAX_RAW_BODY_BYTES) {
        reject(
          new PayloadValidationError(
            'Image payload is too large. Please upload a smaller image (under 4 MB).',
            413,
            'PAYLOAD_TOO_LARGE',
            'ছবির ফাইল সাইজ অনেক বড় (৪ মেগাবাইটের বেশি)। অনুগ্রহ করে অপেক্ষাকৃত ছোট ছবি নির্বাচন করুন।'
          )
        );
        return;
      }
      chunks.push(buf);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });

    req.on('error', (err: Error) => {
      reject(err);
    });
  });
}

export default async function handler(req: any, res: any) {
  const correlationId = createCorrelationId();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Correlation-Id', correlationId);

  // Stage 1: REQUEST_RECEIVED
  logFoodRecognitionDiagnostic({
    correlationId,
    stage: 'REQUEST_RECEIVED',
    statusCode: 200,
    category: 'NONE',
    code: 'REQUEST_RECEIVED',
    message: `Incoming ${String(req.method || 'UNKNOWN')} /api/gemini/food-recognition request.`,
  });

  if (req.method !== 'POST') {
    logFoodRecognitionDiagnostic({
      correlationId,
      stage: 'REQUEST_RECEIVED',
      statusCode: 405,
      category: 'UNKNOWN_SERVER_ERROR',
      code: 'METHOD_NOT_ALLOWED',
      message: `Method ${String(req.method)} not allowed.`,
    });
    res.status(405).json({
      error: 'Method Not Allowed. Use POST.',
      errorEn: 'Method Not Allowed. Use POST.',
      errorBn: 'অনুমোদিত মেথড নয় (POST ব্যবহার করুন)।',
      code: 'METHOD_NOT_ALLOWED',
      category: 'UNKNOWN_SERVER_ERROR',
      stage: 'REQUEST_RECEIVED',
      correlationId,
    });
    return;
  }

  const clientHeader = req.headers?.['x-requested-with'];
  if (clientHeader !== 'MyFitJourneyClient') {
    logFoodRecognitionDiagnostic({
      correlationId,
      stage: 'REQUEST_RECEIVED',
      statusCode: 403,
      category: 'AUTHENTICATION_FAILURE',
      code: 'FORBIDDEN_CLIENT',
      message: 'Missing or invalid X-Requested-With client header.',
    });
    res.status(403).json({
      error: 'Forbidden: Missing or invalid client authorization header.',
      errorEn: 'Forbidden: Missing or invalid client authorization header.',
      errorBn: 'নিরাপত্তা যাচাই ব্যর্থ হয়েছে: ক্লায়েন্ট অনুমোদন হেডার অনুপস্থিত।',
      code: 'FORBIDDEN_CLIENT',
      category: 'AUTHENTICATION_FAILURE',
      stage: 'REQUEST_RECEIVED',
      correlationId,
    });
    return;
  }

  // Stage 2 & 3: FIREBASE_ADMIN_INITIALIZATION & AUTH_TOKEN_VERIFICATION
  let verifiedUser: { uid: string; email?: string };
  try {
    verifiedUser = await verifyFirebaseIdToken(
      req.headers?.authorization,
      correlationId
    );
    logFoodRecognitionDiagnostic({
      correlationId,
      stage: 'AUTH_TOKEN_VERIFICATION',
      statusCode: 200,
      category: 'NONE',
      code: 'AUTH_VERIFIED',
      message: 'Firebase ID token verified via Firebase Admin verifyIdToken().',
    });
  } catch (err) {
    if (err instanceof AuthVerificationError) {
      logFoodRecognitionDiagnostic({
        correlationId,
        stage: err.stage,
        statusCode: err.statusCode,
        category: err.category,
        code: err.code,
        message: err.message,
      });
      res.status(err.statusCode).json({
        error: err.message,
        errorEn: err.message,
        errorBn: err.messageBn,
        code: err.code,
        category: err.category,
        stage: err.stage,
        correlationId,
      });
      return;
    }
    const fallbackMsg =
      'Unauthorized: Valid Firebase authentication token required.';
    logFoodRecognitionDiagnostic({
      correlationId,
      stage: 'AUTH_TOKEN_VERIFICATION',
      statusCode: 401,
      category: 'AUTHENTICATION_FAILURE',
      code: 'UNAUTHENTICATED',
      message: err instanceof Error ? err.message : fallbackMsg,
    });
    res.status(401).json({
      error: fallbackMsg,
      errorEn: fallbackMsg,
      errorBn:
        'এআই ফুড রিকগনিশন ব্যবহার করতে বৈধ গুগল লগইন প্রয়োজন। অনুগ্রহ করে পুনরায় লগইন করুন।',
      code: 'UNAUTHENTICATED',
      category: 'AUTHENTICATION_FAILURE',
      stage: 'AUTH_TOKEN_VERIFICATION',
      correlationId,
    });
    return;
  }

  const rateLimit = checkUserRateLimit(verifiedUser.uid, 10, 60_000);
  res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    const msgEn = `Rate limit exceeded. Please wait ${rateLimit.retryAfterSeconds} seconds before analyzing another food photo.`;
    const msgBn = `অতিরিক্ত অনুরোধ পাঠানো হয়েছে (Rate Limit)। অনুগ্রহ করে ${rateLimit.retryAfterSeconds} সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন।`;
    logFoodRecognitionDiagnostic({
      correlationId,
      stage: 'RATE_LIMIT_CHECK',
      statusCode: 429,
      category: 'RATE_LIMIT_EXCEEDED',
      code: 'RATE_LIMIT_EXCEEDED',
      message: msgEn,
      meta: { retryAfterSeconds: rateLimit.retryAfterSeconds },
    });
    res.status(429).json({
      error: msgEn,
      errorEn: msgEn,
      errorBn: msgBn,
      code: 'RATE_LIMIT_EXCEEDED',
      category: 'RATE_LIMIT_EXCEEDED',
      stage: 'RATE_LIMIT_CHECK',
      retryAfterSeconds: rateLimit.retryAfterSeconds,
      correlationId,
    });
    return;
  }

  // Stage 4: IMAGE_PAYLOAD_VALIDATION
  let validatedPayload;
  try {
    const parsedBody = await parseRequestBodyOnce(req);
    validatedPayload = validateFoodImagePayload(parsedBody);
    logFoodRecognitionDiagnostic({
      correlationId,
      stage: 'IMAGE_PAYLOAD_VALIDATION',
      statusCode: 200,
      category: 'NONE',
      code: 'IMAGE_VALIDATED',
      message: 'Image MIME type, magic bytes, and size validated.',
      meta: {
        mimeType: validatedPayload.mimeType,
        byteLength: validatedPayload.byteLength,
      },
    });
  } catch (err) {
    if (err instanceof PayloadValidationError) {
      logFoodRecognitionDiagnostic({
        correlationId,
        stage: err.stage,
        statusCode: err.statusCode,
        category: err.category,
        code: err.code,
        message: err.message,
      });
      res.status(err.statusCode).json({
        error: err.message,
        errorEn: err.message,
        errorBn: err.messageBn,
        code: err.code,
        category: err.category,
        stage: err.stage,
        correlationId,
      });
      return;
    }
    const fallbackMsg = 'Bad Request: Invalid image upload payload.';
    logFoodRecognitionDiagnostic({
      correlationId,
      stage: 'IMAGE_PAYLOAD_VALIDATION',
      statusCode: 400,
      category: 'INVALID_IMAGE',
      code: 'INVALID_PAYLOAD',
      message: err instanceof Error ? err.message : fallbackMsg,
    });
    res.status(400).json({
      error: fallbackMsg,
      errorEn: fallbackMsg,
      errorBn:
        'প্রদত্ত ছবির ফাইলটি সঠিক নয়। অনুগ্রহ করে একটি বৈধ JPEG, PNG বা WebP ছবি নির্বাচন করুন।',
      code: 'INVALID_PAYLOAD',
      category: 'INVALID_IMAGE',
      stage: 'IMAGE_PAYLOAD_VALIDATION',
      correlationId,
    });
    return;
  }

  // Stage 5, 6, 7: GEMINI_API_REQUEST, GEMINI_RESPONSE_PARSING & RESPONSE_SENT
  try {
    const analysisResult = await analyzeFoodImage({
      imageBase64: validatedPayload.cleanBase64,
      mimeType: validatedPayload.mimeType,
      language: validatedPayload.language,
      correlationId,
    });
    logFoodRecognitionDiagnostic({
      correlationId,
      stage: 'RESPONSE_SENT',
      statusCode: 200,
      category: 'NONE',
      code: 'OK',
      message: 'Food image analyzed successfully and response sent.',
      meta: {
        mimeType: validatedPayload.mimeType,
        byteLength: validatedPayload.byteLength,
        isFood: analysisResult.isFood,
        confidenceLevel: analysisResult.confidenceLevel,
        componentCount: analysisResult.components.length,
      },
    });
    res.status(200).json(analysisResult);
  } catch (error) {
    if (error instanceof FoodRecognitionServiceError) {
      logFoodRecognitionDiagnostic({
        correlationId,
        stage: error.stage,
        statusCode: error.statusCode,
        category: error.category,
        code: error.code,
        message: error.message,
      });
      res.status(error.statusCode).json({
        error: error.message,
        errorEn: error.message,
        errorBn: error.messageBn,
        code: error.code,
        category: error.category,
        stage: error.stage,
        correlationId,
      });
      return;
    }
    const rawMsg =
      error instanceof Error
        ? error.message
        : 'Unknown server error during food image analysis.';
    logFoodRecognitionDiagnostic({
      correlationId,
      stage: 'GEMINI_API_REQUEST',
      statusCode: 500,
      category: 'UNKNOWN_SERVER_ERROR',
      code: 'INTERNAL_SERVER_ERROR',
      message: rawMsg,
    });
    res.status(500).json({
      error: rawMsg,
      errorEn:
        'An unexpected server error occurred while analyzing the food image. Please try again or enter values manually.',
      errorBn:
        'সার্ভারে একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন বা ম্যানুয়ালি খাবারের তথ্য লিখুন।',
      code: 'INTERNAL_SERVER_ERROR',
      category: 'UNKNOWN_SERVER_ERROR',
      stage: 'GEMINI_API_REQUEST',
      correlationId,
    });
  }
}
