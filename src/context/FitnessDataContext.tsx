import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  db,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  NutritionLog,
  ExerciseLog,
  ActivityLog,
  BodyMeasurement,
  HabitLog,
  SleepLog,
  HealthRecord,
  AICoachNote,
  MealType,
  FoodItem,
  FavoriteFoodRecord,
  CsvExportCategory,
} from '../types';
import { BENGALI_FOODS } from '../data/bengaliFoods';
import { downloadCsvExport, triggerBrowserDownload } from '../utils/csvExport';

export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getRecentDatesList(
  isBn: boolean,
  daysCount: number = 7
): { dateStr: string; dayLabel: string; dayNum: string; isToday: boolean }[] {
  const todayStr = getTodayDateStr();
  const list: { dateStr: string; dayLabel: string; dayNum: string; isToday: boolean }[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    const dayLabel = new Intl.DateTimeFormat(isBn ? 'bn-BD' : 'en-US', {
      weekday: 'short',
    }).format(d);
    list.push({
      dateStr,
      dayLabel,
      dayNum: String(d.getDate()),
      isToday: dateStr === todayStr,
    });
  }
  return list;
}

export const DEFAULT_FAVORITE_FOOD_IDS: string[] = [
  'food_atta_roti',
  'food_egg_boiled',
  'food_brown_rice',
  'food_rui_fish_curry',
  'food_masoor_dal_thick',
  'food_palong_shak',
  'food_tok_doi',
];

function sanitizeDocId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return cleaned || `id_${Date.now()}`;
}

