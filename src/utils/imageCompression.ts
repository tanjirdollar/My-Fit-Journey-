import { AIFoodComponent } from '../types';

export const ALLOWED_CLIENT_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedClientImageMime = (typeof ALLOWED_CLIENT_IMAGE_MIMES)[number];

export const MAX_RAW_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB raw camera photo allowed before client compression
export const MAX_COMPRESSED_BYTES = 3.5 * 1024 * 1024; // 3.5 MB max after compression (server limit is 4 MB)

export interface ImageValidationCheck {
  valid: boolean;
  errorBn?: string;
  errorEn?: string;
}

function resolveFileMimeType(file: File): string {
  const rawType = (file.type || '').trim().toLowerCase();
  if (rawType === 'image/jpg' || rawType === 'image/pjpeg') {
    return 'image/jpeg';
  }
  if (rawType) {
    return rawType;
  }
  const name = (file.name || '').trim().toLowerCase();
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  return '';
}

export function validateClientImageFile(
  file: File | null | undefined
): ImageValidationCheck {
  if (!file) {
    return {
      valid: false,
      errorBn: 'অনুগ্রহ করে একটি খাবারের ছবি নির্বাচন করুন।',
      errorEn: 'Please select a food image.',
    };
  }

  const normalizedType = resolveFileMimeType(file);
  if (
    !ALLOWED_CLIENT_IMAGE_MIMES.includes(
      normalizedType as AllowedClientImageMime
    )
  ) {
    return {
      valid: false,
      errorBn:
        'অসমর্থিত ছবির ফরম্যাট। শুধুমাত্র JPEG (.jpg), PNG (.png) এবং WebP (.webp) ছবি সমর্থিত।',
      errorEn:
        'Unsupported image format. Please choose a JPEG (.jpg), PNG (.png), or WebP (.webp) image.',
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      errorBn: 'নির্বাচিত ফাইলটি খালি বা ত্রুটিপূর্ণ।',
      errorEn: 'The selected image file is empty or corrupted.',
    };
  }

  if (file.size > MAX_RAW_UPLOAD_BYTES) {
    return {
      valid: false,
      errorBn:
        'ছবির ফাইল সাইজ ১৫ মেগাবাইটের বেশি। অনুগ্রহ করে অপেক্ষাকৃত ছোট সাইজের ছবি নির্বাচন করুন।',
      errorEn:
        'Image file exceeds the 15 MB maximum upload size. Please choose a smaller photo.',
    };
  }

  return { valid: true };
}

export interface CompressedFoodImage {
  base64Data: string;
  dataUrl: string;
  mimeType: AllowedClientImageMime;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  width: number;
  height: number;
}

/**
 * Compresses and resizes large mobile camera or gallery images on the client
 * using an HTML5 Canvas so uploads are fast, reliable, and well within server limits.
 */
