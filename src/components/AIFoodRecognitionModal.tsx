import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  AIFoodComponent,
  AIFoodConfidence,
  AIFoodRecognitionResult,
  MealType,
} from '../types';
import {
  CompressedFoodImage,
  compressClientFoodImage,
  scaleComponentByGrams,
  sumComponentsNutrition,
  validateClientImageFile,
} from '../utils/imageCompression';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  RefreshCw,
  Check,
  AlertTriangle,
  Info,
  Plus,
  X,
  Calendar,
  LogIn,
  PenLine,
} from 'lucide-react';

interface AIFoodRecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: string;
  initialMealType: MealType;
  initialFile?: File | null;
  onSaveToTracker: (entry: {
    date: string;
    mealType: MealType;
    foodName: string;
    foodNameBn: string;
    portion: number;
    unit: 'grams';
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    notes: string;
  }) => Promise<void>;
}

export const AIFoodRecognitionModal: React.FC<AIFoodRecognitionModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialMealType,
  initialFile,
  onSaveToTracker,
}) => {
  const { language, t } = useLanguage();
  const { user, signInWithGoogle } = useAuth();
  const isBn = language === 'bn';

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const isSavingRef = useRef<boolean>(false);

  // Target meal category and date
  const [targetDate, setTargetDate] = useState<string>(initialDate);
  const [targetMealType, setTargetMealType] = useState<MealType>(initialMealType);

  // Image selection & compression state
  const [compressedImage, setCompressedImage] =
    useState<CompressedFoodImage | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorMeta, setErrorMeta] = useState<{
    category?: string;
    code?: string;
    stage?: string;
    correlationId?: string;
  } | null>(null);
  const [requiresAuthError, setRequiresAuthError] = useState<boolean>(false);

  // Post-analysis editable confirmation state
  const [analysisResult, setAnalysisResult] =
    useState<AIFoodRecognitionResult | null>(null);
  const [isManualFallbackMode, setIsManualFallbackMode] =
    useState<boolean>(false);

  // Editable confirmation fields
  const [foodNameBn, setFoodNameBn] = useState<string>('');
  const [foodNameEn, setFoodNameEn] = useState<string>('');
  const [components, setComponents] = useState<AIFoodComponent[]>([]);
  const [servingGrams, setServingGrams] = useState<number>(0);
  const [calories, setCalories] = useState<number>(0);
  const [protein, setProtein] = useState<number>(0);
  const [carbs, setCarbs] = useState<number>(0);
  const [fat, setFat] = useState<number>(0);
  const [fiber, setFiber] = useState<number>(0);
  const [assumptionsNote, setAssumptionsNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sync initialDate & initialMealType when modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetDate(initialDate);
      setTargetMealType(initialMealType);
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [isOpen, initialDate, initialMealType]);

  // Process initialFile if passed directly from NutritionTracker camera/gallery trigger
  useEffect(() => {
    if (isOpen && initialFile) {
      handleProcessFile(initialFile);
    }
  }, [isOpen, initialFile]);

  if (!isOpen) return null;

  const populateEditableFields = (res: AIFoodRecognitionResult) => {
    setAnalysisResult(res);
    setFoodNameBn(res.foodNameBn || '');
    setFoodNameEn(res.foodNameEn || '');
    setComponents(res.components || []);
    setServingGrams(res.estimatedServingGrams || 0);
    setCalories(res.calories || 0);
    setProtein(res.protein || 0);
    setCarbs(res.carbs || 0);
    setFat(res.fat || 0);
    setFiber(res.fiber || 0);
    setAssumptionsNote(
      isBn ? res.assumptionsAndNotesBn : res.assumptionsAndNotesEn
    );
  };

  const handleProcessFile = async (file: File | null | undefined) => {
    if (!file) return;
    setErrorMessage(null);
    setErrorMeta(null);
    setRequiresAuthError(false);
    setAnalysisResult(null);
    setIsManualFallbackMode(false);

    const validation = validateClientImageFile(file);
    if (!validation.valid) {
      setErrorMeta({
        category: 'INVALID_IMAGE',
        code: 'CLIENT_IMAGE_VALIDATION',
        stage: 'IMAGE_PAYLOAD_VALIDATION',
      });
      setErrorMessage(
        isBn
          ? validation.errorBn || 'অবৈধ ছবির ফাইল।'
          : validation.errorEn || 'Invalid image file.'
      );
      return;
    }

    setIsCompressing(true);
    try {
      const compressed = await compressClientFoodImage(file, 1024, 0.8);
      setCompressedImage(compressed);
    } catch (err) {
      setErrorMeta({
        category: 'INVALID_IMAGE',
        code: 'CLIENT_COMPRESSION_ERROR',
        stage: 'IMAGE_PAYLOAD_VALIDATION',
      });
      setErrorMessage(
        err instanceof Error
          ? err.message
          : isBn
          ? 'ছবিটি প্রসেস করতে সমস্যা হয়েছে। অনুগ্রহ করে অন্য একটি ছবি চেষ্টা করুন।'
          : 'Failed to process image. Please try another photo.'
      );
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setCompressedImage(null);
    setAnalysisResult(null);
    setIsManualFallbackMode(false);
    setErrorMessage(null);
    setErrorMeta(null);
    setRequiresAuthError(false);
  };

  const formatCategorizedErrorMessage = (
    status: number,
    data: any,
    isHtmlOrUnreachable: boolean
  ): { message: string; isAuthFailure: boolean } => {
    const category = typeof data?.category === 'string' ? data.category : '';
    const code = typeof data?.code === 'string' ? data.code : '';
    const serverMsgBn = typeof data?.errorBn === 'string' ? data.errorBn : '';
    const serverMsgEn =
      typeof data?.errorEn === 'string'
        ? data.errorEn
        : typeof data?.error === 'string'
        ? data.error
        : '';

    // 1. Authentication failure
    if (
      status === 401 ||
      status === 403 ||
      category === 'AUTHENTICATION_FAILURE' ||
      code === 'UNAUTHENTICATED' ||
      code === 'MISSING_AUTH_HEADER' ||
      code === 'INVALID_ID_TOKEN' ||
      code === 'TOKEN_EXPIRED' ||
      code === 'PROJECT_ID_MISMATCH'
    ) {
      return {
        isAuthFailure: true,
        message: isBn
          ? serverMsgBn ||
            'লগইন যাচাই ব্যর্থ হয়েছে (Authentication Failure)। অনুগ্রহ করে পুনরায় গুগল দিয়ে লগইন করে চেষ্টা করুন অথবা নিচে ম্যানুয়ালি লিখুন।'
          : serverMsgEn ||
            'Authentication failed. Please sign in with Google again or enter values manually.',
      };
    }

    // 2. Invalid image
    if (
      status === 400 ||
      status === 413 ||
      category === 'INVALID_IMAGE' ||
      code === 'UNSUPPORTED_MIME_TYPE' ||
      code === 'MISSING_IMAGE_DATA' ||
      code === 'MIME_MISMATCH' ||
      code === 'INVALID_BASE64' ||
      code === 'IMAGE_TOO_SMALL' ||
      code === 'IMAGE_TOO_LARGE' ||
      code === 'INVALID_IMAGE_HEADER' ||
      code === 'PAYLOAD_TOO_LARGE'
    ) {
      return {
        isAuthFailure: false,
        message: isBn
          ? serverMsgBn ||
            'ছবির ফাইলটি সঠিক নয় বা সাইজ অনেক বড় (Invalid Image)। অনুগ্রহ করে ৪ মেগাবাইটের কম সাইজের একটি বৈধ JPEG, PNG বা WebP ছবি নির্বাচন করুন।'
          : serverMsgEn ||
            'Invalid image format or file size too large. Please upload a valid JPEG, PNG, or WebP photo under 4 MB.',
      };
    }

    // 3. Gemini API configuration failure
    if (
      category === 'GEMINI_CONFIG_FAILURE' ||
      code === 'GEMINI_CONFIG_ERROR'
    ) {
      return {
        isAuthFailure: false,
        message: isBn
          ? serverMsgBn ||
            'সার্ভারের Gemini API কনফিগারেশন ত্রুটিপূর্ণ (API Key বা Model সেটআপ সমস্যা)। আপনি নিচে ম্যানুয়ালি খাবারের তথ্য যোগ করতে পারেন।'
          : serverMsgEn ||
            'Gemini API configuration failure on the server. Please verify GEMINI_API_KEY configuration or enter meal values manually.',
      };
    }

    // 4. Rate limit exceeded
    if (
      status === 429 ||
      category === 'RATE_LIMIT_EXCEEDED' ||
      code === 'RATE_LIMIT_EXCEEDED' ||
      code === 'GEMINI_RATE_LIMIT'
    ) {
      const waitSec =
        typeof data?.retryAfterSeconds === 'number'
          ? data.retryAfterSeconds
          : 30;
      return {
        isAuthFailure: false,
        message: isBn
          ? serverMsgBn ||
            `অনুরোধের সীমা অতিক্রম করেছে (Rate Limit Exceeded)। অনুগ্রহ করে ${waitSec} সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন অথবা ম্যানুয়ালি লিখুন।`
          : serverMsgEn ||
            `Rate limit exceeded. Please wait ${waitSec} seconds before trying again, or enter meal details manually.`,
      };
    }

    // 5. Gemini service unavailable
    if (
      status === 503 ||
      category === 'GEMINI_SERVICE_UNAVAILABLE' ||
      code === 'GEMINI_SERVICE_UNAVAILABLE'
    ) {
      return {
        isAuthFailure: false,
        message: isBn
          ? serverMsgBn ||
            'Gemini এআই সেবা সাময়িকভাবে অনুপলব্ধ (Service Unavailable)। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন বা ম্যানুয়ালি লিখুন।'
          : serverMsgEn ||
            'Gemini AI vision service is temporarily unavailable. Please try again shortly or enter values manually.',
      };
    }

    // 6. Invalid AI response
    if (
      status === 502 ||
      category === 'INVALID_AI_RESPONSE' ||
      code === 'INVALID_AI_RESPONSE'
    ) {
      return {
        isAuthFailure: false,
        message: isBn
          ? serverMsgBn ||
            'এআই থেকে বৈধ পুষ্টিমান পাওয়া যায়নি (Invalid AI Response)। অনুগ্রহ করে পরিষ্কার আলোতে তোলা ছবি দিয়ে আবার চেষ্টা করুন বা ম্যানুয়ালি লিখুন।'
          : serverMsgEn ||
            'Received an invalid response from AI. Please try a clearer food photo or enter values manually.',
      };
    }

    // 7. Unknown server error / Endpoint unreachable
    if (isHtmlOrUnreachable || status === 404 || status === 405) {
      return {
        isAuthFailure: false,
        message: isBn
          ? 'সার্ভারের এআই এন্ডপয়েন্টের সাথে সংযোগ স্থাপন করা যায়নি (Server Endpoint Error)। অনুগ্রহ করে আবার চেষ্টা করুন বা ম্যানুয়ালি খাবারের তথ্য লিখুন।'
          : 'Could not reach the AI food recognition server endpoint. Please try again or enter values manually.',
      };
    }

    return {
      isAuthFailure: false,
      message: isBn
        ? serverMsgBn ||
          'সার্ভারে একটি অপ্রত্যাশিত ত্রুটি ঘটেছে (Unknown Server Error)। আবার চেষ্টা করুন বা ম্যানুয়ালি লিখুন।'
        : serverMsgEn ||
          'An unexpected server error occurred while analyzing the food photo. Please try again or enter values manually.',
    };
  };

  const handleAnalyzeImage = async () => {
    if (!compressedImage || isAnalyzing) return;
    setErrorMessage(null);
    setErrorMeta(null);
    setRequiresAuthError(false);

    if (!user) {
      setRequiresAuthError(true);
      setErrorMeta({
        category: 'AUTHENTICATION_FAILURE',
        code: 'UNAUTHENTICATED',
        stage: 'AUTH_TOKEN_VERIFICATION',
      });
      setErrorMessage(
        isBn
          ? 'এআই ফুড রিকগনিশন ব্যবহার করতে গুগল অ্যাকাউন্ট দিয়ে লগইন করা প্রয়োজন। লগইন করুন অথবা নিচে ম্যানুয়ালি খাবারের তথ্য লিখুন।'
          : 'Google Sign-In is required to verify your account for AI Food Recognition. Please sign in or enter meal values manually below.'
      );
      return;
    }

    setIsAnalyzing(true);
    try {
      const executeAnalysisRequest = async (forceRefreshToken: boolean) => {
        const idToken = await user.getIdToken(forceRefreshToken);
        return fetch('/api/gemini/food-recognition', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'MyFitJourneyClient',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            imageBase64: compressedImage.base64Data,
            mimeType: compressedImage.mimeType,
            language: isBn ? 'bn' : 'en',
          }),
        });
      };

      let response = await executeAnalysisRequest(false);
      let rawText = await response.text();
      let trimmed = rawText.trim();
      let isHtmlResponse = trimmed.startsWith('<');
      let data: any = null;

      if (!isHtmlResponse && trimmed) {
        try {
          data = JSON.parse(trimmed);
        } catch {
          data = null;
        }
      }

      // If token expired or failed verification on first try, force refresh Firebase ID token once and retry
      if (
        response.status === 401 &&
        data &&
        (data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_ID_TOKEN')
      ) {
        response = await executeAnalysisRequest(true);
        rawText = await response.text();
        trimmed = rawText.trim();
        isHtmlResponse = trimmed.startsWith('<');
        data = null;
        if (!isHtmlResponse && trimmed) {
          try {
            data = JSON.parse(trimmed);
          } catch {
            data = null;
          }
        }
      }

      if (!response.ok || !data || isHtmlResponse) {
        const formatted = formatCategorizedErrorMessage(
          response.status,
          data,
          isHtmlResponse || !data
        );
        if (formatted.isAuthFailure) {
          setRequiresAuthError(true);
        }
        const vercelError = response.headers.get('x-vercel-error');
        setErrorMeta({
          category:
            data?.category ||
            (isHtmlResponse || !data ? 'UNKNOWN_SERVER_ERROR' : undefined),
          code:
            data?.code ||
            (vercelError ? `VERCEL_${vercelError}` : `HTTP_${response.status}`),
          stage:
            data?.stage ||
            (isHtmlResponse || !data ? 'REQUEST_RECEIVED' : undefined),
          correlationId:
            data?.correlationId ||
            response.headers.get('x-correlation-id') ||
            response.headers.get('x-vercel-id') ||
            undefined,
        });
        setErrorMessage(formatted.message);
        return;
      }

      populateEditableFields(data as AIFoodRecognitionResult);
    } catch (err) {
      setErrorMeta({
        category: 'UNKNOWN_SERVER_ERROR',
        code: 'NETWORK_ERROR',
      });
      setErrorMessage(
        err instanceof Error && err.message && !err.message.includes('Failed to fetch')
          ? err.message
          : isBn
          ? 'নেটওয়ার্ক বা সার্ভার সংযোগ ত্রুটির কারণে খাবারের ছবি বিশ্লেষণ করা যায়নি। ইন্টারনেট সংযোগ যাচাই করে আবার চেষ্টা করুন বা ম্যানুয়ালি লিখুন।'
          : 'Network connection error while analyzing food photo. Please check your connection and try again, or enter values manually.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEnableManualEntry = () => {
    setIsManualFallbackMode(true);
    setErrorMessage(null);
    setErrorMeta(null);
    setAnalysisResult({
      isFood: true,
      isBlurryOrDark: false,
      confidenceLevel: 'unrecognized',
      foodNameBn: foodNameBn || '',
      foodNameEn: foodNameEn || '',
      components: [],
      estimatedServingGrams: servingGrams || 150,
      calories: calories || 0,
      protein: protein || 0,
      carbs: carbs || 0,
      fat: fat || 0,
      fiber: fiber || 0,
      assumptionsAndNotesBn:
        'ম্যানুয়াল এন্ট্রি: ছবির কেবল দৃশ্যমান তথ্যের ওপর নির্ভর না করে আপনি সরাসরি খাবারের ওজন ও পুষ্টিমান নির্ধারণ করছেন।',
      assumptionsAndNotesEn:
        'Manual Entry: You are directly specifying the meal serving weight and macronutrients.',
    });
    if (!servingGrams) setServingGrams(150);
  };

  // Component editing handlers
  const handleComponentGramChange = (compId: string, newGrams: number) => {
    const updated = components.map((c) =>
      c.id === compId ? scaleComponentByGrams(c, newGrams) : c
    );
    setComponents(updated);
    const totals = sumComponentsNutrition(updated);
    setServingGrams(totals.estimatedServingGrams);
    setCalories(totals.calories);
    setProtein(totals.protein);
    setCarbs(totals.carbs);
    setFat(totals.fat);
    setFiber(totals.fiber);
  };

  const handleComponentFieldChange = (
    compId: string,
    field: keyof AIFoodComponent,
    value: string | number
  ) => {
    const updated = components.map((c) => {
      if (c.id !== compId) return c;
      return {
        ...c,
        [field]:
          typeof value === 'string' && (field === 'nameBn' || field === 'nameEn')
            ? value
            : Math.max(0, Number(value) || 0),
      };
    });
    setComponents(updated);
    if (field !== 'nameBn' && field !== 'nameEn') {
      const totals = sumComponentsNutrition(updated);
      setServingGrams(totals.estimatedServingGrams);
      setCalories(totals.calories);
      setProtein(totals.protein);
      setCarbs(totals.carbs);
      setFat(totals.fat);
      setFiber(totals.fiber);
    }
  };

  const handleAddComponent = () => {
    const newComp: AIFoodComponent = {
      id: `comp_manual_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      nameBn: isBn ? 'নতুন পদ' : 'New Item',
      nameEn: 'New Item',
      estimatedGrams: 100,
      calories: 120,
      protein: 5,
      carbs: 15,
      fat: 4,
      fiber: 2,
    };
    const updated = [...components, newComp];
    setComponents(updated);
    const totals = sumComponentsNutrition(updated);
    setServingGrams(totals.estimatedServingGrams);
    setCalories(totals.calories);
    setProtein(totals.protein);
    setCarbs(totals.carbs);
    setFat(totals.fat);
    setFiber(totals.fiber);
  };

  const handleRemoveComponent = (compId: string) => {
    const updated = components.filter((c) => c.id !== compId);
    setComponents(updated);
    if (updated.length > 0) {
      const totals = sumComponentsNutrition(updated);
      setServingGrams(totals.estimatedServingGrams);
      setCalories(totals.calories);
      setProtein(totals.protein);
      setCarbs(totals.carbs);
      setFat(totals.fat);
      setFiber(totals.fiber);
    }
  };

  // Scale total macros proportionally when overall servingGrams is edited
  const handleTotalServingGramsChange = (nextGramsRaw: number) => {
    const nextGrams = Math.max(0, Math.round(Number(nextGramsRaw) || 0));
    const prevGrams = servingGrams;
    setServingGrams(nextGrams);

    if (prevGrams > 0 && nextGrams > 0 && nextGrams !== prevGrams) {
      const ratio = nextGrams / prevGrams;
      setCalories(Math.round(calories * ratio));
      setProtein(Number((protein * ratio).toFixed(1)));
      setCarbs(Number((carbs * ratio).toFixed(1)));
      setFat(Number((fat * ratio).toFixed(1)));
      setFiber(Number((fiber * ratio).toFixed(1)));

      if (components.length > 0) {
        setComponents(
          components.map((c) => ({
            ...c,
            estimatedGrams: Math.max(1, Math.round(c.estimatedGrams * ratio)),
            calories: Math.round(c.calories * ratio),
            protein: Number((c.protein * ratio).toFixed(1)),
            carbs: Number((c.carbs * ratio).toFixed(1)),
            fat: Number((c.fat * ratio).toFixed(1)),
            fiber: Number((c.fiber * ratio).toFixed(1)),
          }))
        );
      }
    }
  };

  // Explicit Save Action ("Add to Nutrition Tracker") with duplicate-click lock
  const handleConfirmAddToTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current || isSaving) return;

    const finalNameBn =
      foodNameBn.trim() ||
      foodNameEn.trim() ||
      (isBn ? 'এআই শনাক্তকৃত খাবার' : 'AI Recognized Meal');
    const finalNameEn = foodNameEn.trim() || finalNameBn;

    if (servingGrams <= 0) {
      setErrorMessage(
        isBn
          ? 'অনুগ্রহ করে খাবারের ওজন (গ্রাম) ০-এর বেশি দিন।'
          : 'Please enter a serving weight greater than 0 grams.'
      );
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const componentSummary =
        components.length > 0
          ? components
              .map(
                (c) =>
                  `${isBn ? c.nameBn || c.nameEn : c.nameEn || c.nameBn} (${
                    c.estimatedGrams
                  }g)`
              )
              .join(', ')
          : '';

      const rawNoteParts = [
        `AI Food Recognition (~${servingGrams}g, Fiber: ${fiber}g)`,
        componentSummary ? `Items: ${componentSummary}` : '',
      ].filter(Boolean);

      const safeNotes = rawNoteParts.join(' | ').slice(0, 480);

      await onSaveToTracker({
        date: targetDate,
        mealType: targetMealType,
        foodName: finalNameEn.slice(0, 240),
        foodNameBn: finalNameBn.slice(0, 240),
        portion: Math.max(1, Math.round(servingGrams)),
        unit: 'grams',
        calories: Math.max(0, Math.min(5000, Math.round(calories))),
        protein: Math.max(0, Math.min(500, Number(protein.toFixed(1)))),
        carbs: Math.max(0, Math.min(1000, Number(carbs.toFixed(1)))),
        fat: Math.max(0, Math.min(500, Number(fat.toFixed(1)))),
        fiber: Math.max(0, Math.min(200, Number(fiber.toFixed(1)))),
        notes: safeNotes,
      });

      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : isBn
          ? 'খাবার সংরক্ষণ করতে সমস্যা হয়েছে।'
          : 'Failed to save food log.'
      );
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const getConfidenceBadge = (conf: AIFoodConfidence) => {
    switch (conf) {
      case 'high':
        return {
          label: isBn ? 'উচ্চ নিশ্চয়তা (High Confidence)' : 'High Confidence',
          className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'medium':
        return {
          label: isBn
            ? 'মাঝারি নিশ্চয়তা (Medium Confidence)'
            : 'Medium Confidence',
          className: 'bg-sky-50 text-sky-800 border-sky-200',
        };
      case 'low':
        return {
          label: isBn ? 'কম নিশ্চয়তা (Low Confidence)' : 'Low Confidence',
          className: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      default:
        return {
          label: isBn
            ? 'শনাক্ত করা যায়নি / ম্যানুয়াল'
            : 'Unrecognized / Manual Review',
          className: 'bg-rose-50 text-rose-800 border-rose-200',
        };
    }
  };

  const meals: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner'];
  const showReviewScreen = Boolean(analysisResult || isManualFallbackMode);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-2xl max-h-[94vh] overflow-y-auto shadow-2xl border border-neutral-100 dark:border-neutral-800 space-y-5">
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1.5 bg-neutral-200 rounded-full mx-auto sm:hidden" />

        {/* Hidden File Inputs for Camera and Gallery */}
        <input
          ref={cameraInputRef}
          id="ai-food-camera-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          id="ai-food-gallery-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/70 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {isBn
                  ? 'এআই ফুড রিকগনিশন (AI Food Recognition)'
                  : 'AI Food Recognition'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {isBn
                  ? 'খাবারের ছবি তুলে বা গ্যালারি থেকে নিয়ে ক্যালোরি, প্রোটিন ও উপাদান বিশ্লেষণ করুন'
                  : 'Snap or upload a meal photo to identify Bangladeshi foods, portions & macros'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: Image Input & Preview Area */}
        {!compressedImage ? (
          <div className="p-6 sm:p-8 rounded-3xl border-2 border-dashed border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/30 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-neutral-900 shadow-xs border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center mx-auto text-emerald-700 dark:text-emerald-400">
              <Camera className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
                {isBn
                  ? 'আপনার খাবারের প্লেটের ছবি নির্বাচন করুন'
                  : 'Capture or Select Your Meal Photo'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {isBn
                  ? 'ভাত, মাছের ঝোল, ডাল, শাক-সবজি, খিচুড়ি বা রুটি-মাংসের ছবি তুলুন। JPEG, PNG এবং WebP সমর্থিত (বড় ছবি স্বয়ংক্রিয়ভাবে কমপ্রেস হবে)।'
                  : 'Supports single dishes or mixed Bengali plates (rice, fish curry, dal, bhaji, khichuri, roti). Supports JPEG, PNG & WebP.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>
                  {isBn ? 'ক্যামেরায় ছবি তুলুন' : 'Take Photo with Camera'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/70 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>
                  {isBn ? 'গ্যালারি থেকে ছবি নিন' : 'Select from Gallery'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-44 h-44 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shrink-0">
                <img
                  src={compressedImage.dataUrl}
                  alt="Selected food preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-medium tabular-nums">
                  {Math.round(compressedImage.compressedSizeBytes / 1024)} KB ·{' '}
                  {compressedImage.width}&times;{compressedImage.height}
                </div>
              </div>

              <div className="flex-1 space-y-3 w-full">
                <div>
                  <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {isBn ? 'নির্বাচিত খাবারের ছবি' : 'Selected Meal Image'}
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {isBn
                      ? `মূল সাইজ: ${Math.round(
                          compressedImage.originalSizeBytes / 1024
                        )} KB → অপ্টিমাইজড: ${Math.round(
                          compressedImage.compressedSizeBytes / 1024
                        )} KB (${compressedImage.mimeType})`
                      : `Original: ${Math.round(
                          compressedImage.originalSizeBytes / 1024
                        )} KB → Compressed: ${Math.round(
                          compressedImage.compressedSizeBytes / 1024
                        )} KB (${compressedImage.mimeType})`}
                  </p>
                </div>

                {/* Replace or Remove Image Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={() => cameraInputRef.current?.click()}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>{isBn ? 'নতুন ছবি তুলুন' : 'Retake Photo'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={() => galleryInputRef.current?.click()}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>{isBn ? 'ছবি পরিবর্তন করুন' : 'Replace Image'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={handleRemoveImage}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 hover:bg-rose-100 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isBn ? 'ছবি মুছে ফেলুন' : 'Remove Image'}</span>
                  </button>
                </div>

                {/* Primary Analyze Trigger (Before review screen is shown) */}
                {!showReviewScreen && (
                  <button
                    type="button"
                    disabled={isAnalyzing || isCompressing}
                    onClick={handleAnalyzeImage}
                    className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>
                          {isBn
                            ? 'এআই ছবিটি বিশ্লেষণ করছে...'
                            : 'Analyzing Food Photo with AI...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {isBn
                            ? 'খাবার ও পুষ্টিমান বিশ্লেষণ করুন (Analyze Food)'
                            : 'Analyze Food & Estimate Nutrition'}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Compressing Indicator */}
        {isCompressing && (
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-700 dark:text-emerald-400" />
            <span>
              {isBn
                ? 'ছবিটি অপ্টিমাইজ ও কমপ্রেস করা হচ্ছে...'
                : 'Optimizing and compressing image...'}
            </span>
          </div>
        )}

        {/* Error & Recovery Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="leading-relaxed font-medium">{errorMessage}</div>
                {errorMeta && (errorMeta.code || errorMeta.correlationId) && (
                  <div className="text-[11px] text-rose-700/80 font-mono flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    {errorMeta.code && <span>Code: {errorMeta.code}</span>}
                    {errorMeta.stage && <span>Stage: {errorMeta.stage}</span>}
                    {errorMeta.correlationId && (
                      <span>Ref: {errorMeta.correlationId}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {requiresAuthError && !user && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await signInWithGoogle();
                      setRequiresAuthError(false);
                      setErrorMessage(null);
                    } catch {
                      // handled by AuthContext
                    }
                  }}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('signInWithGoogle')}</span>
                </button>
              )}

              {compressedImage && (
                <button
                  type="button"
                  onClick={handleAnalyzeImage}
                  disabled={isAnalyzing}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-rose-300 dark:border-rose-700/70 hover:bg-rose-100 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {isBn ? 'পুনরায় চেষ্টা করুন' : 'Analyze Again'}
                  </span>
                </button>
              )}

              {!showReviewScreen && (
                <button
                  type="button"
                  onClick={handleEnableManualEntry}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <PenLine className="w-3.5 h-3.5" />
                  <span>
                    {isBn
                      ? 'ম্যানুয়ালি খাবারের তথ্য লিখুন'
                      : 'Enter Values Manually'}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            STEP 2: EDITABLE CONFIRMATION SCREEN (Post-Analysis Review)
        =================================================================== */}
        {showReviewScreen && (
          <form onSubmit={handleConfirmAddToTracker} className="space-y-5 pt-1">
            {/* Confidence Level & Status Header */}
            {analysisResult && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    {isBn ? 'এআই শনাক্তকরণ ফলাফল:' : 'AI Recognition Status:'}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                      getConfidenceBadge(analysisResult.confidenceLevel)
                        .className
                    }`}
                  >
                    {getConfidenceBadge(analysisResult.confidenceLevel).label}
                  </span>
                </div>

                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {isBn
                    ? 'সংরক্ষণের আগে যেকোনো মান পরিবর্তন করতে পারবেন'
                    : 'Review & edit any field below before saving'}
                </span>
              </div>
            )}

            {/* Low Confidence / Blurry / Unclear Image Warning */}
            {analysisResult &&
              (analysisResult.isBlurryOrDark ||
                !analysisResult.isFood ||
                analysisResult.confidenceLevel === 'low' ||
                analysisResult.confidenceLevel === 'unrecognized' ||
                analysisResult.qualityWarningBn ||
                analysisResult.qualityWarningEn) && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">
                      {isBn
                        ? 'অস্পষ্ট ছবি বা কম নিশ্চয়তার সতর্কতা:'
                        : 'Image Clarity & Uncertainty Notice:'}
                    </div>
                    <p className="mt-0.5">
                      {isBn
                        ? analysisResult.qualityWarningBn ||
                          'ছবিটি থেকে খাবারটি সম্পূর্ণ নিশ্চিতভাবে চেনা যায়নি। অনুগ্রহ করে নিচে খাবারের নাম, ওজন এবং পুষ্টিমান নিজে যাচাই বা পূরণ করুন।'
                        : analysisResult.qualityWarningEn ||
                          'Could not confidently identify all items in this image. Please verify or enter the meal details manually below.'}
                    </p>
                  </div>
                </div>
              )}

            {/* Mandatory Visual Estimation Disclaimer (Cooking oil, sugar, hidden ingredients, serving weight) */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70 text-xs text-emerald-950 dark:text-emerald-200 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200">
                <Info className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span>
                  {isBn
                    ? 'অনুমান ও সীমাবদ্ধতা (Assumptions & Limitations):'
                    : 'Assumptions & Visual Estimation Disclaimer:'}
                </span>
              </div>
              <p className="text-emerald-900/90">{assumptionsNote}</p>
              <p className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 pt-0.5 border-t border-emerald-200/60 dark:border-emerald-800/70">
                {isBn
                  ? 'স্মরণীয়: কেবল ছবির মাধ্যমে রান্নার তেল, অতিরিক্ত চিনি, লুকানো উপাদান এবং খাবারের প্রকৃত ওজন (গ্রাম) শতভাগ নিশ্চিতভাবে নির্ধারণ করা সম্ভব নয়।'
                  : 'Important: Cooking oil, added sugar, hidden ingredients, and actual serving weight are difficult to determine from an image alone.'}
              </p>
            </div>

            {/* Meal Category & Date Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-800">
              <div className="sm:col-span-7">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {isBn ? 'খাবারের বেলা (Meal Category)' : 'Meal Category'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {meals.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTargetMealType(m)}
                      className={`min-h-[40px] px-2 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors truncate ${
                        targetMealType === m
                          ? 'bg-neutral-900 text-white'
                          : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {t(m)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {isBn ? 'তারিখ (Date)' : 'Log Date'}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) =>
                      setTargetDate(e.target.value || initialDate)
                    }
                    className="w-full min-h-[40px] pl-9 pr-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Editable Food Name (Bengali & English) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  {isBn ? 'খাবারের নাম (বাংলা) *' : 'Food Name (Bengali) *'}
                </label>
                <input
                  type="text"
                  required
                  value={foodNameBn}
                  onChange={(e) => setFoodNameBn(e.target.value)}
                  placeholder={
                    isBn
                      ? 'যেমন: সাদা ভাত, রুই মাছের ঝোল ও শাক ভাজি'
                      : 'e.g. সাদা ভাত ও মাছের ঝোল'
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  {isBn ? 'খাবারের নাম (ইংরেজি) *' : 'Food Name (English) *'}
                </label>
                <input
                  type="text"
                  required
                  value={foodNameEn}
                  onChange={(e) => setFoodNameEn(e.target.value)}
                  placeholder="e.g. Steamed Rice, Rui Fish Curry & Spinach"
                  className="w-full min-h-[44px] px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Editable Identified Food Components (for Single or Mixed Bengali Meals) */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {isBn
                      ? `শনাক্তকৃত খাবারের উপাদানসমূহ (${components.length}টি পদ)`
                      : `Identified Meal Components (${components.length})`}
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {isBn
                      ? 'মিশ্র খাবারের প্রতিটি পদের ওজন (গ্রাম) পরিবর্তন করলে মোট ক্যালোরি ও প্রোটিন স্বয়ংক্রিয়ভাবে হিসাব হবে'
                      : 'Adjusting any component weight (g) or macro automatically updates the meal totals'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddComponent}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-emerald-50 hover:border-emerald-300 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isBn ? 'উপাদান যোগ করুন' : 'Add Component'}</span>
                </button>
              </div>

              {components.length === 0 ? (
                <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 text-center">
                  {isBn
                    ? 'কোনো আলাদা উপাদান তালিকাভুক্ত নেই। আপনি চাইলে "+ উপাদান যোগ করুন" বাটনে ক্লিক করতে পারেন অথবা নিচে সরাসরি মোট পুষ্টিমান লিখতে পারেন।'
                    : 'No individual components listed. Click "+ Add Component" to break down a mixed meal or edit the total values directly below.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {components.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] text-neutral-400 font-medium">
                            {isBn ? 'নাম (বাংলা)' : 'Name (BN)'}
                          </label>
                          <input
                            type="text"
                            value={comp.nameBn}
                            onChange={(e) =>
                              handleComponentFieldChange(
                                comp.id,
                                'nameBn',
                                e.target.value
                              )
                            }
                            className="w-full min-h-[36px] px-2.5 py-1 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-semibold text-neutral-900 dark:text-neutral-100"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[10px] text-neutral-400 font-medium">
                            {isBn ? 'নাম (ইংরেজি)' : 'Name (EN)'}
                          </label>
                          <input
                            type="text"
                            value={comp.nameEn}
                            onChange={(e) =>
                              handleComponentFieldChange(
                                comp.id,
                                'nameEn',
                                e.target.value
                              )
                            }
                            className="w-full min-h-[36px] px-2.5 py-1 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                            {isBn ? 'ওজন (গ্রাম)' : 'Weight (g)'}
                          </label>
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={comp.estimatedGrams}
                            onChange={(e) =>
                              handleComponentGramChange(
                                comp.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full min-h-[36px] px-2.5 py-1 bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 rounded-lg text-xs font-bold text-emerald-900 dark:text-emerald-200 tabular-nums"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end pt-3 sm:pt-4">
                          <button
                            type="button"
                            onClick={() => handleRemoveComponent(comp.id)}
                            className="min-h-[36px] min-w-[36px] rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center"
                            title={isBn ? 'মুছে ফেলুন' : 'Remove component'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Component Macro Row */}
                      <div className="grid grid-cols-5 gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800 text-[11px]">
                        <div>
                          <span className="text-neutral-400 block">kcal</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={comp.calories}
                            onChange={(e) =>
                              handleComponentFieldChange(
                                comp.id,
                                'calories',
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="w-full px-2 py-1 mt-0.5 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-md font-semibold tabular-nums"
                          />
                        </div>
                        <div>
                          <span className="text-emerald-700 dark:text-emerald-400 block">
                            {isBn ? 'প্রোটিন (g)' : 'Prot (g)'}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={comp.protein}
                            onChange={(e) =>
                              handleComponentFieldChange(
                                comp.id,
                                'protein',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1 mt-0.5 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-md font-semibold text-emerald-800 dark:text-emerald-300 tabular-nums"
                          />
                        </div>
                        <div>
                          <span className="text-neutral-400 block">
                            {isBn ? 'শর্করা (g)' : 'Carbs (g)'}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={comp.carbs}
                            onChange={(e) =>
                              handleComponentFieldChange(
                                comp.id,
                                'carbs',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1 mt-0.5 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-md font-semibold tabular-nums"
                          />
                        </div>
                        <div>
                          <span className="text-neutral-400 block">
                            {isBn ? 'চর্বি (g)' : 'Fat (g)'}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={comp.fat}
                            onChange={(e) =>
                              handleComponentFieldChange(
                                comp.id,
                                'fat',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1 mt-0.5 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-md font-semibold tabular-nums"
                          />
                        </div>
                        <div>
                          <span className="text-neutral-400 block">
                            {isBn ? 'ফাইবার (g)' : 'Fiber (g)'}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={comp.fiber}
                            onChange={(e) =>
                              handleComponentFieldChange(
                                comp.id,
                                'fiber',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1 mt-0.5 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-md font-semibold tabular-nums"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Editable Overall Serving Size (Grams) & Total Macronutrients */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  {isBn
                    ? 'মোট খাবারের পরিমাণ ও পুষ্টিমান (সম্পাদনাযোগ্য)'
                    : 'Total Serving Size & Nutrition Summary (Editable)'}
                </span>
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 tabular-nums">
                  {servingGrams}g · {calories} kcal
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                {/* Serving Quantity in Grams */}
                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                    {isBn ? 'মোট ওজন (g)' : 'Serving (g)'}
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={servingGrams}
                    onChange={(e) =>
                      handleTotalServingGramsChange(
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full min-h-[42px] px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-700/70 rounded-xl text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200 tabular-nums"
                  />
                </div>

                {/* Calories */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    {isBn ? 'ক্যালোরি (kcal)' : 'Calories'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={calories}
                    onChange={(e) =>
                      setCalories(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-full min-h-[42px] px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 tabular-nums"
                  />
                </div>

                {/* Protein */}
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                    {isBn ? 'প্রোটিন (g)' : 'Protein (g)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={protein}
                    onChange={(e) =>
                      setProtein(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="w-full min-h-[42px] px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300 tabular-nums"
                  />
                </div>

                {/* Carbohydrates */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    {isBn ? 'শর্করা (g)' : 'Carbs (g)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={carbs}
                    onChange={(e) =>
                      setCarbs(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="w-full min-h-[42px] px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 tabular-nums"
                  />
                </div>

                {/* Fat */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    {isBn ? 'চর্বি (g)' : 'Fat (g)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={fat}
                    onChange={(e) =>
                      setFat(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="w-full min-h-[42px] px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 tabular-nums"
                  />
                </div>

                {/* Fiber */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    {isBn ? 'ফাইবার (g)' : 'Fiber (g)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={fiber}
                    onChange={(e) =>
                      setFiber(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="w-full min-h-[42px] px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Two Primary Confirmation Actions: "Analyze Again" and "Add to Nutrition Tracker" */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isAnalyzing || isSaving}
                onClick={handleAnalyzeImage}
                className="w-full sm:w-2/5 min-h-[48px] px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/70 text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`}
                />
                <span>
                  {isBn
                    ? 'পুনরায় বিশ্লেষণ করুন (Analyze Again)'
                    : 'Analyze Again'}
                </span>
              </button>

              <button
                type="submit"
                disabled={isSaving || isAnalyzing}
                className="w-full sm:w-3/5 min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSaving
                    ? isBn
                      ? 'সংরক্ষণ হচ্ছে...'
                      : 'Saving...'
                    : isBn
                    ? 'নিউট্রিশন ট্র্যাকারে যোগ করুন (Add to Nutrition Tracker)'
                    : 'Add to Nutrition Tracker'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
