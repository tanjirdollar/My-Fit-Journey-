import React, { useState, useMemo, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useFitnessData, getTodayDateStr } from '../context/FitnessDataContext';
import {
  BENGALI_FOODS,
  calculateFoodNutrition,
  getUnitGramWeight,
} from '../data/bengaliFoods';
import {
  FoodCategory,
  FoodItem,
  MealType,
  NutritionLog,
  ServingUnit,
} from '../types';
import { AIFoodRecognitionModal } from './AIFoodRecognitionModal';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Copy,
  Star,
  Info,
  Check,
  Pencil,
  RotateCcw,
  Calendar,
  Utensils,
  X,
  Camera,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';

const SERVING_UNITS: {
  value: ServingUnit;
  labelEn: string;
  labelBn: string;
  shortEn: string;
  shortBn: string;
}[] = [
  {
    value: 'cup',
    labelEn: 'Cup / Medium Bowl (150g)',
    labelBn: 'কাপ / মাঝারি বাটি (১৫০ গ্রাম)',
    shortEn: 'cup',
    shortBn: 'কাপ',
  },
  {
    value: 'katori',
    labelEn: 'Small Bowl / Katori (100g)',
    labelBn: 'ছোট বাটি (১০০ গ্রাম)',
    shortEn: 'katori',
    shortBn: 'বাটি',
  },
  {
    value: 'piece',
    labelEn: 'Piece / Slice',
    labelBn: 'টি / টুকরো',
    shortEn: 'piece',
    shortBn: 'টি/টুকরো',
  },
  {
    value: 'grams',
    labelEn: 'Grams (g)',
    labelBn: 'গ্রাম (g)',
    shortEn: 'g',
    shortBn: 'গ্রাম',
  },
  {
    value: 'tbsp',
    labelEn: 'Tablespoon (15g)',
    labelBn: 'টেবিল চামচ (১৫ গ্রাম)',
    shortEn: 'tbsp',
    shortBn: 'চামচ',
  },
  {
    value: 'plate',
    labelEn: 'Full Plate (250g)',
    labelBn: 'প্লেট (২৫০ গ্রাম)',
    shortEn: 'plate',
    shortBn: 'প্লেট',
  },
  {
    value: 'glass',
    labelEn: 'Glass (250ml)',
    labelBn: 'গ্লাস (২৫০ মিলি)',
    shortEn: 'glass',
    shortBn: 'গ্লাস',
  },
];