export function compressClientFoodImage(
  file: File,
  maxDimension = 1024,
  initialQuality = 0.8
): Promise<CompressedFoodImage> {
  return new Promise((resolve, reject) => {
    const validation = validateClientImageFile(file);
    if (!validation.valid) {
      reject(new Error(validation.errorEn || 'Invalid image file.'));
      return;
    }

    const inputMime = resolveFileMimeType(file) as AllowedClientImageMime;

    const reader = new FileReader();
    reader.onerror = () => {
      reject(new Error('Failed to read the selected image file.'));
    };

    reader.onload = () => {
      const sourceDataUrl =
        typeof reader.result === 'string' ? reader.result : '';
      if (!sourceDataUrl) {
        reject(new Error('Empty image data read from file.'));
        return;
      }

      const img = new Image();
      img.onerror = () => {
        reject(
          new Error(
            'Could not decode image. Please select a valid JPEG, PNG, or WebP photo.'
          )
        );
      };

      img.onload = () => {
        try {
          const origW = img.naturalWidth || img.width || 800;
          const origH = img.naturalHeight || img.height || 600;

          let targetW = origW;
          let targetH = origH;

          if (origW > maxDimension || origH > maxDimension) {
            if (origW >= origH) {
              targetW = maxDimension;
              targetH = Math.max(1, Math.round((origH * maxDimension) / origW));
            } else {
              targetH = maxDimension;
              targetW = Math.max(1, Math.round((origW * maxDimension) / origH));
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(
              new Error(
                'Browser canvas context is unavailable for image compression.'
              )
            );
            return;
          }

          // Fill white background for transparent PNGs when converting to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);

          // Preserve PNG if input is a small PNG, or WebP if WebP, otherwise JPEG for compact camera photos
          const preferredMime: AllowedClientImageMime =
            inputMime === 'image/png' && file.size <= 500 * 1024
              ? 'image/png'
              : inputMime === 'image/webp'
              ? 'image/webp'
              : 'image/jpeg';

          let outDataUrl =
            preferredMime === 'image/png'
              ? canvas.toDataURL('image/png')
              : canvas.toDataURL(preferredMime, initialQuality);
          let base64Part = (outDataUrl.split(',')[1] || '').replace(/\s+/g, '');
          let estimatedBytes = Math.ceil((base64Part.length * 3) / 4);

          // Second pass at JPEG quality 0.70 if still > 850 KB
          if (estimatedBytes > 850 * 1024) {
            outDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            base64Part = (outDataUrl.split(',')[1] || '').replace(/\s+/g, '');
            estimatedBytes = Math.ceil((base64Part.length * 3) / 4);
          }

          if (estimatedBytes > MAX_COMPRESSED_BYTES) {
            reject(
              new Error(
                'Image remains too large after compression. Please select a lower-resolution photo.'
              )
            );
            return;
          }

          const finalMime: AllowedClientImageMime = outDataUrl.startsWith(
            'data:image/webp'
          )
            ? 'image/webp'
            : outDataUrl.startsWith('data:image/png')
            ? 'image/png'
            : 'image/jpeg';

          resolve({
            base64Data: base64Part,
            dataUrl: outDataUrl,
            mimeType: finalMime,
            originalSizeBytes: file.size,
            compressedSizeBytes: estimatedBytes,
            width: targetW,
            height: targetH,
          });
        } catch (err) {
          reject(
            err instanceof Error
              ? err
              : new Error('Unexpected error while compressing image.')
          );
        }
      };

      img.src = sourceDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Scales a single food component's macronutrients proportionally when its gram weight changes.
 */
export function scaleComponentByGrams(
  component: AIFoodComponent,
  newGrams: number
): AIFoodComponent {
  const safeGrams = Math.max(0, Math.round(Number(newGrams) || 0));
  const prevGrams = component.estimatedGrams;

  if (prevGrams <= 0 || safeGrams === prevGrams) {
    return {
      ...component,
      estimatedGrams: safeGrams,
    };
  }

  const ratio = safeGrams / prevGrams;
  return {
    ...component,
    estimatedGrams: safeGrams,
    calories: Math.round(component.calories * ratio),
    protein: Number((component.protein * ratio).toFixed(1)),
    carbs: Number((component.carbs * ratio).toFixed(1)),
    fat: Number((component.fat * ratio).toFixed(1)),
    fiber: Number((component.fiber * ratio).toFixed(1)),
  };
}

/**
 * Sums an array of food components to compute overall serving weight and total macronutrients.
 */
export function sumComponentsNutrition(components: AIFoodComponent[]): {
  estimatedServingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
} {
  const estimatedServingGrams = Math.round(
    components.reduce((acc, c) => acc + (Number(c.estimatedGrams) || 0), 0)
  );
  const calories = Math.round(
    components.reduce((acc, c) => acc + (Number(c.calories) || 0), 0)
  );
  const protein = Number(
    components.reduce((acc, c) => acc + (Number(c.protein) || 0), 0).toFixed(1)
  );
  const carbs = Number(
    components.reduce((acc, c) => acc + (Number(c.carbs) || 0), 0).toFixed(1)
  );
  const fat = Number(
    components.reduce((acc, c) => acc + (Number(c.fat) || 0), 0).toFixed(1)
  );
  const fiber = Number(
    components.reduce((acc, c) => acc + (Number(c.fiber) || 0), 0).toFixed(1)
  );

  return {
    estimatedServingGrams,
    calories,
    protein,
    carbs,
    fat,
    fiber,
  };
}
