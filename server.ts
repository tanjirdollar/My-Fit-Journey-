import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  generateCoachAdvice,
  analyzeFoodImage,
} from './src/server/geminiService.ts';
import {
  verifyFirebaseIdToken,
  AuthVerificationError,
  checkUserRateLimit,
  validateFoodImagePayload,
  PayloadValidationError,
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
      res.setHeader('Content-Type', 'application/json');

      const clientHeader = req.headers['x-requested-with'];
      if (clientHeader !== 'MyFitJourneyClient') {
        res.status(403).json({
          error: 'Forbidden: Missing or invalid client authorization header.',
          code: 'FORBIDDEN_CLIENT',
        });
        return;
      }

      // 1. Verify Firebase ID token on the server using Firebase Admin SDK.
      // Reject unauthenticated requests and never trust frontend-supplied userId.
      let verifiedUser: { uid: string; email?: string };
      try {
        verifiedUser = await verifyFirebaseIdToken(req.headers.authorization);
      } catch (err) {
        if (err instanceof AuthVerificationError) {
          res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
          });
          return;
        }
        res.status(401).json({
          error: 'Unauthorized: Valid Firebase authentication token required.',
          code: 'UNAUTHENTICATED',
        });
        return;
      }

      // 2. Enforce per-user rate limiting keyed strictly by verified Firebase UID
      const rateLimit = checkUserRateLimit(verifiedUser.uid, 10, 60_000);
      res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));
      if (!rateLimit.allowed) {
        res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
        res.status(429).json({
          error: `Rate limit exceeded. Please wait ${rateLimit.retryAfterSeconds} seconds before analyzing another food photo.`,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        });
        return;
      }

      // 3. Validate image MIME type, magic bytes, file size, and payload structure
      let validatedPayload;
      try {
        validatedPayload = validateFoodImagePayload(req.body);
      } catch (err) {
        if (err instanceof PayloadValidationError) {
          res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
          });
          return;
        }
        res.status(400).json({
          error: 'Bad Request: Invalid image upload payload.',
          code: 'INVALID_PAYLOAD',
        });
        return;
      }

      // 4. Analyze food image via server-side Gemini (never sending personal health records)
      try {
        const analysisResult = await analyzeFoodImage({
          imageBase64: validatedPayload.cleanBase64,
          mimeType: validatedPayload.mimeType,
          language: validatedPayload.language,
        });
        res.status(200).json(analysisResult);
      } catch (error) {
        console.error(
          `Food recognition error for verified uid=${verifiedUser.uid}:`,
          error
        );
        res.status(502).json({
          error:
            error instanceof Error
              ? error.message
              : 'AI food analysis service temporarily unavailable. Please try again or enter values manually.',
          code: 'GEMINI_ANALYSIS_FAILED',
        });
      }
    }
  );

  // Express JSON body-parser error middleware (returns structured JSON on 413 / malformed JSON)
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (err && err.type === 'entity.too.large') {
        res.status(413).json({
          error:
            'Image payload is too large. Please upload a smaller image (under 4 MB).',
          code: 'PAYLOAD_TOO_LARGE',
        });
        return;
      }
      if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({
          error: 'Malformed JSON in request body.',
          code: 'MALFORMED_JSON',
        });
        return;
      }
      next(err);
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
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