export const NutritionTracker: React.FC = () => {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const {
    nutritionLogs,
    favoriteFoodIds: favorites,
    customFoods,
    addNutrition,
    updateNutrition,
    deleteNutrition,
    copyYesterdayMeals,
    toggleFavoriteFood,
    addCustomFood,
    deleteCustomFood,
  } = useFitnessData();

  const isBn = language === 'bn';
  const today = getTodayDateStr();

  // Active date selection (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // Search & Category filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');

  // Serving Size & Nutrition Editor Modal State (used for both Add and Edit)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);
  const [foodNameInput, setFoodNameInput] = useState<string>('');
  const [foodNameBnInput, setFoodNameBnInput] = useState<string>('');
  const [portion, setPortion] = useState<number>(1);
  const [unit, setUnit] = useState<ServingUnit>('cup');
  const [customCalories, setCustomCalories] = useState<number>(0);
  const [customProtein, setCustomProtein] = useState<number>(0);
  const [customCarbs, setCustomCarbs] = useState<number>(0);
  const [customFat, setCustomFat] = useState<number>(0);
  const [isManualMacroOverride, setIsManualMacroOverride] = useState<boolean>(false);
  const [notesInput, setNotesInput] = useState<string>('');
  const [saveToCustomDb, setSaveToCustomDb] = useState<boolean>(false);
  const [customCategory, setCustomCategory] = useState<FoodCategory>('staple');

  // Status feedback banner
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // AI Food Recognition Modal & Quick File Triggers
  const [isAiRecognitionOpen, setIsAiRecognitionOpen] = useState<boolean>(false);
  const [quickSelectedFile, setQuickSelectedFile] = useState<File | null>(null);
  const quickCameraInputRef = useRef<HTMLInputElement | null>(null);
  const quickGalleryInputRef = useRef<HTMLInputElement | null>(null);

  const handleQuickFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQuickSelectedFile(file);
      setIsAiRecognitionOpen(true);
    }
    e.target.value = '';
  };

  const showFeedback = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 3000);
  };

  // Combine standard Bangladeshi food database + user's saved custom foods
  const allFoods = useMemo(() => [...customFoods, ...BENGALI_FOODS], [customFoods]);

  // Last 7 days strip for quick date switching
  const recentDates = useMemo(() => {
    const list: { dateStr: string; dayLabel: string; dayNum: string; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
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
        isToday: dateStr === today,
      });
    }
    return list;
  }, [today, isBn]);

  const toggleFavorite = async (foodId: string) => {
    await toggleFavoriteFood(foodId);
  };

  // Search and filter Bangladeshi foods
  const filteredFoods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allFoods.filter((food) => {
      const matchesSearch =
        !q ||
        food.name.toLowerCase().includes(q) ||
        food.nameBn.toLowerCase().includes(q) ||
        (food.searchKeywords &&
          food.searchKeywords.some((kw) => kw.toLowerCase().includes(q)));

      const matchesCategory =
        selectedCategory === 'all'
          ? true
          : selectedCategory === 'favorites'
          ? favorites.includes(food.id)
          : selectedCategory === 'waist_ideal'
          ? food.waistGuidance === 'ideal'
          : food.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [allFoods, searchQuery, selectedCategory, favorites]);

  // Logs for the currently selected date
  const selectedDateLogs = useMemo(
    () => nutritionLogs.filter((n) => n.date === selectedDate),
    [nutritionLogs, selectedDate]
  );

  const getMealLogs = (meal: MealType) =>
    selectedDateLogs.filter((n) => n.mealType === meal);

  const getMealCalories = (meal: MealType) =>
    getMealLogs(meal).reduce((sum, n) => sum + (n.calories || 0), 0);

  const getMealProtein = (meal: MealType) =>
    Number(
      getMealLogs(meal)
        .reduce((sum, n) => sum + (n.protein || 0), 0)
        .toFixed(1)
    );

  // Daily totals
  const totalCalories = selectedDateLogs.reduce((sum, n) => sum + (n.calories || 0), 0);
  const totalProtein = Number(
    selectedDateLogs.reduce((sum, n) => sum + (n.protein || 0), 0).toFixed(1)
  );
  const totalCarbs = Number(
    selectedDateLogs.reduce((sum, n) => sum + (n.carbs || 0), 0).toFixed(1)
  );
  const totalFat = Number(
    selectedDateLogs.reduce((sum, n) => sum + (n.fat || 0), 0).toFixed(1)
  );

  const calorieTarget = profile.dailyCalorieTarget || 1850;
  const proteinTarget = profile.dailyProteinTargetGrams || 75;

  // Macro energy distribution percentages
  const totalMacroCals = totalProtein * 4 + totalCarbs * 4 + totalFat * 9 || 1;
  const proteinCalPct = Math.round(((totalProtein * 4) / totalMacroCals) * 100);
  const carbsCalPct = Math.round(((totalCarbs * 4) / totalMacroCals) * 100);
  const fatCalPct = Math.max(0, 100 - proteinCalPct - carbsCalPct);

  // Open modal to add a food from the database
  const handleSelectFoodFromDb = (food: FoodItem) => {
    setEditingLogId(null);
    setActiveFood(food);
    setFoodNameInput(food.name);
    setFoodNameBnInput(food.nameBn);
    setPortion(food.defaultPortion);
    setUnit(food.defaultUnit);
    setIsManualMacroOverride(false);
    setSaveToCustomDb(false);
    setNotesInput('');

    const calc = calculateFoodNutrition(food, food.defaultPortion, food.defaultUnit);
    setCustomCalories(calc.calories);
    setCustomProtein(calc.protein);
    setCustomCarbs(calc.carbs);
    setCustomFat(calc.fat);
    setIsModalOpen(true);
  };

  // Quick 1-tap log with default serving size
  const handleQuickAddFood = async (e: React.MouseEvent, food: FoodItem) => {
    e.stopPropagation();
    const calc = calculateFoodNutrition(food, food.defaultPortion, food.defaultUnit);
    await addNutrition({
      date: selectedDate,
      mealType: selectedMealType,
      foodName: food.name,
      foodNameBn: food.nameBn,
      portion: food.defaultPortion,
      unit: food.defaultUnit,
      calories: calc.calories,
      protein: calc.protein,
      carbs: calc.carbs,
      fat: calc.fat,
      notes: `${calc.totalGrams}g`,
    });
    showFeedback(
      isBn
        ? `${food.nameBn} (${food.defaultPortion} ${food.defaultUnit}) ${t(selectedMealType)}-এ যোগ হয়েছে`
        : `Added ${food.defaultPortion} ${food.defaultUnit} of ${food.name} to ${t(selectedMealType)}`
    );
  };

  // Open modal to edit an existing logged meal entry
  const handleEditLoggedMeal = (log: NutritionLog) => {
    setEditingLogId(log.id);
    // Try matching back to a database food for unit conversions
    const matchedFood =
      allFoods.find(
        (f) =>
          f.name.toLowerCase() === log.foodName.toLowerCase() ||
          (log.foodNameBn && f.nameBn === log.foodNameBn)
      ) || null;

    setActiveFood(matchedFood);
    setSelectedMealType(log.mealType);
    setFoodNameInput(log.foodName);
    setFoodNameBnInput(log.foodNameBn || log.foodName);
    setPortion(log.portion);
    setUnit((log.unit as ServingUnit) || 'cup');
    setCustomCalories(log.calories);
    setCustomProtein(log.protein);
    setCustomCarbs(log.carbs || 0);
    setCustomFat(log.fat || 0);
    setIsManualMacroOverride(false);
    setSaveToCustomDb(false);
    setNotesInput(log.notes || '');
    setIsModalOpen(true);
  };

  // Open modal to create a brand new custom food / meal
  const handleOpenCustomFoodModal = () => {
    setEditingLogId(null);
    setActiveFood(null);
    setFoodNameInput('');
    setFoodNameBnInput('');
    setPortion(1);
    setUnit('cup');
    setCustomCalories(160);
    setCustomProtein(12);
    setCustomCarbs(18);
    setCustomFat(4);
    setIsManualMacroOverride(true);
    setSaveToCustomDb(true);
    setNotesInput('');
    setIsModalOpen(true);
  };

  // Recalculate macros when portion or unit changes
  const updatePortionAndUnit = (newPortion: number, newUnit: ServingUnit) => {
    const validPortion = Math.max(0.1, Number(newPortion.toFixed(2)));
    setPortion(validPortion);
    setUnit(newUnit);

    if (activeFood && !isManualMacroOverride) {
      const calc = calculateFoodNutrition(activeFood, validPortion, newUnit);
      setCustomCalories(calc.calories);
      setCustomProtein(calc.protein);
      setCustomCarbs(calc.carbs);
      setCustomFat(calc.fat);
    } else if (!activeFood && editingLogId && portion > 0) {
      // Proportional scaling for custom logged items when editing portion
      const prevGrams = portion * getUnitGramWeight(unit, null);
      const nextGrams = validPortion * getUnitGramWeight(newUnit, null);
      const ratio = prevGrams > 0 ? nextGrams / prevGrams : 1;
      setCustomCalories(Math.round(customCalories * ratio));
      setCustomProtein(Number((customProtein * ratio).toFixed(1)));
      setCustomCarbs(Number((customCarbs * ratio).toFixed(1)));
      setCustomFat(Number((customFat * ratio).toFixed(1)));
    }
  };

  const handleResetToCalculatedMacros = () => {
    if (!activeFood) return;
    setIsManualMacroOverride(false);
    const calc = calculateFoodNutrition(activeFood, portion, unit);
    setCustomCalories(calc.calories);
    setCustomProtein(calc.protein);
    setCustomCarbs(calc.carbs);
    setCustomFat(calc.fat);
  };

  // Current estimated gram weight in the modal
  const currentModalGrams = useMemo(() => {
    if (activeFood) {
      return calculateFoodNutrition(activeFood, portion, unit).totalGrams;
    }
    return Math.round(portion * getUnitGramWeight(unit, null));
  }, [activeFood, portion, unit]);

  // Save food log (either create new or update existing)
  const handleSaveFoodModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalNameEn =
      foodNameInput.trim() || (isBn ? 'নিজস্ব খাবার' : 'Custom Healthy Meal');
    const finalNameBn = foodNameBnInput.trim() || finalNameEn;

    // Optionally save to custom food database (synced to Firestore + localStorage fallback)
    if (!activeFood && saveToCustomDb && foodNameInput.trim()) {
      await addCustomFood({
        name: finalNameEn,
        nameBn: finalNameBn,
        category: customCategory,
        searchKeywords: [finalNameEn.toLowerCase(), finalNameBn.toLowerCase()],
        defaultPortion: portion,
        defaultUnit: unit,
        gramsPerUnit: getUnitGramWeight(unit, null),
        caloriesPer100gOrUnit:
          portion > 0 ? Math.round(customCalories / portion) : customCalories,
        proteinPer100gOrUnit:
          portion > 0 ? Number((customProtein / portion).toFixed(1)) : customProtein,
        carbsPer100gOrUnit:
          portion > 0 ? Number((customCarbs / portion).toFixed(1)) : customCarbs,
        fatPer100gOrUnit:
          portion > 0 ? Number((customFat / portion).toFixed(1)) : customFat,
        isPerUnit: unit !== 'grams',
        waistGuidance: 'moderate',
        isCustom: true,
      });
    }

    if (editingLogId) {
      const existingItem = nutritionLogs.find((n) => n.id === editingLogId);
      if (existingItem) {
        await updateNutrition({
          ...existingItem,
          date: selectedDate,
          mealType: selectedMealType,
          foodName: finalNameEn,
          foodNameBn: finalNameBn,
          portion,
          unit,
          calories: customCalories,
          protein: customProtein,
          carbs: customCarbs,
          fat: customFat,
          notes: notesInput,
        });
        showFeedback(
          isBn ? 'খাবারের তথ্য আপডেট করা হয়েছে!' : 'Meal entry updated!'
        );
      }
    } else {
      await addNutrition({
        date: selectedDate,
        mealType: selectedMealType,
        foodName: finalNameEn,
        foodNameBn: finalNameBn,
        portion,
        unit,
        calories: customCalories,
        protein: customProtein,
        carbs: customCarbs,
        fat: customFat,
        notes: notesInput,
      });
      showFeedback(
        isBn ? 'খাবার সফলভাবে যোগ করা হয়েছে!' : 'Meal logged successfully!'
      );
    }

    setIsModalOpen(false);
  };

  const handleCopyPreviousDay = async (meal?: MealType) => {
    const count = await copyYesterdayMeals(meal, selectedDate);
    if (count > 0) {
      showFeedback(
        isBn
          ? `পূর্ববর্তী দিনের ${count}টি খাবার কপি করা হয়েছে!`
          : `Copied ${count} item(s) from previous day!`
      );
    } else {
      showFeedback(
        isBn
          ? 'পূর্ববর্তী দিনে কোনো খাবার লগ পাওয়া যায়নি।'
          : 'No meals found on previous day to copy.'
      );
    }
  };

  const meals: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner'];

  const portionPresets =
    unit === 'grams' ? [50, 100, 150, 200, 250, 300] : [0.5, 1, 1.5, 2, 3, 4];

  const stepIncrement = unit === 'grams' ? 25 : 0.5;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Date Selector Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight font-display">
              {isBn
                ? 'পুষ্টি ট্র্যাকার ও বাংলাদেশী খাদ্য ডাটাবেস'
                : 'Nutrition Tracker & Bangladeshi Food Database'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              {isBn
                ? 'ভাত, মাছ, ডাল, শাক ও দেশি খাবারের সঠিক পরিমাণ (গ্রাম, বাটি, কাপ বা টুকরো) অনুযায়ী ক্যালোরি ও প্রোটিন হিসাব করুন।'
                : 'Track authentic Bangladeshi meals with editable serving sizes in grams, cups, katoris, or pieces.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Hidden Quick Camera & Gallery Inputs */}
            <input
              ref={quickCameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleQuickFilePicked}
              className="hidden"
            />
            <input
              ref={quickGalleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleQuickFilePicked}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => {
                setQuickSelectedFile(null);
                setIsAiRecognitionOpen(true);
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>
                {isBn
                  ? 'এআই ফুড রিকগনিশন (AI Photo)'
                  : 'AI Food Recognition'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyPreviousDay()}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Copy className="w-3.5 h-3.5 text-neutral-500" />
              <span>{t('copyYesterday')}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCustomFoodModal}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t('customFood')}</span>
            </button>
          </div>
        </div>

        {/* 7-Day Date Selector Scroller + Date Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-neutral-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {recentDates.map((d) => {
              const isSelected = selectedDate === d.dateStr;
              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(d.dateStr)}
                  className={`min-h-[44px] min-w-[54px] px-3 py-1.5 rounded-xl flex flex-col items-center justify-center transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-600'
                  }`}
                >
                  <span className="text-[10px] opacity-80">{d.dayLabel}</span>
                  <span className="text-xs font-bold tabular-nums">
                    {d.isToday ? (isBn ? 'আজ' : 'Today') : d.dayNum}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value || today)}
              className="min-h-[40px] px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-700 tabular-nums focus:outline-hidden focus:border-emerald-600"
            />
          </div>
        </div>

        {feedbackBanner && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{feedbackBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-emerald-700 font-bold px-2"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Main 2-Column Split on Desktop (1440px Presence) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): Daily Macro Summary & Logged Meals by Slot */}
        <div className="lg:col-span-7 space-y-5">
          {/* Daily Calorie & Macronutrient Budget Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900">
                {isBn ? 'দৈনিক পুষ্টি ও ক্যালোরি বাজেট' : 'Daily Nutrition & Macro Budget'}
              </h2>
              <span className="text-xs text-neutral-500 tabular-nums">{selectedDate}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              {/* Calories */}
              <div>
                <div className="text-xs text-neutral-500">{t('calories')}</div>
                <div className="text-2xl font-bold text-neutral-900 tabular-nums mt-0.5">
                  {totalCalories}
                  <span className="text-xs font-normal text-neutral-400">
                    {' '}
                    / {calorieTarget}
                  </span>
                </div>
                <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      totalCalories > calorieTarget ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                    style={{
                      width: `${Math.min(100, (totalCalories / calorieTarget) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] text-neutral-500 mt-1 tabular-nums">
                  {totalCalories <= calorieTarget
                    ? `${calorieTarget - totalCalories} kcal ${isBn ? 'বাকি' : 'remaining'}`
                    : `+${totalCalories - calorieTarget} kcal ${isBn ? 'বেশি' : 'over'}`}
                </div>
              </div>

              {/* Protein */}
              <div>
                <div className="text-xs text-neutral-500">{t('protein')}</div>
                <div className="text-2xl font-bold text-emerald-700 tabular-nums mt-0.5">
                  {totalProtein}g
                  <span className="text-xs font-normal text-neutral-400">
                    {' '}
                    / {proteinTarget}g
                  </span>
                </div>
                <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (totalProtein / proteinTarget) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] text-neutral-500 mt-1 tabular-nums">
                  {proteinCalPct}% {isBn ? 'শক্তি' : 'of calories'}
                </div>
              </div>

              {/* Carbohydrates */}
              <div>
                <div className="text-xs text-neutral-500">
                  {isBn ? 'শর্করা (Carbs)' : 'Carbohydrates'}
                </div>
                <div className="text-2xl font-bold text-neutral-900 tabular-nums mt-0.5">
                  {totalCarbs}g
                </div>
                <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, carbsCalPct)}%` }}
                  />
                </div>
                <div className="text-[11px] text-neutral-500 mt-1 tabular-nums">
                  {carbsCalPct}% {isBn ? 'শক্তি' : 'of calories'}
                </div>
              </div>

              {/* Fat */}
              <div>
                <div className="text-xs text-neutral-500">
                  {isBn ? 'চর্বি (Fat)' : 'Fats & Oils'}
                </div>
                <div className="text-2xl font-bold text-neutral-900 tabular-nums mt-0.5">
                  {totalFat}g
                </div>
                <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, fatCalPct)}%` }}
                  />
                </div>
                <div className="text-[11px] text-neutral-500 mt-1 tabular-nums">
                  {fatCalPct}% {isBn ? 'শক্তি' : 'of calories'}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 flex items-center gap-2 text-xs text-neutral-500">
              <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>
                {isBn
                  ? 'যেকোনো লগ করা খাবারের পরিমাণ বা পুষ্টিমান পরিবর্তন করতে নামের পাশের "সম্পাদনা" (Edit) বাটনে ট্যাপ করুন।'
                  : 'Tap Edit on any logged meal item below to adjust its serving size, unit, or macro values.'}
              </span>
            </div>
          </div>

          {/* 4 Meal Sections: Breakfast, Lunch, Snacks, Dinner */}
          <div className="space-y-4">
            {meals.map((meal) => {
              const items = getMealLogs(meal);
              const mealCals = getMealCalories(meal);
              const mealProt = getMealProtein(meal);
              const isTargetMeal = selectedMealType === meal;

              return (
                <div
                  key={meal}
                  className={`bg-white rounded-3xl border transition-colors shadow-xs overflow-hidden ${
                    isTargetMeal
                      ? 'border-emerald-500/70'
                      : 'border-neutral-200/80'
                  }`}
                >
                  {/* Meal Header */}
                  <div className="px-5 py-4 bg-neutral-50/60 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedMealType(meal)}
                        className="text-left"
                      >
                        <h3 className="text-sm font-bold text-neutral-900">
                          {t(meal)}
                        </h3>
                        <div className="text-xs text-neutral-500 tabular-nums mt-0.5">
                          <span>{items.length} {isBn ? 'টি পদ' : 'items'}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-semibold text-neutral-800">
                            {mealCals} kcal
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-semibold text-emerald-700">
                            {mealProt}g {isBn ? 'প্রোটিন' : 'protein'}
                          </span>
                        </div>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyPreviousDay(meal)}
                        className="min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 flex items-center gap-1 transition-colors whitespace-nowrap"
                        title={
                          isBn
                            ? `গতকালকের ${t(meal)} কপি করুন`
                            : `Copy yesterday's ${t(meal)}`
                        }
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {isBn ? 'গতকাল থেকে কপি' : 'Copy Prev'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMealType(meal);
                          const searchInput = document.getElementById(
                            'bangladeshi-food-search-input'
                          );
                          if (searchInput) {
                            searchInput.scrollIntoView({
                              behavior: 'smooth',
                              block: 'center',
                            });
                            searchInput.focus();
                          }
                        }}
                        className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap ${
                          isTargetMeal
                            ? 'bg-emerald-700 text-white'
                            : 'bg-neutral-100 hover:bg-emerald-50 text-neutral-700 hover:text-emerald-800'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isBn ? 'খাবার যোগ' : 'Add Food'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Logged Items in Meal */}
                  {items.length === 0 ? (
                    <div className="p-6 text-center text-xs text-neutral-400">
                      {isBn
                        ? `${t(meal)}-এ এখনও কোনো খাবার যোগ করা হয়নি। ডানপাশের ডাটাবেস থেকে খাবার নির্বাচন করুন।`
                        : `No foods logged for ${t(meal)} yet. Select or search a food from the Bangladeshi database.`}
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {items.map((item) => {
                        const unitObj = SERVING_UNITS.find(
                          (u) => u.value === item.unit
                        );
                        const unitDisplay = unitObj
                          ? isBn
                            ? unitObj.shortBn
                            : unitObj.shortEn
                          : item.unit;

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleEditLoggedMeal(item)}
                            className="px-5 py-3.5 min-h-[60px] flex items-center justify-between gap-3 hover:bg-neutral-50/80 transition-colors cursor-pointer group"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs sm:text-sm font-semibold text-neutral-900 truncate group-hover:text-emerald-800">
                                {isBn && item.foodNameBn
                                  ? item.foodNameBn
                                  : item.foodName}
                              </div>
                              <div className="text-xs text-neutral-500 tabular-nums mt-0.5 flex flex-wrap items-center gap-x-1.5">
                                <span className="font-medium text-neutral-700">
                                  {item.portion} {unitDisplay}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{item.calories} kcal</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-emerald-700 font-medium">
                                  {item.protein}g P
                                </span>
                                {item.carbs !== undefined && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>{item.carbs}g C</span>
                                  </>
                                )}
                                {item.fat !== undefined && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>{item.fat}g F</span>
                                  </>
                                )}
                                {item.fiber !== undefined && item.fiber > 0 && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>{item.fiber}g Fiber</span>
                                  </>
                                )}
                                {item.notes && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-neutral-400 truncate max-w-[160px]">
                                      {item.notes}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditLoggedMeal(item);
                                }}
                                className="min-h-[44px] min-w-[44px] rounded-xl text-neutral-400 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-colors"
                                title={t('edit')}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNutrition(item.id);
                                }}
                                className="min-h-[44px] min-w-[44px] rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                                title={t('delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): AI Food Recognition Card + Searchable Bangladeshi Food Database */}
        <div className="lg:col-span-5 lg:sticky lg:top-[116px] space-y-5">
          {/* AI Food Recognition Quick Card */}
          <div className="bg-emerald-950 text-white rounded-3xl p-5 border border-emerald-800/80 shadow-xs space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isBn
                      ? 'এআই ফুড রিকগনিশন (AI Food Recognition)'
                      : 'AI Food Recognition'}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white">
                  {isBn
                    ? 'ছবি তুলে খাবারের ক্যালোরি ও প্রোটিন মাপুন'
                    : 'Snap a Meal Photo to Estimate Nutrition'}
                </h2>
                <p className="text-xs text-emerald-100/80 leading-relaxed">
                  {isBn
                    ? 'ভাত, মাছের ঝোল, ডাল, সবজি বা খিচুড়ির প্লেটের ছবি তুলুন। এআই প্রতিটি পদ আলাদাভাবে শনাক্ত করবে এবং আপনি সংরক্ষণের আগে সম্পাদনা করতে পারবেন।'
                    : 'Identify mixed Bengali plates (rice, fish curry, dal, bhaji) or single items and review/edit before saving.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => quickCameraInputRef.current?.click()}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span>{isBn ? 'ক্যামেরায় ছবি তুলুন' : 'Take Photo'}</span>
              </button>

              <button
                type="button"
                onClick={() => quickGalleryInputRef.current?.click()}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ImageIcon className="w-4 h-4 shrink-0 text-emerald-300" />
                <span>{isBn ? 'গ্যালারি থেকে নিন' : 'From Gallery'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                {isBn
                  ? 'বাংলাদেশী খাবারের তালিকা'
                  : 'Bangladeshi Food Database'}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {isBn
                  ? `${filteredFoods.length}টি খাবার পাওয়া গেছে · পরিমাণ এডিট করতে ট্যাপ করুন`
                  : `${filteredFoods.length} foods available · Tap any item to customize serving`}
              </p>
            </div>
          </div>

          {/* Active Meal Slot Selector */}
          <div className="p-1 bg-neutral-100 rounded-xl grid grid-cols-4 gap-1">
            {meals.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMealType(m)}
                className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors truncate ${
                  selectedMealType === m
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {t(m)}
              </button>
            ))}
          </div>

          {/* Search Input (supports English, Bangla script, and Banglish keywords) */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="bangladeshi-food-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isBn
                  ? 'খাবার খুঁজুন (যেমন: ভাত, রুটি, রুই, ডিম, ডাল, শাক, bhat, mach)...'
                  : 'Search (e.g. bhat, ruti, rui, dim, dal, shak, ભর্তা, doi)...'
              }
              className="w-full min-h-[44px] pl-10 pr-9 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="min-h-[40px] min-w-[40px] absolute right-1 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Interactive Category Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { id: 'all', label: isBn ? 'সব খাবার' : 'All Foods' },
              { id: 'favorites', label: isBn ? '★ প্রিয়' : '★ Favorites' },
              { id: 'waist_ideal', label: isBn ? 'কোমর বান্ধব' : 'Waist-Friendly' },
              { id: 'staple', label: isBn ? 'ভাত ও রুটি' : 'Rice & Roti' },
              { id: 'fish', label: isBn ? 'মাছ ও শুঁটকি' : 'Fish & Shutki' },
              { id: 'meat_egg', label: isBn ? 'ডিম ও মাংস' : 'Egg & Meat' },
              { id: 'dal_legume', label: isBn ? 'ডাল ও ছোলা' : 'Dal & Legumes' },
              { id: 'vegetable_bhorta', label: isBn ? 'শাক, সবজি ও ভর্তা' : 'Shak & Bhorta' },
              { id: 'dairy_drink', label: isBn ? 'দই, দুধ ও চা' : 'Dairy & Tea' },
              { id: 'fruit_snack', label: isBn ? 'ফল ও নাস্তা' : 'Fruits & Snacks' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Food Results Scroll List */}
          <div className="divide-y divide-neutral-100 max-h-[520px] overflow-y-auto -mx-2 px-2">
            {filteredFoods.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-xs text-neutral-500">
                  {isBn
                    ? `"${searchQuery}" নামের কোনো খাবার পাওয়া যায়নি।`
                    : `No food matching "${searchQuery}" found.`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleOpenCustomFoodModal();
                    setFoodNameInput(searchQuery);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isBn
                      ? `"${searchQuery}" নিজস্ব খাবার হিসেবে যোগ করুন`
                      : `Add "${searchQuery}" as Custom Food`}
                  </span>
                </button>
              </div>
            ) : (
              filteredFoods.map((food) => {
                const isFav = favorites.includes(food.id);
                const defaultCalc = calculateFoodNutrition(
                  food,
                  food.defaultPortion,
                  food.defaultUnit
                );
                const unitMeta = SERVING_UNITS.find(
                  (u) => u.value === food.defaultUnit
                );
                const unitLabel = unitMeta
                  ? isBn
                    ? unitMeta.shortBn
                    : unitMeta.shortEn
                  : food.defaultUnit;

                return (
                  <div
                    key={food.id}
                    onClick={() => handleSelectFoodFromDb(food)}
                    className="py-3 px-2 min-h-[64px] flex items-center justify-between gap-2 hover:bg-neutral-50 rounded-2xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(food.id);
                        }}
                        className="min-h-[44px] min-w-[40px] flex items-center justify-center text-neutral-300 hover:text-amber-500 shrink-0"
                        title={isBn ? 'প্রিয় তালিকায় রাখুন' : 'Toggle favorite'}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            isFav
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-neutral-300'
                          }`}
                        />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-semibold text-neutral-900 group-hover:text-emerald-800 truncate">
                          {isBn ? food.nameBn : food.name}
                        </div>
                        <div className="text-xs text-neutral-500 tabular-nums mt-0.5 flex flex-wrap items-center gap-x-1.5">
                          <span>
                            {food.defaultPortion} {unitLabel} (~{defaultCalc.totalGrams}g)
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-neutral-800">
                            {defaultCalc.calories} kcal
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-emerald-700">
                            {defaultCalc.protein}g P
                          </span>
                          {food.waistGuidance === 'ideal' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-700">
                                {isBn ? 'কোমর বান্ধব' : 'Waist-friendly'}
                              </span>
                            </>
                          )}
                          {food.waistGuidance === 'limit' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-700">
                                {isBn ? 'পরিমিত খান' : 'Limit portion'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {food.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCustomFood(food.id);
                          }}
                          className="min-h-[40px] min-w-[36px] rounded-xl text-neutral-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                          title={isBn ? 'নিজস্ব খাবার মুছে ফেলুন' : 'Delete custom food template'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Quick 1-Tap Add Button */}
                      <button
                        type="button"
                        onClick={(e) => handleQuickAddFood(e, food)}
                        className="min-h-[44px] min-w-[44px] rounded-xl bg-neutral-100 hover:bg-emerald-700 text-neutral-700 hover:text-white flex items-center justify-center shrink-0 transition-colors"
                        title={
                          isBn
                            ? `${food.defaultPortion} ${unitLabel} সরাসরি যোগ করুন`
                            : `Quick add ${food.defaultPortion} ${unitLabel}`
                        }
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          </div>
        </div>
      </div>

      {/* AI Food Recognition Modal */}
      <AIFoodRecognitionModal
        isOpen={isAiRecognitionOpen}
        onClose={() => {
          setIsAiRecognitionOpen(false);
          setQuickSelectedFile(null);
        }}
        initialDate={selectedDate}
        initialMealType={selectedMealType}
        initialFile={quickSelectedFile}
        onSaveToTracker={async (entry) => {
          await addNutrition({
            date: entry.date,
            mealType: entry.mealType,
            foodName: entry.foodName,
            foodNameBn: entry.foodNameBn,
            portion: entry.portion,
            unit: entry.unit,
            calories: entry.calories,
            protein: entry.protein,
            carbs: entry.carbs,
            fat: entry.fat,
            fiber: entry.fiber,
            notes: entry.notes,
          });
          setSelectedDate(entry.date);
          setSelectedMealType(entry.mealType);
          showFeedback(
            isBn
              ? `"${entry.foodNameBn}" (${entry.portion}g · ${entry.calories} kcal) ${t(entry.mealType)}-এ যোগ হয়েছে!`
              : `Added "${entry.foodName}" (${entry.portion}g · ${entry.calories} kcal) to ${t(entry.mealType)}!`
          );
        }}
      />

      {/* =====================================================================
          SERVING SIZE & MACRONUTRIENT EDITOR MODAL (Add / Edit Meal)
      ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-100 space-y-5">
            {/* Modal Top Drag Handle (Mobile) & Header */}
            <div className="w-10 h-1.5 bg-neutral-200 rounded-full mx-auto sm:hidden" />

            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-emerald-700">
                  {editingLogId
                    ? isBn
                      ? 'লগ করা খাবার সম্পাদনা'
                      : 'Edit Logged Meal Item'
                    : isBn
                    ? `${t(selectedMealType)}-এ খাবার যোগ`
                    : `Add to ${t(selectedMealType)}`}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 mt-0.5">
                  {activeFood
                    ? isBn
                      ? activeFood.nameBn
                      : activeFood.name
                    : foodNameInput || (isBn ? 'নিজস্ব খাবার' : 'Custom Meal')}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="min-h-[44px] min-w-[44px] rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFoodModal} className="space-y-4">
              {/* If custom food or editing name */}
              {!activeFood && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      {isBn ? 'খাবারের নাম (ইংরেজি/বাংলা) *' : 'Food Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={foodNameInput}
                      onChange={(e) => setFoodNameInput(e.target.value)}
                      placeholder={
                        isBn
                          ? 'যেমন: বাসায় রান্না মুরগির ঝোল'
                          : 'e.g. Homemade Chicken Jhol'
                      }
                      className="w-full min-h-[44px] px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      {isBn ? 'খাবারের ধরন' : 'Category'}
                    </label>
                    <select
                      value={customCategory}
                      onChange={(e) =>
                        setCustomCategory(e.target.value as FoodCategory)
                      }
                      className="w-full min-h-[44px] px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-emerald-600"
                    >
                      <option value="staple">
                        {isBn ? 'ভাত ও রুটি' : 'Rice & Roti'}
                      </option>
                      <option value="fish">
                        {isBn ? 'মাছ ও সামুদ্রিক খাবার' : 'Fish & Seafood'}
                      </option>
                      <option value="meat_egg">
                        {isBn ? 'ডিম ও মাংস' : 'Meat & Eggs'}
                      </option>
                      <option value="dal_legume">
                        {isBn ? 'ডাল ও ছোলা' : 'Dal & Legumes'}
                      </option>
                      <option value="vegetable_bhorta">
                        {isBn ? 'শাকসবজি ও ভর্তা' : 'Vegetables & Bhorta'}
                      </option>
                      <option value="dairy_drink">
                        {isBn ? 'দই, দুধ ও পানীয়' : 'Dairy & Beverages'}
                      </option>
                      <option value="fruit_snack">
                        {isBn ? 'ফল ও নাস্তা' : 'Fruits & Snacks'}
                      </option>
                    </select>
                  </div>
                </div>
              )}

              {/* Editable Serving Size & Unit Section */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800">
                    {isBn
                      ? 'পরিমাণ ও একক নির্বাচন করুন (Serving Size)'
                      : 'Editable Serving Size & Unit'}
                  </label>
                  <span className="text-xs font-semibold text-emerald-800 tabular-nums">
                    {isBn
                      ? `মোট ওজন: ~${currentModalGrams} গ্রাম`
                      : `Total Weight: ~${currentModalGrams}g`}
                  </span>
                </div>

                {/* Quantity Stepper + Unit Dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Tactile Stepper + Numeric Input */}
                  <div className="sm:col-span-5 flex items-center bg-white border border-neutral-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        updatePortionAndUnit(
                          Math.max(
                            unit === 'grams' ? 10 : 0.25,
                            portion - stepIncrement
                          ),
                          unit
                        )
                      }
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 transition-colors"
                      aria-label="Decrease serving"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={portion}
                      onChange={(e) =>
                        updatePortionAndUnit(
                          parseFloat(e.target.value) || 0.5,
                          unit
                        )
                      }
                      className="w-full min-h-[44px] text-center text-sm font-bold text-neutral-900 tabular-nums focus:outline-hidden"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        updatePortionAndUnit(portion + stepIncrement, unit)
                      }
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 transition-colors"
                      aria-label="Increase serving"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Unit Selector */}
                  <div className="sm:col-span-7">
                    <select
                      value={unit}
                      onChange={(e) => {
                        const nextUnit = e.target.value as ServingUnit;
                        // When switching to grams, set portion to currentModalGrams for smooth transition
                        if (nextUnit === 'grams' && unit !== 'grams') {
                          updatePortionAndUnit(currentModalGrams || 100, 'grams');
                        } else if (unit === 'grams' && nextUnit !== 'grams') {
                          updatePortionAndUnit(
                            activeFood?.defaultPortion || 1,
                            nextUnit
                          );
                        } else {
                          updatePortionAndUnit(portion, nextUnit);
                        }
                      }}
                      className="w-full min-h-[44px] px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm font-semibold text-neutral-900 focus:outline-hidden focus:border-emerald-600"
                    >
                      {SERVING_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {isBn ? u.labelBn : u.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Portion Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-neutral-500 mr-1">
                    {isBn ? 'দ্রুত মাপ:' : 'Quick size:'}
                  </span>
                  {portionPresets.map((presetVal) => {
                    const isActive = portion === presetVal;
                    return (
                      <button
                        key={presetVal}
                        type="button"
                        onClick={() => updatePortionAndUnit(presetVal, unit)}
                        className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold tabular-nums transition-colors ${
                          isActive
                            ? 'bg-emerald-700 text-white'
                            : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        {presetVal}
                        {unit === 'grams' ? 'g' : `×`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Macronutrients (Calories, Protein, Carbs, Fat) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-700">
                    {isBn
                      ? 'আনুমানিক পুষ্টিমান (প্রয়োজনে পরিবর্তনযোগ্য)'
                      : 'Nutrition Values (Editable)'}
                  </span>
                  {activeFood && isManualMacroOverride && (
                    <button
                      type="button"
                      onClick={handleResetToCalculatedMacros}
                      className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>
                        {isBn ? 'অটো হিসাবে ফিরুন' : 'Reset to auto estimate'}
                      </span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-neutral-500 font-medium mb-1">
                      {t('calories')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={customCalories}
                      onChange={(e) => {
                        setIsManualMacroOverride(true);
                        setCustomCalories(parseInt(e.target.value, 10) || 0);
                      }}
                      className="w-full min-h-[42px] px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm font-bold text-neutral-900 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-emerald-700 font-medium mb-1">
                      {t('protein')} (g)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={customProtein}
                      onChange={(e) => {
                        setIsManualMacroOverride(true);
                        setCustomProtein(parseFloat(e.target.value) || 0);
                      }}
                      className="w-full min-h-[42px] px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm font-bold text-emerald-800 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-500 font-medium mb-1">
                      Carbs (g)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={customCarbs}
                      onChange={(e) => {
                        setIsManualMacroOverride(true);
                        setCustomCarbs(parseFloat(e.target.value) || 0);
                      }}
                      className="w-full min-h-[42px] px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm font-bold text-neutral-900 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-500 font-medium mb-1">
                      Fat (g)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={customFat}
                      onChange={(e) => {
                        setIsManualMacroOverride(true);
                        setCustomFat(parseFloat(e.target.value) || 0);
                      }}
                      className="w-full min-h-[42px] px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm font-bold text-neutral-900 tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Waist & Dietary Guidance Tip for this Bangladeshi Food */}
              {activeFood && (activeFood.tipEn || activeFood.tipBn) && (
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-xs text-emerald-950 leading-relaxed">
                  <span className="font-semibold">
                    {isBn ? 'পুষ্টি পরামর্শ: ' : 'Dietary Tip: '}
                  </span>
                  {isBn ? activeFood.tipBn : activeFood.tipEn}
                </div>
              )}

              {/* Meal Slot Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  {isBn ? 'খাবারের বেলা (Meal Slot)' : 'Meal Time'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {meals.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMealType(m)}
                      className={`min-h-[40px] py-2 rounded-xl text-xs font-semibold capitalize transition-colors ${
                        selectedMealType === m
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {t(m)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {isBn ? 'নোট (ঐচ্ছিক)' : 'Optional Notes'}
                </label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder={
                    isBn
                      ? 'যেমন: বাসায় কম তেলে রান্না, চিনি ছাড়া'
                      : 'e.g. Home-cooked with minimal oil, no added sugar'
                  }
                  className="w-full min-h-[42px] px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {/* Save to Custom Food Database Checkbox (when creating a custom food) */}
              {!activeFood && !editingLogId && (
                <label className="flex items-center gap-2.5 text-xs text-neutral-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={saveToCustomDb}
                    onChange={(e) => setSaveToCustomDb(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500"
                  />
                  <span>
                    {isBn
                      ? 'ভবিষ্যতে দ্রুত খুঁজে পেতে এই খাবারটি ডাটাবেসে সংরক্ষণ করুন'
                      : 'Save this item to my Bangladeshi Food Database for future use'}
                  </span>
                </label>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 min-h-[48px] py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs sm:text-sm font-semibold hover:bg-neutral-50 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 min-h-[48px] py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
                >
                  {editingLogId
                    ? isBn
                      ? 'আপডেট সংরক্ষণ করুন'
                      : 'Update Meal'
                    : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
