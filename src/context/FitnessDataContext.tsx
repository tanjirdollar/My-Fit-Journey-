import React, { createContext, useContext, useState, useEffect } from 'react';
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
} from '../types';

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

// Initial baseline mock data matching the 38-yo male user's brief
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
  loading: boolean;
  
  // Mutations
  addNutrition: (item: Omit<NutritionLog, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateNutrition: (item: NutritionLog) => Promise<void>;
  deleteNutrition: (id: string) => Promise<void>;
  copyYesterdayMeals: (targetMeal?: MealType, targetDate?: string) => Promise<number>;
  
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
  exportAllDataCsv: () => void;
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

  // Load either from Firestore (if user signed in) or from localStorage/initial mock
  useEffect(() => {
    if (user) {
      setLoading(true);
      const uid = user.uid;

      // Subcollection listeners with mandatory error handling
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
            setActivityLogs(items.sort((a, b) => b.date.localeCompare(a.date)));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/activity_logs`)
        ),
        onSnapshot(
          collection(db, `users/${uid}/body_measurements`),
          (snap) => {
            const items = snap.docs.map((d) => d.data() as BodyMeasurement);
            setBodyMeasurements(items.sort((a, b) => a.date.localeCompare(b.date)));
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
            setSleepLogs(items.sort((a, b) => b.date.localeCompare(a.date)));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/sleep_logs`)
        ),
        onSnapshot(
          collection(db, `users/${uid}/health_records`),
          (snap) => {
            const items = snap.docs.map((d) => d.data() as HealthRecord);
            setHealthRecords(items.sort((a, b) => b.date.localeCompare(a.date)));
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
  ]);

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

  // Mutations
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
    // Compute previous day relative to destDate
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
      setBodyMeasurements((prev) => [...prev, newLog].sort((a, b) => a.date.localeCompare(b.date)));
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
        prev.map((m) => (m.id === cleanItem.id ? cleanItem : m)).sort((a, b) => a.date.localeCompare(b.date))
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

  // Export functions
  const exportAllDataJson = () => {
    const exportData = {
      profile,
      bodyMeasurements,
      nutritionLogs,
      exerciseLogs,
      activityLogs,
      habitLogs,
      sleepLogs,
      healthRecords,
      aiCoachNotes,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myfit_journey_backup_${getTodayDateStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAllDataCsv = () => {
    // Generate CSV for measurements and nutrition
    let csvContent = 'Type,Date,Metric1,Metric2,Metric3,Notes\n';
    bodyMeasurements.forEach((m) => {
      csvContent += `"Measurement","${m.date}","Weight:${m.weightKg}kg","Waist:${m.waistCm}cm","BMI:${m.bmi}","${(m.notes || '').replace(/"/g, '""')}"\n`;
    });
    nutritionLogs.forEach((n) => {
      csvContent += `"Nutrition","${n.date}","${n.mealType}","${n.foodName}","Cal:${n.calories} P:${n.protein}g","${(n.notes || '').replace(/"/g, '""')}"\n`;
    });
    exerciseLogs.forEach((e) => {
      csvContent += `"Exercise","${e.date}","${e.exerciseType}","${e.name}","Duration:${e.durationMinutes}m RPE:${e.rpe}","${(e.notes || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myfit_journey_export_${getTodayDateStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAllData = async () => {
    if (user) {
      // In Firestore, clear all subcollection logs for this user
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
    } else {
      localStorage.removeItem('myfit_demo_nutrition');
      localStorage.removeItem('myfit_demo_exercise');
      localStorage.removeItem('myfit_demo_activity');
      localStorage.removeItem('myfit_demo_measurements');
      localStorage.removeItem('myfit_demo_habits');
      localStorage.removeItem('myfit_demo_sleep');
      localStorage.removeItem('myfit_demo_health');
      localStorage.removeItem('myfit_demo_ai');
      setNutritionLogs(INITIAL_NUTRITION);
      setExerciseLogs(INITIAL_EXERCISE);
      setActivityLogs(INITIAL_ACTIVITY);
      setBodyMeasurements(INITIAL_MEASUREMENTS);
      setHabitLogs(INITIAL_HABITS);
      setSleepLogs(INITIAL_SLEEP);
      setHealthRecords(INITIAL_HEALTH_RECORDS);
      setAiCoachNotes([]);
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
        loading,
        addNutrition,
        updateNutrition,
        deleteNutrition,
        copyYesterdayMeals,
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
