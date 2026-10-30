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

export interface FoodItem {
  id: string;
  name: string;
  nameBn: string;
  category: 'staple' | 'protein' | 'vegetable' | 'dairy' | 'snack' | 'fruit' | 'beverage';
  defaultPortion: number;
  defaultUnit: 'grams' | 'cup' | 'katori' | 'piece' | 'tbsp' | 'glass';
  caloriesPer100gOrUnit: number;
  proteinPer100gOrUnit: number;
  carbsPer100gOrUnit: number;
  fatPer100gOrUnit: number;
  isPerUnit?: boolean; // if true, nutrition is per 1 piece/cup rather than per 100g
}

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
  notes?: string;
  createdAt: string;
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
