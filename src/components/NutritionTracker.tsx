import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useFitnessData, getTodayDateStr } from '../context/FitnessDataContext';
import { BENGALI_FOODS } from '../data/bengaliFoods';
import { FoodItem, MealType, NutritionLog } from '../types';
import {
  Search,
  Plus,
  Trash2,
  Copy,
  Star,
  Info,
  Flame,
  Dumbbell,
  Clock,
  Sparkles,
  Check,
  ChevronDown,
} from 'lucide-react';

export const NutritionTracker: React.FC = () => {
  const { t, language } = useLanguage();
  const { nutritionLogs, addNutrition, deleteNutrition, copyYesterdayMeals } = useFitnessData();
  const isBn = language === 'bn';
  const today = getTodayDateStr();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('myfit_favorites');
    return saved ? JSON.parse(saved) : ['food_egg_boiled', 'food_rui_fish_curry', 'food_masoor_dal_thin'];
  });

  // Food logging form state
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);
  const [portion, setPortion] = useState<number>(1);
  const [unit, setUnit] = useState<string>('cup');
  const [customCalories, setCustomCalories] = useState<number>(0);
  const [customProtein, setCustomProtein] = useState<number>(0);
  const [customCarbs, setCustomCarbs] = useState<number>(0);
  const [customFat, setCustomFat] = useState<number>(0);
  const [foodNameInput, setFoodNameInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');

  // Copy yesterday notification
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  // Toggle favorite
  const toggleFavorite = (foodId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(foodId) ? prev.filter((id) => id !== foodId) : [...prev, foodId];
      localStorage.setItem('myfit_favorites', JSON.stringify(next));
      return next;
    });
  };

  // Filter foods
  const filteredFoods = BENGALI_FOODS.filter((food) => {
    const matchesSearch =
      food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      food.nameBn.includes(searchQuery);
    const matchesCategory =
      selectedCategory === 'all'
        ? true
        : selectedCategory === 'favorites'
        ? favorites.includes(food.id)
        : food.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter today's logged meals
  const todayLogs = nutritionLogs.filter((n) => n.date === today);

  const getMealLogs = (meal: MealType) => todayLogs.filter((n) => n.mealType === meal);

  const getMealCalories = (meal: MealType) =>
    getMealLogs(meal).reduce((sum, n) => sum + (n.calories || 0), 0);
  const getMealProtein = (meal: MealType) =>
    Number(getMealLogs(meal).reduce((sum, n) => sum + (n.protein || 0), 0).toFixed(1));

  const totalCaloriesToday = todayLogs.reduce((sum, n) => sum + (n.calories || 0), 0);
  const totalProteinToday = Number(todayLogs.reduce((sum, n) => sum + (n.protein || 0), 0).toFixed(1));
  const totalCarbsToday = Number(todayLogs.reduce((sum, n) => sum + (n.carbs || 0), 0).toFixed(1));
  const totalFatToday = Number(todayLogs.reduce((sum, n) => sum + (n.fat || 0), 0).toFixed(1));

  // Open food select modal
  const handleSelectFood = (food: FoodItem) => {
    setActiveFood(food);
    setFoodNameInput(food.name);
    setPortion(food.defaultPortion);
    setUnit(food.defaultUnit);
    // Calculate initial values
    calculateMacros(food, food.defaultPortion, food.defaultUnit);
    setIsModalOpen(true);
  };

  // Open custom food modal
  const handleOpenCustomFood = () => {
    setActiveFood(null);
    setFoodNameInput(isBn ? 'নতুন নিজস্ব খাবার' : 'Custom Healthy Meal');
    setPortion(1);
    setUnit('cup');
    setCustomCalories(150);
    setCustomProtein(10);
    setCustomCarbs(15);
    setCustomFat(3);
    setNotesInput('');
    setIsModalOpen(true);
  };

  // Calculate macros dynamically
  const calculateMacros = (food: FoodItem, p: number, u: string) => {
    // If food is per unit (piece/cup):
    let ratio = p;
    if (!food.isPerUnit && u === 'grams') {
      ratio = p / 100;
    } else if (!food.isPerUnit && u === 'tbsp') {
      ratio = (p * 15) / 100;
    } else if (!food.isPerUnit && u === 'katori') {
      ratio = (p * 100) / 100;
    } else if (!food.isPerUnit && u === 'cup') {
      ratio = (p * 150) / 100;
    }

    setCustomCalories(Math.round(food.caloriesPer100gOrUnit * ratio));
    setCustomProtein(Number((food.proteinPer100gOrUnit * ratio).toFixed(1)));
    setCustomCarbs(Number((food.carbsPer100gOrUnit * ratio).toFixed(1)));
    setCustomFat(Number((food.fatPer100gOrUnit * ratio).toFixed(1)));
  };

  const handlePortionChange = (newPortion: number) => {
    const p = Math.max(0.1, Number(newPortion));
    setPortion(p);
    if (activeFood) {
      calculateMacros(activeFood, p, unit);
    }
  };

  const handleUnitChange = (newUnit: string) => {
    setUnit(newUnit);
    if (activeFood) {
      calculateMacros(activeFood, portion, newUnit);
    }
  };

  // Submit food log
  const handleSaveFood = async () => {
    await addNutrition({
      date: today,
      mealType: selectedMealType,
      foodName: foodNameInput,
      foodNameBn: activeFood?.nameBn,
      portion,
      unit,
      calories: customCalories,
      protein: customProtein,
      carbs: customCarbs,
      fat: customFat,
      notes: notesInput,
    });
    setIsModalOpen(false);
  };

  const handleCopyYesterday = async (meal?: MealType) => {
    await copyYesterdayMeals(meal);
    setCopiedMessage(isBn ? 'গতকালকের খাবার সফলভাবে কপি করা হয়েছে!' : 'Yesterday meals copied successfully!');
    setTimeout(() => setCopiedMessage(null), 3000);
  };

  const meals: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner'];

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header & Totals Card */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-neutral-900 tracking-tight font-display">
              {t('nutrition')}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isBn
                ? 'বাঙালি সুষম পুষ্টি: পরিমিত ভাত, পর্যাপ্ত ডাল-মাছ-ডিম ও তেল কমানো'
                : 'Balanced nutrition: portion-controlled carbs, high quality protein, and low oil.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopyYesterday()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold transition-colors"
              title="Copy all yesterday's meals to today"
            >
              <Copy className="w-3.5 h-3.5 text-neutral-500" />
              <span>{t('copyYesterday')}</span>
            </button>

            <button
              onClick={handleOpenCustomFood}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('customFood')}</span>
            </button>
          </div>
        </div>

        {copiedMessage && (
          <div className="mb-3 p-2 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{copiedMessage}</span>
          </div>
        )}

        {/* Today's Macronutrient Totals Bar */}
        <div className="grid grid-cols-4 gap-2 bg-neutral-50 p-3 rounded-2xl border border-neutral-200/60 text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">{t('calories')}</div>
            <div className="text-lg font-black text-neutral-900">{totalCaloriesToday}</div>
            <div className="text-[10px] text-neutral-400 font-medium">kcal</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-emerald-700">{t('protein')}</div>
            <div className="text-lg font-black text-emerald-800">{totalProteinToday}g</div>
            <div className="text-[10px] text-emerald-600 font-medium">goal: 75g</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">Carbs</div>
            <div className="text-lg font-black text-neutral-800">{totalCarbsToday}g</div>
            <div className="text-[10px] text-neutral-400 font-medium">moderate</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">Fat</div>
            <div className="text-lg font-black text-neutral-800">{totalFatToday}g</div>
            <div className="text-[10px] text-neutral-400 font-medium">healthy oils</div>
          </div>
        </div>

        {/* Notice on estimated values */}
        <div className="mt-3 flex items-start gap-1.5 text-[11px] text-neutral-500">
          <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
          <span>{t('estimatedValuesNotice')}</span>
        </div>
      </div>

      {/* Meals Sections: Breakfast, Lunch, Snacks, Dinner */}
      <div className="space-y-3">
        {meals.map((meal) => {
          const items = getMealLogs(meal);
          const mealCals = getMealCalories(meal);
          const mealProt = getMealProtein(meal);

          return (
            <div
              key={meal}
              className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden"
            >
              <div className="p-3.5 sm:p-4 bg-neutral-50/70 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span className="font-extrabold text-sm text-neutral-900">{t(meal)}</span>
                  <span className="text-xs text-neutral-500 font-medium">
                    ({items.length} {isBn ? 'পদ' : 'items'})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <span className="font-bold text-neutral-900">{mealCals} kcal</span>
                    <span className="text-neutral-400 mx-1">•</span>
                    <span className="font-semibold text-emerald-700">{mealProt}g P</span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedMealType(meal);
                      // Scroll to search or open search modal
                      const searchEl = document.getElementById('food-search-section');
                      if (searchEl) searchEl.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-7 h-7 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-center transition-colors shadow-2xs"
                    title={`Add food to ${t(meal)}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Items in meal */}
              {items.length === 0 ? (
                <div className="p-4 text-center text-neutral-400 text-xs">
                  {isBn ? `${t(meal)} এখনও যোগ করা হয়নি` : `No foods logged for ${t(meal)} yet`}
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 sm:px-4 flex items-center justify-between hover:bg-neutral-50/60 transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-neutral-800">
                          {isBn && item.foodNameBn ? item.foodNameBn : item.foodName}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {item.portion} {item.unit}
                          {item.notes ? ` • ${item.notes}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs font-black text-neutral-900">{item.calories} kcal</div>
                          <div className="text-[10px] font-semibold text-emerald-700">{item.protein}g protein</div>
                        </div>

                        <button
                          onClick={() => deleteNutrition(item.id)}
                          className="p-1 rounded-md text-neutral-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title={t('delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bengali Food Database & Search Section */}
      <div id="food-search-section" className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-extrabold text-neutral-900 tracking-tight">
              {isBn ? 'বাঙালি খাবারের ডাটাবেস থেকে বাছাই করুন' : 'Search & Add from Bengali Food Database'}
            </h3>
            <p className="text-xs text-neutral-500">
              {isBn
                ? 'পছন্দের খাবারে ক্লিক করে পরিমাণ ও পুষ্টিমান পরিবর্তন করে যোগ করুন।'
                : 'Click any food to customize portion size and estimated macronutrients.'}
            </p>
          </div>

          {/* Target meal selector */}
          <div className="flex items-center gap-1.5 text-xs bg-neutral-100 p-1 rounded-xl">
            <span className="text-[10px] font-bold text-neutral-500 px-1">
              {isBn ? 'যোগ হবে:' : 'Into:'}
            </span>
            {meals.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMealType(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                  selectedMealType === m ? 'bg-white text-emerald-800 shadow-2xs' : 'text-neutral-600'
                }`}
              >
                {t(m)}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchFood')}
            className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar text-xs">
          {[
            { id: 'all', label: isBn ? 'সব' : 'All' },
            { id: 'favorites', label: isBn ? 'প্রিয় খাবার' : '★ Favorites' },
            { id: 'staple', label: isBn ? 'ভাত ও রুটি' : 'Rice & Roti' },
            { id: 'protein', label: isBn ? 'মাছ, ডাল ও ডিম' : 'Fish, Dal & Protein' },
            { id: 'vegetable', label: isBn ? 'শাকসবজি' : 'Vegetables & Shak' },
            { id: 'dairy', label: isBn ? 'দই ও দুধ' : 'Yogurt & Dairy' },
            { id: 'fruit', label: isBn ? 'ফল' : 'Fruits' },
            { id: 'snack', label: isBn ? 'নাস্তা' : 'Snacks' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Food List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-[380px] overflow-y-auto pr-1">
          {filteredFoods.map((food) => {
            const isFav = favorites.includes(food.id);
            return (
              <div
                key={food.id}
                onClick={() => handleSelectFood(food)}
                className="p-3 rounded-2xl border border-neutral-200/70 bg-white hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(food.id);
                    }}
                    className="p-1 text-neutral-300 hover:text-amber-500 transition-colors"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        isFav ? 'fill-amber-400 text-amber-500' : 'text-neutral-300'
                      }`}
                    />
                  </button>

                  <div>
                    <div className="text-xs font-bold text-neutral-900 group-hover:text-emerald-800 transition-colors">
                      {isBn ? food.nameBn : food.name}
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      1 {food.defaultUnit} • {food.caloriesPer100gOrUnit} kcal
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {food.proteinPer100gOrUnit}g P
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Food Customize & Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-neutral-100 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {t(selectedMealType)}
                </span>
                <h3 className="text-base font-extrabold text-neutral-900 mt-1">
                  {foodNameInput}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center font-bold"
              >
                &times;
              </button>
            </div>

            {/* Serving Size and Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  {t('servingSize')}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={portion}
                  onChange={(e) => handlePortionChange(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Unit / একক
                </label>
                <select
                  value={unit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="cup">{t('cup')}</option>
                  <option value="katori">{t('katori')}</option>
                  <option value="piece">{t('piece')}</option>
                  <option value="grams">{t('grams')}</option>
                  <option value="tbsp">{t('tbsp')}</option>
                  <option value="glass">{t('glass')}</option>
                </select>
              </div>
            </div>

            {/* Editable Estimated Macronutrients */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-neutral-600">
                  Estimated Nutrition (Editable)
                </span>
                <span className="text-[10px] text-neutral-400">Change if you know exact values</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] text-neutral-400 font-semibold mb-0.5">Calories</label>
                  <input
                    type="number"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-emerald-700 font-semibold mb-0.5">Protein (g)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-400 font-semibold mb-0.5">Carbs (g)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold text-neutral-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-400 font-semibold mb-0.5">Fat (g)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={customFat}
                    onChange={(e) => setCustomFat(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold text-neutral-800"
                  />
                </div>
              </div>
            </div>

            {/* Meal Type selection */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Meal Category
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {meals.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMealType(m)}
                    className={`py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                      selectedMealType === m
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {t(m)}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Optional Notes
              </label>
              <input
                type="text"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="e.g. cooked with minimal oil, home-cooked"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-bold hover:bg-neutral-50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveFood}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