function loadLocalFavorites(): string[] {
  try {
    const saved = localStorage.getItem('myfit_favorites');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return Array.from(new Set(parsed.filter((x) => typeof x === 'string' && x.trim().length > 0)));
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return DEFAULT_FAVORITE_FOOD_IDS;
}

function loadLocalCustomFoods(): FoodItem[] {
  try {
    const saved = localStorage.getItem('myfit_custom_foods');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter((x) => x && typeof x.id === 'string' && typeof x.name === 'string');
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return [];
}

// Initial baseline data matching the 38-yo male user's brief
const today = getTodayDateStr();
const yesterday = getYesterdayDateStr();

const INITIAL_MEASUREMENTS: BodyMeasurement[] = [
  {
    id: 'meas_initial',
    userId: 'demo_user',
    date: yesterday,
    weightKg: 63.0,
    waistCm: 88.0,
    bmi: 23.14, // 63 / (1.65^2)
    waistToHeightRatio: 0.533, // 88 / 165
    notes: 'Baseline check: 38 yrs male, sedentary desk routine. Target waist 85cm then <82.5cm.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'meas_today',
    userId: 'demo_user',
    date: today,
    weightKg: 63.0,
    waistCm: 88.0,
    bmi: 23.14,
    waistToHeightRatio: 0.533,
    notes: 'Current baseline. Maintaining 63kg while working on abdominal circumference.',
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_NUTRITION: NutritionLog[] = [
  {
    id: 'nut_1',
    userId: 'demo_user',
    date: today,
    mealType: 'breakfast',
    foodName: 'Whole Wheat Roti / Chapati (আটার রুটি)',
    foodNameBn: 'আটার রুটি',
    portion: 2,
    unit: 'piece',
    calories: 170,
    protein: 6.2,
    carbs: 35.0,
    fat: 1.0,
    notes: '2 chapatis with vegetable',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'nut_2',
    userId: 'demo_user',
    date: today,
    mealType: 'breakfast',
    foodName: 'Whole Boiled Egg (সিদ্ধ ডিম)',
    foodNameBn: 'সিদ্ধ ডিম',
    portion: 1,
    unit: 'piece',
    calories: 74,
    protein: 6.3,
    carbs: 0.4,
    fat: 5.0,
    notes: 'Boiled egg for breakfast protein',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'nut_3',
    userId: 'demo_user',
    date: today,
    mealType: 'lunch',
    foodName: 'Brown Rice (লাল চালের ভাত)',
    foodNameBn: 'লাল চালের ভাত',
    portion: 1,
    unit: 'cup',
    calories: 165,
    protein: 3.5,
    carbs: 35.0,
    fat: 1.2,
    notes: 'Portion controlled rice',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'nut_4',
    userId: 'demo_user',
    date: today,
    mealType: 'lunch',
    foodName: 'Rui Fish Light Curry (রুই মাছের পাতলা ঝোল)',
    foodNameBn: 'রুই মাছের পাতলা ঝোল',
    portion: 1,
    unit: 'piece',
    calories: 140,
    protein: 18.0,
    carbs: 3.5,
    fat: 5.5,
    notes: 'Fish with light jhol and pointed gourd',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'nut_5',
    userId: 'demo_user',
    date: today,
    mealType: 'lunch',
    foodName: 'Masoor Dal Patla Jhol (মসুর ডাল পাতলা)',
    foodNameBn: 'মসুর ডাল পাতলা',
    portion: 1,
    unit: 'katori',
    calories: 95,
    protein: 6.2,
    carbs: 14.0,
    fat: 1.5,
    notes: 'Lentil soup',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'nut_6',
    userId: 'demo_user',
    date: today,
    mealType: 'lunch',
    foodName: 'Palong Shak Bhaji / Spinach (পালং শাক ভাজি)',
    foodNameBn: 'পালং শাক ভাজি (অল্প তেলে)',
    portion: 1,
    unit: 'katori',
    calories: 65,
    protein: 3.2,
    carbs: 5.0,
    fat: 3.5,
    notes: 'Spinach stir fry',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'nut_y1',
    userId: 'demo_user',
    date: yesterday,
    mealType: 'breakfast',
    foodName: 'Whole Wheat Roti / Lal Attar Ruti (লাল আটার রুটি)',
    foodNameBn: 'লাল আটার রুটি (মাঝারি)',
    portion: 2,
    unit: 'piece',
    calories: 170,
    protein: 6.2,
    carbs: 35.0,
    fat: 1.2,
    notes: 'Morning roti',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'nut_y2',
    userId: 'demo_user',
    date: yesterday,
    mealType: 'breakfast',
    foodName: 'Egg Poach / Half-Fry Low Oil (ডিম পোচ - অল্প তেল)',
    foodNameBn: 'ডিম পোচ (অল্প তেল)',
    portion: 1,
    unit: 'piece',
    calories: 95,
    protein: 6.4,
    carbs: 0.5,
    fat: 7.2,
    notes: 'Low oil poach',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'nut_y3',
    userId: 'demo_user',
    date: yesterday,
    mealType: 'dinner',
    foodName: 'Chicken Breast Curry / Grilled (মুরগির বুকের মাংসের ঝোল/গ্রিল)',
    foodNameBn: 'মুরগির বুকের মাংসের ঝোল বা গ্রিল',
    portion: 1,
    unit: 'cup',
    calories: 185,
    protein: 28.0,
    carbs: 3.0,
    fat: 6.2,
    notes: 'High protein dinner',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const INITIAL_EXERCISE: ExerciseLog[] = [
  {
    id: 'ex_log_1',
    userId: 'demo_user',
    date: today,
    exerciseType: 'brisk_walking',
    name: 'Morning Brisk Walk',
    sets: 1,
    reps: 0,
    durationMinutes: 25,
    rpe: 5,
    caloriesBurned: 130,
    notes: 'Paced walk around neighborhood before desk work',
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_ACTIVITY: ActivityLog[] = [
  {
    id: 'act_today',
    userId: 'demo_user',
    date: today,
    steps: 4250,
    walkingDurationMinutes: 25,
    distanceKm: 2.8,
    notes: 'Morning walk + short desk breaks',
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_HABITS: HabitLog[] = [
  {
    id: `habit_${today}`,
    userId: 'demo_user',
    date: today,
    waterGlasses: 6,
    sittingBreaks: 3,
    walkingDone: true,
    exerciseDone: false,
    mealLogged: true,
    vegetableMet: true,
    sleepRoutineMet: true,
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_SLEEP: SleepLog[] = [
  {
    id: 'sleep_last_night',
    userId: 'demo_user',
    date: today,
    bedtime: '23:15',
    wakeTime: '06:45',
    durationMinutes: 450, // 7.5 hrs
    quality: 4,
    notes: 'Good restorative sleep, limited screen time before bed.',
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_HEALTH_RECORDS: HealthRecord[] = [
  {
    id: 'hr_bp_1',
    userId: 'demo_user',
    date: today,
    type: 'bp',
    systolic: 122,
    diastolic: 79,
    pulse: 72,
    reportNote: 'Resting morning blood pressure check at home. Normal range.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'hr_glucose_1',
    userId: 'demo_user',
    date: yesterday,
    type: 'glucose',
    glucoseFasting: 94,
    glucosePostMeal: 128,
    hba1c: 5.4,
    reportNote: 'Annual executive physical lab check. Fasting glucose and HbA1c normal.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'hr_lipid_1',
    userId: 'demo_user',
    date: yesterday,
    type: 'lipid',
    totalCholesterol: 185,
    ldl: 112,
    hdl: 46,
    triglycerides: 140,
    reportNote: 'Triglycerides slightly elevated due to sedentary work. Walking and waist reduction recommended.',
    createdAt: new Date().toISOString(),
  },
];

interface FitnessDataContextType {
  nutritionLogs: NutritionLog[];
  exerciseLogs: ExerciseLog[];
  activityLogs: ActivityLog[];
  bodyMeasurements: BodyMeasurement[];
  habitLogs: HabitLog[];
  sleepLogs: SleepLog[];
  healthRecords: HealthRecord[];
  aiCoachNotes: AICoachNote[];
  favoriteFoodIds: string[];
  customFoods: FoodItem[];
  loading: boolean;

  // Mutations
  addNutrition: (item: Omit<NutritionLog, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateNutrition: (item: NutritionLog) => Promise<void>;
  deleteNutrition: (id: string) => Promise<void>;
  copyYesterdayMeals: (targetMeal?: MealType, targetDate?: string) => Promise<number>;

  toggleFavoriteFood: (foodId: string) => Promise<void>;
  addCustomFood: (item: Omit<FoodItem, 'id' | 'userId' | 'createdAt'> & { id?: string }) => Promise<FoodItem>;
  deleteCustomFood: (id: string) => Promise<void>;

  addExercise: (item: Omit<ExerciseLog, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateExercise: (item: ExerciseLog) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;

  updateTodayActivity: (steps: number, walkMinutes: number, distanceKm: number, targetDate?: string) => Promise<void>;

  addMeasurement: (item: Omit<BodyMeasurement, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateMeasurement: (item: BodyMeasurement) => Promise<void>;
  deleteMeasurement: (id: string) => Promise<void>;

  incrementWater: (targetDate?: string | unknown) => Promise<void>;
  decrementWater: (targetDate?: string | unknown) => Promise<void>;
  incrementSittingBreak: (targetDate?: string | unknown) => Promise<void>;
  decrementSittingBreak: (targetDate?: string | unknown) => Promise<void>;
  toggleHabitCheck: (
    habitKey: keyof Omit<HabitLog, 'id' | 'userId' | 'date' | 'waterGlasses' | 'sittingBreaks' | 'updatedAt'>,
    targetDate?: string
  ) => Promise<void>;

  addSleep: (item: Omit<SleepLog, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateSleep: (item: SleepLog) => Promise<void>;
  deleteSleep: (id: string) => Promise<void>;

  addHealthRecord: (item: Omit<HealthRecord, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateHealthRecord: (item: HealthRecord) => Promise<void>;
  deleteHealthRecord: (id: string) => Promise<void>;

  saveAICoachNote: (note: Omit<AICoachNote, 'id' | 'userId' | 'createdAt'>) => Promise<void>;

  exportAllDataJson: () => void;
  exportAllDataCsv: (category?: CsvExportCategory) => void;
  resetAllData: () => Promise<void>;
}

const FitnessDataContext = createContext<FitnessDataContextType | undefined>(undefined);

export const FitnessDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);

  // States
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [aiCoachNotes, setAiCoachNotes] = useState<AICoachNote[]>([]);
  const [favoriteFoodIds, setFavoriteFoodIds] = useState<string[]>(() => loadLocalFavorites());
  const [customFoods, setCustomFoods] = useState<FoodItem[]>(() => loadLocalCustomFoods());

  // Refs to prevent duplicate concurrent migrations in strict mode
  const migratingFavsRef = useRef<string | null>(null);
  const migratingCustomRef = useRef<string | null>(null);

  // Helper to remove undefined fields before writing to Firestore
  const stripUndefined = <T extends Record<string, any>>(obj: T): T => {
    const clean: Record<string, any> = {};
    Object.keys(obj).forEach((key) => {
      if (obj[key] !== undefined) {
        clean[key] = obj[key];
      }
    });
    return clean as T;
  };

  // Load either from Firestore (if user signed in) or from localStorage/initial baseline
  useEffect(() => {
    if (user) {
      setLoading(true);
      const uid = user.uid;

      // Subcollection listeners with error handling and localStorage migration
      const unsubs = [
        onSnapshot(
          collection(db, `users/${uid}/nutrition_logs`),
          (snap) => {
            const items = snap.docs.map((d) => d.data() as NutritionLog);
            setNutritionLogs(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/nutrition_logs`)
        ),
        onSnapshot(
          collection(db, `users/${uid}/exercise_logs`),
          (snap) => {
            const items = snap.docs.map((d) => d.data() as ExerciseLog);
            setExerciseLogs(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/exercise_logs`)
        ),
        onSnapshot(
          collection(db, `users/${uid}/activity_logs`),
          (snap) => {
            const items = snap.docs.map((d) => d.data() as ActivityLog);
            setActivityLogs(
              items.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''))
            );
          },
          (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/activity_logs`)
        ),
        onSnapshot(
          collection(db, `users/${uid}/body_measurements`),
          (snap) => {
            const items = snap.docs.map((d) => d.data() as BodyMeasurement);
            setBodyMeasurements(
              items.sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || '').localeCompare(b.createdAt || ''))
            );
          },
          (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/body_measurements`)
        ),
        onSnapshot(
          collection(db, `users/${uid}/habit_logs`),
          (snap) => {
            const items = snap.docs.map((d) => d.data() as HabitLog);
            setHabitLogs(items);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/habit_logs`)
        ),
        onSnapshot(
          collection(db, `users/${uid}/sleep_logs`),
          (snap) => {
            const items = snap.docs.map((d) => d.data() as SleepLog);
            setSleepLogs(
              items.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''))
            );
          },
          (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/sleep_logs`)
        ),
        onSnapshot(
          collection(db, `users/${uid}/health_records`),
          (snap) => {
            const items = snap.docs.map((d) => d.data() as HealthRecord);
            setHealthRecords(
              items.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''))
            );
          },
          (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/health_records`)
        ),
        onSnapshot(
          collection(db, `users/${uid}/ai_coach_notes`),
          (snap) => {
            const items = snap.docs.map((d) => d.data() as AICoachNote);
            setAiCoachNotes(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/ai_coach_notes`)
        ),
        // Real-time listener & one-time localStorage migration for Favorite Foods
        onSnapshot(
          collection(db, `users/${uid}/favorite_foods`),
          async (snap) => {
            const remoteRecords = snap.docs.map((d) => d.data() as FavoriteFoodRecord);
            const remoteIds = Array.from(
              new Set(remoteRecords.map((r) => r.foodId).filter(Boolean))
            );

            const migrationKey = `myfit_migrated_favorites_${uid}`;
            const alreadyMigrated = localStorage.getItem(migrationKey) === 'true';

            if (!alreadyMigrated && migratingFavsRef.current !== uid) {
              migratingFavsRef.current = uid;
              const localIds = loadLocalFavorites();
              const mergedIds = Array.from(new Set([...remoteIds, ...localIds]));

              // Write any local favorite IDs missing in Firestore (using deterministic doc IDs to prevent duplicates)
              const missingInRemote = localIds.filter((id) => !remoteIds.includes(id));
              try {
                for (const foodId of missingInRemote) {
                  const docId = sanitizeDocId(foodId);
                  const favDoc: FavoriteFoodRecord = {
                    id: docId,
                    userId: uid,
                    foodId,
                    createdAt: new Date().toISOString(),
                  };
                  await setDoc(doc(db, `users/${uid}/favorite_foods`, docId), favDoc);
                }
                localStorage.setItem(migrationKey, 'true');
              } catch (err) {
                console.warn('Favorite foods migration deferred (offline or network issue):', err);
              }

              setFavoriteFoodIds(mergedIds);
              localStorage.setItem('myfit_favorites', JSON.stringify(mergedIds));
            } else {
              setFavoriteFoodIds(remoteIds);
              localStorage.setItem('myfit_favorites', JSON.stringify(remoteIds));
            }
          },
          (err) => {
            console.warn('Fallback to localStorage for favorite_foods:', err);
            setFavoriteFoodIds(loadLocalFavorites());
          }
        ),
        // Real-time listener & one-time localStorage migration for Custom Food Templates
        onSnapshot(
          collection(db, `users/${uid}/custom_foods`),
          async (snap) => {
            const remoteFoods = snap.docs.map((d) => d.data() as FoodItem);

            // Deduplicate remote foods by id and normalized name
            const seenIds = new Set<string>();
            const dedupedRemote: FoodItem[] = [];
            for (const item of remoteFoods) {
              if (!seenIds.has(item.id)) {
                seenIds.add(item.id);
                dedupedRemote.push({ ...item, isCustom: true });
              }
            }

            const migrationKey = `myfit_migrated_custom_foods_${uid}`;
            const alreadyMigrated = localStorage.getItem(migrationKey) === 'true';

            if (!alreadyMigrated && migratingCustomRef.current !== uid) {
              migratingCustomRef.current = uid;
              const localCustoms = loadLocalCustomFoods();
              const existingNames = new Set(
                dedupedRemote.map((f) => f.name.trim().toLowerCase())
              );

              const toMigrate = localCustoms.filter(
                (lf) =>
                  !seenIds.has(sanitizeDocId(lf.id)) &&
                  !existingNames.has(lf.name.trim().toLowerCase())
              );

              try {
                for (const lf of toMigrate) {
                  const safeId = sanitizeDocId(lf.id);
                  const cleanFood: FoodItem = stripUndefined({
                    ...lf,
                    id: safeId,
                    userId: uid,
                    isCustom: true,
                    createdAt: lf.createdAt || new Date().toISOString(),
                  });
                  await setDoc(doc(db, `users/${uid}/custom_foods`, safeId), cleanFood);
                  dedupedRemote.push(cleanFood);
                  seenIds.add(safeId);
                  existingNames.add(cleanFood.name.trim().toLowerCase());
                }
                localStorage.setItem(migrationKey, 'true');
              } catch (err) {
                console.warn('Custom foods migration deferred (offline or network issue):', err);
              }
            }

            dedupedRemote.sort((a, b) =>
              (b.createdAt || '').localeCompare(a.createdAt || '')
            );
            setCustomFoods(dedupedRemote);
            localStorage.setItem('myfit_custom_foods', JSON.stringify(dedupedRemote));
          },
          (err) => {
            console.warn('Fallback to localStorage for custom_foods:', err);
            setCustomFoods(loadLocalCustomFoods());
          }
        ),
      ];

      setLoading(false);
      return () => {
        unsubs.forEach((unsub) => unsub());
      };
    } else {
      // Demo / Local storage mode
      const savedNut = localStorage.getItem('myfit_demo_nutrition');
      const savedEx = localStorage.getItem('myfit_demo_exercise');
      const savedAct = localStorage.getItem('myfit_demo_activity');
      const savedMeas = localStorage.getItem('myfit_demo_measurements');
      const savedHab = localStorage.getItem('myfit_demo_habits');
      const savedSleep = localStorage.getItem('myfit_demo_sleep');
      const savedHealth = localStorage.getItem('myfit_demo_health');
      const savedAi = localStorage.getItem('myfit_demo_ai');

      setNutritionLogs(savedNut ? JSON.parse(savedNut) : INITIAL_NUTRITION);
      setExerciseLogs(savedEx ? JSON.parse(savedEx) : INITIAL_EXERCISE);
      setActivityLogs(savedAct ? JSON.parse(savedAct) : INITIAL_ACTIVITY);
      setBodyMeasurements(savedMeas ? JSON.parse(savedMeas) : INITIAL_MEASUREMENTS);
      setHabitLogs(savedHab ? JSON.parse(savedHab) : INITIAL_HABITS);
      setSleepLogs(savedSleep ? JSON.parse(savedSleep) : INITIAL_SLEEP);
      setHealthRecords(savedHealth ? JSON.parse(savedHealth) : INITIAL_HEALTH_RECORDS);
      setAiCoachNotes(savedAi ? JSON.parse(savedAi) : []);
      setFavoriteFoodIds(loadLocalFavorites());
      setCustomFoods(loadLocalCustomFoods());
      setLoading(false);
    }
  }, [user]);

  // Sync to localStorage for demo mode
  useEffect(() => {
    if (!user) {
      localStorage.setItem('myfit_demo_nutrition', JSON.stringify(nutritionLogs));
      localStorage.setItem('myfit_demo_exercise', JSON.stringify(exerciseLogs));
      localStorage.setItem('myfit_demo_activity', JSON.stringify(activityLogs));
      localStorage.setItem('myfit_demo_measurements', JSON.stringify(bodyMeasurements));
      localStorage.setItem('myfit_demo_habits', JSON.stringify(habitLogs));
      localStorage.setItem('myfit_demo_sleep', JSON.stringify(sleepLogs));
      localStorage.setItem('myfit_demo_health', JSON.stringify(healthRecords));
      localStorage.setItem('myfit_demo_ai', JSON.stringify(aiCoachNotes));
      localStorage.setItem('myfit_favorites', JSON.stringify(favoriteFoodIds));
      localStorage.setItem('myfit_custom_foods', JSON.stringify(customFoods));
    }
  }, [
    user,
    nutritionLogs,
    exerciseLogs,
    activityLogs,
    bodyMeasurements,
    habitLogs,
    sleepLogs,
    healthRecords,
    aiCoachNotes,
    favoriteFoodIds,
    customFoods,
  ]);

  // Favorite & Custom Food Mutations (Firestore + localStorage fallback)
  const toggleFavoriteFood = async (foodId: string) => {
    if (!foodId) return;
    const isCurrentlyFav = favoriteFoodIds.includes(foodId);
    const nextFavs = isCurrentlyFav
      ? favoriteFoodIds.filter((id) => id !== foodId)
      : Array.from(new Set([...favoriteFoodIds, foodId]));

    // Optimistic update + localStorage cache
    setFavoriteFoodIds(nextFavs);
    localStorage.setItem('myfit_favorites', JSON.stringify(nextFavs));

    if (user) {
      const docId = sanitizeDocId(foodId);
      const docRef = doc(db, `users/${user.uid}/favorite_foods`, docId);
      try {
        if (isCurrentlyFav) {
          await deleteDoc(docRef);
        } else {
          const favRecord: FavoriteFoodRecord = {
            id: docId,
            userId: user.uid,
            foodId,
            createdAt: new Date().toISOString(),
          };
          await setDoc(docRef, favRecord);
        }
      } catch (err) {
        handleFirestoreError(
          err,
          isCurrentlyFav ? OperationType.DELETE : OperationType.CREATE,
          `users/${user.uid}/favorite_foods/${docId}`
        );
      }
    }
  };

  const addCustomFood = async (
    item: Omit<FoodItem, 'id' | 'userId' | 'createdAt'> & { id?: string }
  ): Promise<FoodItem> => {
    const normalizedName = item.name.trim().toLowerCase();
    const normalizedNameBn = (item.nameBn || item.name).trim().toLowerCase();

    // Prevent duplicate custom food entries: if a custom food with the same name already exists, reuse its ID
    const existingDuplicate = customFoods.find(
      (f) =>
        (item.id && f.id === sanitizeDocId(item.id)) ||
        f.name.trim().toLowerCase() === normalizedName ||
        f.nameBn.trim().toLowerCase() === normalizedNameBn
    );

    const docId = existingDuplicate
      ? existingDuplicate.id
      : sanitizeDocId(item.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);

    const userId = user ? user.uid : 'demo_user';
    const createdAt = existingDuplicate?.createdAt || new Date().toISOString();

    const newCustomFood: FoodItem = stripUndefined({
      ...item,
      id: docId,
      userId,
      name: item.name.trim(),
      nameBn: (item.nameBn || item.name).trim(),
      defaultPortion: Math.max(0.1, Number(item.defaultPortion) || 1),
      gramsPerUnit: Math.max(0, Number(item.gramsPerUnit) || 100),
      caloriesPer100gOrUnit: Math.max(0, Math.min(5000, Number(item.caloriesPer100gOrUnit) || 0)),
      proteinPer100gOrUnit: Math.max(0, Math.min(500, Number(item.proteinPer100gOrUnit) || 0)),
      carbsPer100gOrUnit: Math.max(0, Math.min(1000, Number(item.carbsPer100gOrUnit) || 0)),
      fatPer100gOrUnit: Math.max(0, Math.min(500, Number(item.fatPer100gOrUnit) || 0)),
      isCustom: true,
      createdAt,
    });

    // Update local state & localStorage fallback immediately
    setCustomFoods((prev) => {
      const filtered = prev.filter((f) => f.id !== docId);
      const updated = [newCustomFood, ...filtered];
      localStorage.setItem('myfit_custom_foods', JSON.stringify(updated));
      return updated;
    });

    if (user) {
      const docRef = doc(db, `users/${user.uid}/custom_foods`, docId);
      try {
        await setDoc(docRef, newCustomFood);
      } catch (err) {
        handleFirestoreError(
          err,
          existingDuplicate ? OperationType.UPDATE : OperationType.CREATE,
          `users/${user.uid}/custom_foods/${docId}`
        );
      }
    }

    return newCustomFood;
  };

  const deleteCustomFood = async (id: string) => {
    const safeId = sanitizeDocId(id);
    setCustomFoods((prev) => {
      const updated = prev.filter((f) => f.id !== id && f.id !== safeId);
      localStorage.setItem('myfit_custom_foods', JSON.stringify(updated));
      return updated;
    });

    if (user) {
      const docRef = doc(db, `users/${user.uid}/custom_foods`, safeId);
      try {
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/custom_foods/${safeId}`);
      }
    }
  };

  // Nutrition Mutations
  const addNutrition = async (item: Omit<NutritionLog, 'id' | 'userId' | 'createdAt'>) => {
    const id = `nut_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userId = user ? user.uid : 'demo_user';
    const newLog: NutritionLog = stripUndefined({
      ...item,
      id,
      userId,
      createdAt: new Date().toISOString(),
    });

    if (user) {
      const docRef = doc(db, `users/${user.uid}/nutrition_logs`, id);
      try {
        await setDoc(docRef, newLog);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/nutrition_logs/${id}`);
      }
    } else {
      setNutritionLogs((prev) => [newLog, ...prev]);
    }
  };

  const updateNutrition = async (item: NutritionLog) => {
    const cleanItem = stripUndefined(item);
    if (user) {
      const docRef = doc(db, `users/${user.uid}/nutrition_logs`, cleanItem.id);
      try {
        await setDoc(docRef, cleanItem, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/nutrition_logs/${cleanItem.id}`);
      }
    } else {
      setNutritionLogs((prev) => prev.map((n) => (n.id === cleanItem.id ? cleanItem : n)));
    }
  };

  const deleteNutrition = async (id: string) => {
    if (user) {
      const docRef = doc(db, `users/${user.uid}/nutrition_logs`, id);
      try {
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/nutrition_logs/${id}`);
      }
    } else {
      setNutritionLogs((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const copyYesterdayMeals = async (targetMeal?: MealType, targetDate?: string): Promise<number> => {
    const destDate = targetDate || getTodayDateStr();
    const d = new Date(`${destDate}T12:00:00`);
    d.setDate(d.getDate() - 1);
    const prevDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const sourceItems = nutritionLogs.filter(
      (i) => i.date === prevDate && (targetMeal ? i.mealType === targetMeal : true)
    );
    if (sourceItems.length === 0) return 0;

    for (const item of sourceItems) {
      await addNutrition({
        date: destDate,
        mealType: item.mealType,
        foodName: item.foodName,
        foodNameBn: item.foodNameBn,
        portion: item.portion,
        unit: item.unit,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        notes: item.notes || `Copied from ${prevDate}`,
      });
    }
    return sourceItems.length;
  };

  const addExercise = async (item: Omit<ExerciseLog, 'id' | 'userId' | 'createdAt'>) => {
    const id = `ex_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userId = user ? user.uid : 'demo_user';
    const newLog: ExerciseLog = stripUndefined({
      ...item,
      id,
      userId,
      createdAt: new Date().toISOString(),
    });

    if (user) {
      const docRef = doc(db, `users/${user.uid}/exercise_logs`, id);
      try {
        await setDoc(docRef, newLog);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/exercise_logs/${id}`);
      }
    } else {
      setExerciseLogs((prev) => [newLog, ...prev]);
    }
  };

  const updateExercise = async (item: ExerciseLog) => {
    const cleanItem: ExerciseLog = stripUndefined({
      ...item,
      userId: user ? user.uid : item.userId || 'demo_user',
    });
    if (user) {
      const docRef = doc(db, `users/${user.uid}/exercise_logs`, cleanItem.id);
      try {
        await setDoc(docRef, cleanItem);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/exercise_logs/${cleanItem.id}`);
      }
    } else {
      setExerciseLogs((prev) => prev.map((e) => (e.id === cleanItem.id ? cleanItem : e)));
    }
  };

  const deleteExercise = async (id: string) => {
    if (user) {
      const docRef = doc(db, `users/${user.uid}/exercise_logs`, id);
      try {
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/exercise_logs/${id}`);
      }
    } else {
      setExerciseLogs((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const updateTodayActivity = async (
    steps: number,
    walkMinutes: number,
    distanceKm: number,
    targetDate?: string
  ) => {
    const tDate =
      typeof targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)
        ? targetDate
        : getTodayDateStr();
    const existing = activityLogs.find((a) => a.date === tDate);
    const id = existing ? existing.id : `act_${tDate}`;
    const userId = user ? user.uid : existing?.userId || 'demo_user';
    const actData: ActivityLog = stripUndefined({
      id,
      userId,
      date: tDate,
      steps,
      walkingDurationMinutes: walkMinutes,
      distanceKm,
      notes: 'Updated steps and activity log',
      createdAt: existing?.createdAt || new Date().toISOString(),
    });

    if (user) {
      const docRef = doc(db, `users/${user.uid}/activity_logs`, id);
      try {
        await setDoc(docRef, actData);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/activity_logs/${id}`);
      }
    } else {
      setActivityLogs((prev) => {
        const filtered = prev.filter((a) => a.date !== tDate && a.id !== id);
        return [...filtered, actData].sort((a, b) => b.date.localeCompare(a.date));
      });
    }
  };

  const addMeasurement = async (item: Omit<BodyMeasurement, 'id' | 'userId' | 'createdAt'>) => {
    const id = `meas_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userId = user ? user.uid : 'demo_user';
    const newLog: BodyMeasurement = stripUndefined({
      ...item,
      id,
      userId,
      createdAt: new Date().toISOString(),
    });

    if (user) {
      const docRef = doc(db, `users/${user.uid}/body_measurements`, id);
      try {
        await setDoc(docRef, newLog);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/body_measurements/${id}`);
      }
    } else {
      setBodyMeasurements((prev) =>
        [...prev, newLog].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || '').localeCompare(b.createdAt || ''))
      );
    }
  };

  const updateMeasurement = async (item: BodyMeasurement) => {
    const cleanItem: BodyMeasurement = stripUndefined({
      ...item,
      userId: user ? user.uid : item.userId || 'demo_user',
    });

    if (user) {
      const docRef = doc(db, `users/${user.uid}/body_measurements`, cleanItem.id);
      try {
        await setDoc(docRef, cleanItem);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/body_measurements/${cleanItem.id}`);
      }
    } else {
      setBodyMeasurements((prev) =>
        prev
          .map((m) => (m.id === cleanItem.id ? cleanItem : m))
          .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || '').localeCompare(b.createdAt || ''))
      );
    }
  };

  const deleteMeasurement = async (id: string) => {
    if (user) {
      const docRef = doc(db, `users/${user.uid}/body_measurements`, id);
      try {
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/body_measurements/${id}`);
      }
    } else {
      setBodyMeasurements((prev) => prev.filter((m) => m.id !== id));
    }
  };

  // Habits mutations (supports optional targetDate, defaulting to today)
  const getOrCreateHabitForDate = (targetDate?: string | unknown): HabitLog => {
    const tDate =
      typeof targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)
        ? targetDate
        : getTodayDateStr();
    const existing = habitLogs.find((h) => h.date === tDate);
    if (existing) {
      return {
        ...existing,
        userId: user ? user.uid : existing.userId || 'demo_user',
      };
    }
    return {
      id: `habit_${tDate}`,
      userId: user ? user.uid : 'demo_user',
      date: tDate,
      waterGlasses: 0,
      sittingBreaks: 0,
      walkingDone: false,
      exerciseDone: false,
      mealLogged: false,
      vegetableMet: false,
      sleepRoutineMet: false,
      updatedAt: new Date().toISOString(),
    };
  };

  const saveHabit = async (habit: HabitLog) => {
    const cleanHabit = stripUndefined({
      ...habit,
      userId: user ? user.uid : habit.userId || 'demo_user',
    });
    if (user) {
      const docRef = doc(db, `users/${user.uid}/habit_logs`, cleanHabit.id);
      try {
        await setDoc(docRef, cleanHabit);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/habit_logs/${cleanHabit.id}`);
      }
    } else {
      setHabitLogs((prev) => {
        const filtered = prev.filter((h) => h.id !== cleanHabit.id && h.date !== cleanHabit.date);
        return [...filtered, cleanHabit];
      });
    }
  };

  const incrementWater = async (targetDate?: string | unknown) => {
    const habit = getOrCreateHabitForDate(targetDate);
    const updated = {
      ...habit,
      waterGlasses: Math.min(30, habit.waterGlasses + 1),
      updatedAt: new Date().toISOString(),
    };
    await saveHabit(updated);
  };

  const decrementWater = async (targetDate?: string | unknown) => {
    const habit = getOrCreateHabitForDate(targetDate);
    const updated = {
      ...habit,
      waterGlasses: Math.max(0, habit.waterGlasses - 1),
      updatedAt: new Date().toISOString(),
    };
    await saveHabit(updated);
  };

  const incrementSittingBreak = async (targetDate?: string | unknown) => {
    const habit = getOrCreateHabitForDate(targetDate);
    const updated = {
      ...habit,
      sittingBreaks: Math.min(50, habit.sittingBreaks + 1),
      updatedAt: new Date().toISOString(),
    };
    await saveHabit(updated);
  };

  const decrementSittingBreak = async (targetDate?: string | unknown) => {
    const habit = getOrCreateHabitForDate(targetDate);
    const updated = {
      ...habit,
      sittingBreaks: Math.max(0, habit.sittingBreaks - 1),
      updatedAt: new Date().toISOString(),
    };
    await saveHabit(updated);
  };

  const toggleHabitCheck = async (
    habitKey: keyof Omit<HabitLog, 'id' | 'userId' | 'date' | 'waterGlasses' | 'sittingBreaks' | 'updatedAt'>,
    targetDate?: string
  ) => {
    const habit = getOrCreateHabitForDate(targetDate);
    const updated = {
      ...habit,
      [habitKey]: !habit[habitKey],
      updatedAt: new Date().toISOString(),
    };
    await saveHabit(updated);
  };

  const addSleep = async (item: Omit<SleepLog, 'id' | 'userId' | 'createdAt'>) => {
    const id = `sleep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userId = user ? user.uid : 'demo_user';
    const newLog: SleepLog = stripUndefined({
      ...item,
      id,
      userId,
      createdAt: new Date().toISOString(),
    });

    if (user) {
      const docRef = doc(db, `users/${user.uid}/sleep_logs`, id);
      try {
        await setDoc(docRef, newLog);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/sleep_logs/${id}`);
      }
    } else {
      setSleepLogs((prev) => [newLog, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    }
  };

  const updateSleep = async (item: SleepLog) => {
    const cleanItem: SleepLog = stripUndefined({
      ...item,
      userId: user ? user.uid : item.userId || 'demo_user',
    });

    if (user) {
      const docRef = doc(db, `users/${user.uid}/sleep_logs`, cleanItem.id);
      try {
        await setDoc(docRef, cleanItem);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/sleep_logs/${cleanItem.id}`);
      }
    } else {
      setSleepLogs((prev) =>
        prev.map((s) => (s.id === cleanItem.id ? cleanItem : s)).sort((a, b) => b.date.localeCompare(a.date))
      );
    }
  };

  const deleteSleep = async (id: string) => {
    if (user) {
      const docRef = doc(db, `users/${user.uid}/sleep_logs`, id);
      try {
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/sleep_logs/${id}`);
      }
    } else {
      setSleepLogs((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const addHealthRecord = async (item: Omit<HealthRecord, 'id' | 'userId' | 'createdAt'>) => {
    const id = `hr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userId = user ? user.uid : 'demo_user';
    const newLog: HealthRecord = stripUndefined({
      ...item,
      id,
      userId,
      createdAt: new Date().toISOString(),
    });

    if (user) {
      const docRef = doc(db, `users/${user.uid}/health_records`, id);
      try {
        await setDoc(docRef, newLog);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/health_records/${id}`);
      }
    } else {
      setHealthRecords((prev) => [newLog, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    }
  };

  const updateHealthRecord = async (item: HealthRecord) => {
    const cleanItem: HealthRecord = stripUndefined({
      ...item,
      userId: user ? user.uid : item.userId || 'demo_user',
    });

    if (user) {
      const docRef = doc(db, `users/${user.uid}/health_records`, cleanItem.id);
      try {
        await setDoc(docRef, cleanItem);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/health_records/${cleanItem.id}`);
      }
    } else {
      setHealthRecords((prev) =>
        prev.map((h) => (h.id === cleanItem.id ? cleanItem : h)).sort((a, b) => b.date.localeCompare(a.date))
      );
    }
  };

  const deleteHealthRecord = async (id: string) => {
    if (user) {
      const docRef = doc(db, `users/${user.uid}/health_records`, id);
      try {
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/health_records/${id}`);
      }
    } else {
      setHealthRecords((prev) => prev.filter((h) => h.id !== id));
    }
  };

  const saveAICoachNote = async (note: Omit<AICoachNote, 'id' | 'userId' | 'createdAt'>) => {
    const id = `coach_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userId = user ? user.uid : 'demo_user';
    const newNote: AICoachNote = stripUndefined({
      ...note,
      id,
      userId,
      createdAt: new Date().toISOString(),
    });

    if (user) {
      const docRef = doc(db, `users/${user.uid}/ai_coach_notes`, id);
      try {
        await setDoc(docRef, newNote);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/ai_coach_notes/${id}`);
      }
    } else {
      setAiCoachNotes((prev) => [newNote, ...prev]);
    }
  };

  // Export functions (includes all 11 user data categories, no secrets/API keys)
  const exportAllDataJson = () => {
    const allFoodsCatalog = [...customFoods, ...BENGALI_FOODS];
    const resolvedFavorites = favoriteFoodIds.map((favId) => {
      const found = allFoodsCatalog.find((f) => f.id === favId);
      return found
        ? { id: found.id, name: found.name, nameBn: found.nameBn, category: found.category }
        : { id: favId };
    });

    const { uid: _omitUid, ...safeProfile } = profile;

    const exportData = {
      profile: safeProfile,
      bodyMeasurements,
      nutritionLogs,
      exerciseLogs,
      activityLogs,
      habitLogs,
      sleepLogs,
      healthRecords,
      aiCoachNotes,
      favoriteFoods: resolvedFavorites,
      customFoodTemplates: customFoods,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    triggerBrowserDownload(blob, `myfit_journey_backup_${getTodayDateStr()}.json`);
  };

  const exportAllDataCsv = (category: CsvExportCategory = 'all_zip') => {
    downloadCsvExport(
      {
        profile,
        bodyMeasurements,
        nutritionLogs,
        exerciseLogs,
        activityLogs,
        habitLogs,
        sleepLogs,
        healthRecords,
        aiCoachNotes,
        favoriteFoodIds,
        customFoods,
      },
      getTodayDateStr(),
      category
    );
  };

  const resetAllData = async () => {
    if (user) {
      for (const item of nutritionLogs) await deleteNutrition(item.id);
      for (const item of exerciseLogs) await deleteExercise(item.id);
      for (const item of bodyMeasurements) await deleteMeasurement(item.id);
      for (const item of sleepLogs) await deleteSleep(item.id);
      for (const item of healthRecords) await deleteHealthRecord(item.id);
      for (const item of activityLogs) {
        const docRef = doc(db, `users/${user.uid}/activity_logs`, item.id);
        try {
          await deleteDoc(docRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/activity_logs/${item.id}`);
        }
      }
      for (const item of habitLogs) {
        const docRef = doc(db, `users/${user.uid}/habit_logs`, item.id);
        try {
          await deleteDoc(docRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/habit_logs/${item.id}`);
        }
      }
      for (const item of aiCoachNotes) {
        const docRef = doc(db, `users/${user.uid}/ai_coach_notes`, item.id);
        try {
          await deleteDoc(docRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/ai_coach_notes/${item.id}`);
        }
      }
      for (const favId of favoriteFoodIds) {
        const docId = sanitizeDocId(favId);
        const docRef = doc(db, `users/${user.uid}/favorite_foods`, docId);
        try {
          await deleteDoc(docRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/favorite_foods/${docId}`);
        }
      }
      for (const customFood of customFoods) {
        const docId = sanitizeDocId(customFood.id);
        const docRef = doc(db, `users/${user.uid}/custom_foods`, docId);
        try {
          await deleteDoc(docRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/custom_foods/${docId}`);
        }
      }
      localStorage.removeItem('myfit_favorites');
      localStorage.removeItem('myfit_custom_foods');
      setFavoriteFoodIds([]);
      setCustomFoods([]);
    } else {
      localStorage.removeItem('myfit_demo_nutrition');
      localStorage.removeItem('myfit_demo_exercise');
      localStorage.removeItem('myfit_demo_activity');
      localStorage.removeItem('myfit_demo_measurements');
      localStorage.removeItem('myfit_demo_habits');
      localStorage.removeItem('myfit_demo_sleep');
      localStorage.removeItem('myfit_demo_health');
      localStorage.removeItem('myfit_demo_ai');
      localStorage.removeItem('myfit_favorites');
      localStorage.removeItem('myfit_custom_foods');
      setNutritionLogs(INITIAL_NUTRITION);
      setExerciseLogs(INITIAL_EXERCISE);
      setActivityLogs(INITIAL_ACTIVITY);
      setBodyMeasurements(INITIAL_MEASUREMENTS);
      setHabitLogs(INITIAL_HABITS);
      setSleepLogs(INITIAL_SLEEP);
      setHealthRecords(INITIAL_HEALTH_RECORDS);
      setAiCoachNotes([]);
      setFavoriteFoodIds(DEFAULT_FAVORITE_FOOD_IDS);
      setCustomFoods([]);
    }
  };

  return (
    <FitnessDataContext.Provider
      value={{
        nutritionLogs,
        exerciseLogs,
        activityLogs,
        bodyMeasurements,
        habitLogs,
        sleepLogs,
        healthRecords,
        aiCoachNotes,
        favoriteFoodIds,
        customFoods,
        loading,
        addNutrition,
        updateNutrition,
        deleteNutrition,
        copyYesterdayMeals,
        toggleFavoriteFood,
        addCustomFood,
        deleteCustomFood,
        addExercise,
        updateExercise,
        deleteExercise,
        updateTodayActivity,
        addMeasurement,
        updateMeasurement,
        deleteMeasurement,
        incrementWater,
        decrementWater,
        incrementSittingBreak,
        decrementSittingBreak,
        toggleHabitCheck,
        addSleep,
        updateSleep,
        deleteSleep,
        addHealthRecord,
        updateHealthRecord,
        deleteHealthRecord,
        saveAICoachNote,
        exportAllDataJson,
        exportAllDataCsv,
        resetAllData,
      }}
    >
      {children}
    </FitnessDataContext.Provider>
  );
};

export const useFitnessData = () => {
  const context = useContext(FitnessDataContext);
  if (!context) {
    throw new Error('useFitnessData must be used within a FitnessDataProvider');
  }
  return context;
};
