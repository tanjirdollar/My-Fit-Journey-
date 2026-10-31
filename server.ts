import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  generateCoachAdvice,
  analyzeFoodImage,
  FoodRecognitionServiceError,
} from './src/server/geminiService.ts';
import {
  verifyFirebaseIdToken,
  AuthVerificationError,
  checkUserRateLimit,
  validateFoodImagePayload,
  PayloadValidationError,
  createCorrelationId,
  logFoodRecognitionDiagnostic,
} from './src/server/firebaseAdmin.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Route-specific JSON body parsers so text endpoints stay tight (64kb)
  // while food recognition supports compressed base64 images up to 4MB binary (~5.6MB base64)
  const smallJsonParser = express.json({ limit: '64kb' });
  const imageJsonParser = express.json({ limit: '6mb' });

  // Healthcheck endpoint
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Server-side Gemini AI Coach endpoint
  app.post('/api/gemini/coach', smallJsonParser, async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    const clientHeader = req.headers['x-requested-with'];
    if (clientHeader !== 'MyFitJourneyClient') {
      res.status(403).json({
        error: 'Forbidden: Missing or invalid client authorization header.',
      });
      return;
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({
        error: 'Bad Request: Payload must be a valid JSON object.',
      });
      return;
    }

    const { language, userQuery, userProfile, todaySummary } = body;
    if (language !== undefined && language !== 'en' && language !== 'bn') {
      res.status(400).json({
        error: 'Bad Request: Invalid language parameter.',
      });
      return;
    }

    if (
      userQuery !== undefined &&
      (typeof userQuery !== 'string' || userQuery.length > 1000)
    ) {
      res.status(400).json({
        error: 'Bad Request: userQuery must be a string up to 1000 characters.',
      });
      return;
    }

    if (
      userProfile !== undefined &&
      (typeof userProfile !== 'object' || Array.isArray(userProfile))
    ) {
      res.status(400).json({
        error: 'Bad Request: userProfile must be an object.',
      });
      return;
    }

    if (
      todaySummary !== undefined &&
      (typeof todaySummary !== 'object' || Array.isArray(todaySummary))
    ) {
      res.status(400).json({
        error: 'Bad Request: todaySummary must be an object.',
      });
      return;
    }

    try {
      const result = await generateCoachAdvice({
        language: language === 'bn' ? 'bn' : 'en',
        userQuery:
          typeof userQuery === 'string'
            ? userQuery.trim().slice(0, 1000)
            : undefined,
        userProfile,
        todaySummary,
      });
      res.status(200).json(result);
    } catch (error) {
      console.error('Server Gemini coach route error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  // Protected Server-Side Gemini AI Food Recognition Endpoint
  app.post(
    '/api/gemini/food-recognition',
    imageJsonParser,
    async (req, res) => {
      const correlationId = createCorrelationId();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Correlation-Id', correlationId);

      // Stage 0: Client header check
      const clientHeader = req.headers['x-requested-with'];
      if (clientHeader !== 'MyFitJourneyClient') {
        logFoodRecognitionDiagnostic({
          correlationId,
          stage: 'CLIENT_HEADER_CHECK',
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
          stage: 'CLIENT_HEADER_CHECK',
          correlationId,
        });
        return;
      }

      // Stage 1: Verify Firebase ID token on the server using Firebase Admin SDK.
      // Reject unauthenticated requests and never trust frontend-supplied userId.
      let verifiedUser: { uid: string; email?: string };
      try {
        verifiedUser = await verifyFirebaseIdToken(req.headers.authorization);
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
        const fallbackMsg = 'Unauthorized: Valid Firebase authentication token required.';
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
          errorBn: 'এআই ফুড রিকগনিশন ব্যবহার করতে বৈধ গুগল লগইন প্রয়োজন। অনুগ্রহ করে পুনরায় লগইন করুন।',
          code: 'UNAUTHENTICATED',
          category: 'AUTHENTICATION_FAILURE',
          stage: 'AUTH_TOKEN_VERIFICATION',
          correlationId,
        });
        return;
      }

      // Stage 2: Enforce per-user rate limiting keyed strictly by verified Firebase UID
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

      // Stage 3: Validate image MIME type, magic bytes, file size, and payload structure
      let validatedPayload;
      try {
        validatedPayload = validateFoodImagePayload(req.body);
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
          errorBn: 'প্রদত্ত ছবির ফাইলটি সঠিক নয়। অনুগ্রহ করে একটি বৈধ JPEG, PNG বা WebP ছবি নির্বাচন করুন।',
          code: 'INVALID_PAYLOAD',
          category: 'INVALID_IMAGE',
          stage: 'IMAGE_PAYLOAD_VALIDATION',
          correlationId,
        });
        return;
      }

      // Stage 4: Analyze food image via server-side Gemini (never sending personal health records)
      try {
        const analysisResult = await analyzeFoodImage({
          imageBase64: validatedPayload.cleanBase64,
          mimeType: validatedPayload.mimeType,
          language: validatedPayload.language,
        });
        logFoodRecognitionDiagnostic({
          correlationId,
          stage: 'REQUEST_COMPLETED',
          statusCode: 200,
          category: 'NONE',
          code: 'OK',
          message: 'Food image analyzed successfully.',
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
            meta: {
              mimeType: validatedPayload.mimeType,
              byteLength: validatedPayload.byteLength,
            },
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
          stage: 'GEMINI_VISION_REQUEST',
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
          stage: 'GEMINI_VISION_REQUEST',
          correlationId,
        });
      }
    }
  );

  // Express JSON body-parser & API error middleware (always returns structured JSON on /api/*)
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const correlationId = createCorrelationId();
      if (err && err.type === 'entity.too.large') {
        logFoodRecognitionDiagnostic({
          correlationId,
          stage: 'IMAGE_PAYLOAD_VALIDATION',
          statusCode: 413,
          category: 'INVALID_IMAGE',
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request entity too large (>6MB JSON payload limit).',
        });
        res.status(413).json({
          error:
            'Image payload is too large. Please upload a smaller image (under 4 MB).',
          errorEn:
            'Image payload is too large. Please upload a smaller image (under 4 MB).',
          errorBn:
            'ছবির ফাইল সাইজ অনেক বড় (৪ মেগাবাইটের বেশি)। অনুগ্রহ করে অপেক্ষাকৃত ছোট ছবি নির্বাচন করুন।',
          code: 'PAYLOAD_TOO_LARGE',
          category: 'INVALID_IMAGE',
          stage: 'IMAGE_PAYLOAD_VALIDATION',
          correlationId,
        });
        return;
      }
      if (err instanceof SyntaxError && 'body' in err) {
        logFoodRecognitionDiagnostic({
          correlationId,
          stage: 'IMAGE_PAYLOAD_VALIDATION',
          statusCode: 400,
          category: 'INVALID_IMAGE',
          code: 'MALFORMED_JSON',
          message: 'Malformed JSON in request body.',
        });
        res.status(400).json({
          error: 'Malformed JSON in request body.',
          errorEn: 'Malformed JSON in request body.',
          errorBn: 'অনুরোধের JSON ডেটা ফরম্যাট সঠিক নয়। অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
          code: 'MALFORMED_JSON',
          category: 'INVALID_IMAGE',
          stage: 'IMAGE_PAYLOAD_VALIDATION',
          correlationId,
        });
        return;
      }
      if (req.path.startsWith('/api/')) {
        logFoodRecognitionDiagnostic({
          correlationId,
          stage: 'GEMINI_VISION_REQUEST',
          statusCode: 500,
          category: 'UNKNOWN_SERVER_ERROR',
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'Unhandled API error',
        });
        res.status(500).json({
          error: 'Internal server error.',
          errorEn: 'Internal server error. Please try again or enter values manually.',
          errorBn: 'সার্ভারে অভ্যন্তরীণ ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন বা ম্যানুয়ালি লিখুন।',
          code: 'INTERNAL_SERVER_ERROR',
          category: 'UNKNOWN_SERVER_ERROR',
          stage: 'GEMINI_VISION_REQUEST',
          correlationId,
        });
        return;
      }
      next(err);
    }
  );

  // Catch-all for unmatched /api/* routes so they never fall through to HTML SPA fallback
  app.all('/api/*', (req, res) => {
    const correlationId = createCorrelationId();
    res.status(404).json({
      error: `API endpoint not found: ${req.method} ${req.path}`,
      errorEn: `API endpoint not found: ${req.method} ${req.path}`,
      errorBn: `এপিআই এন্ডপয়েন্ট পাওয়া যায়নি (${req.method} ${req.path})।`,
      code: 'ENDPOINT_NOT_FOUND',
      category: 'UNKNOWN_SERVER_ERROR',
      stage: 'CLIENT_HEADER_CHECK',
      correlationId,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vitePromise = createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `MyFit Journey full-stack server running on http://0.0.0.0:${PORT}`
    );
  });
}

startServer();
