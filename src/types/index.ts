export type Language = 'en' | 'bn';

export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  age: number; // 38
  gender: 'male' | 'female' | 'other';
  heightCm: number; // 165
  targetWeightKg: number; // 63 (maintain)
  targetWaistCm: number; // 85 (intermediate), 82.5 (long term)
  dailyCalorieTarget: number; // e.g. 1850
  dailyProteinTargetGrams: number; // e.g. 75
  dailyStepsTarget: number; // e.g. 7000
  dailyWalkingMinutesTarget: number; // e.g. 35
  dailyWaterTargetGlasses: number; // e.g. 9
  weeklyWorkoutsTarget: number; // 3
  language: Language;
  updatedAt: string;
}

export type MealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

export type FoodCategory =
  | 'staple'
  | 'fish'
  | 'meat_egg'
  | 'dal_legume'
  | 'vegetable_bhorta'
  | 'dairy_drink'
  | 'fruit_snack';

export type ServingUnit =
  | 'grams'
  | 'cup'
  | 'katori'
  | 'piece'
  | 'tbsp'
  | 'glass'
  | 'plate';

export interface FoodItem {
  id: string;
  userId?: string;
  name: string;
  nameBn: string;
  category: FoodCategory;
  searchKeywords?: string[];
  defaultPortion: number;
  defaultUnit: ServingUnit;
  /** Weight in grams of 1 defaultUnit (or 1 piece if piece-based) */
  gramsPerUnit: number;
  /** Nutrition values per 1 defaultUnit (or per 100g when defaultUnit is 'grams') */
  caloriesPer100gOrUnit: number;
  proteinPer100gOrUnit: number;
  carbsPer100gOrUnit: number;
  fatPer100gOrUnit: number;
  fiberPer100gOrUnit?: number;
  isPerUnit?: boolean;
  waistGuidance?: 'ideal' | 'moderate' | 'limit';
  tipEn?: string;
  tipBn?: string;
  isCustom?: boolean;
  createdAt?: string;
}

export interface FavoriteFoodRecord {
  id: string;
  userId: string;
  foodId: string;
  createdAt: string;
}

export type CsvExportCategory =
  | 'all_zip'
  | 'all_combined_csv'
  | 'user_profile'
  | 'body_measurements'
  | 'nutrition_logs'
  | 'exercise_logs'
  | 'activity_logs'
  | 'habit_logs'
  | 'sleep_logs'
  | 'health_records'
  | 'ai_coach_notes'
  | 'favorite_foods'
  | 'custom_foods';

export interface NutritionLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foodName: string;
  foodNameBn?: string;
  portion: number;
  unit: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  notes?: string;
  createdAt: string;
}

export type AIFoodConfidence = 'high' | 'medium' | 'low' | 'unrecognized';

export interface AIFoodComponent {
  id: string;
  nameBn: string;
  nameEn: string;
  estimatedGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface AIFoodRecognitionResult {
  isFood: boolean;
  isBlurryOrDark: boolean;
  confidenceLevel: AIFoodConfidence;
  foodNameBn: string;
  foodNameEn: string;
  components: AIFoodComponent[];
  estimatedServingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  assumptionsAndNotesBn: string;
  assumptionsAndNotesEn: string;
  qualityWarningBn?: string;
  qualityWarningEn?: string;
}

export type ExerciseCategory =
  | 'walking'
  | 'brisk_walking'
  | 'squats'
  | 'push_ups'
  | 'plank'
  | 'glute_bridge'
  | 'stretching'
  | 'other';

export interface ExerciseLog {
  id: string;
  userId: string;
  date: string;
  exerciseType: ExerciseCategory;
  name: string;
  sets: number;
  reps: number;
  durationMinutes: number;
  rpe: number; // 1 - 10 Rate of Perceived Exertion
  caloriesBurned?: number;
  notes?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  date: string;
  steps: number;
  walkingDurationMinutes: number;
  distanceKm: number;
  notes?: string;
  createdAt: string;
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  date: string;
  weightKg: number;
  waistCm: number;
  bmi: number;
  waistToHeightRatio: number;
  notes?: string;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  userId: string;
  date: string;
  waterGlasses: number; // 1 glass ≈ 250ml
  sittingBreaks: number; // number of 2-5 min stretch/stand breaks taken
  walkingDone: boolean;
  exerciseDone: boolean;
  mealLogged: boolean;
  vegetableMet: boolean;
  sleepRoutineMet: boolean;
  updatedAt: string;
}

export interface SleepLog {
  id: string;
  userId: string;
  date: string;
  bedtime: string; // HH:mm
  wakeTime: string; // HH:mm
  durationMinutes: number;
  quality: number; // 1 - 5
  notes?: string;
  createdAt: string;
}

export type HealthRecordType = 'bp' | 'glucose' | 'hba1c' | 'lipid' | 'general';

export interface HealthRecord {
  id: string;
  userId: string;
  date: string;
  type: HealthRecordType;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  glucoseFasting?: number; // mg/dL or mmol/L
  glucosePostMeal?: number;
  hba1c?: number; // %
  totalCholesterol?: number; // mg/dL
  ldl?: number;
  hdl?: number;
  triglycerides?: number;
  reportNote?: string;
  createdAt: string;
}

export interface AICoachNote {
  id: string;
  userId: string;
  date: string;
  focusArea: string;
  advice: string;
  actionItems?: string;
  createdAt: string;
}
