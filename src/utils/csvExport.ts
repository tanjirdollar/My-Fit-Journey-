import {
  UserProfile,
  BodyMeasurement,
  NutritionLog,
  ExerciseLog,
  ActivityLog,
  HabitLog,
  SleepLog,
  HealthRecord,
  AICoachNote,
  FoodItem,
  CsvExportCategory,
} from '../types';
import { BENGALI_FOODS, calculateFoodNutrition } from '../data/bengaliFoods';

export interface UserExportBundle {
  profile: UserProfile;
  bodyMeasurements: BodyMeasurement[];
  nutritionLogs: NutritionLog[];
  exerciseLogs: ExerciseLog[];
  activityLogs: ActivityLog[];
  habitLogs: HabitLog[];
  sleepLogs: SleepLog[];
  healthRecords: HealthRecord[];
  aiCoachNotes: AICoachNote[];
  favoriteFoodIds: string[];
  customFoods: FoodItem[];
}

const UTF8_BOM = '\uFEFF';

/**
 * Escapes a single cell value according to RFC 4180 CSV rules.
 * Preserves Bengali Unicode characters, dates, and numbers cleanly.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value)
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/"/g, '""');
  return `"${str}"`;
}

export function buildCsvTable(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return [headerLine, ...dataLines].join('\r\n') + '\r\n';
}

export function generateCategoryCsvMap(bundle: UserExportBundle): Record<
  Exclude<CsvExportCategory, 'all_zip' | 'all_combined_csv'>,
  { filename: string; title: string; csvContent: string; rowCount: number }
> {
  const {
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
  } = bundle;

  // 1. User Profile (Excludes any sensitive auth tokens, UIDs, or secrets)
  const profileHeaders = [
    'DisplayName',
    'Email',
    'Age',
    'Gender',
    'HeightCm',
    'TargetWeightKg',
    'TargetWaistCm',
    'DailyCalorieTargetKcal',
    'DailyProteinTargetGrams',
    'DailyStepsTarget',
    'DailyWalkingMinutesTarget',
    'DailyWaterTargetGlasses',
    'WeeklyWorkoutsTarget',
    'Language',
    'UpdatedAt',
  ];
  const profileRows = [
    [
      profile.displayName || 'Tanjir',
      profile.email || '',
      profile.age,
      profile.gender,
      profile.heightCm,
      profile.targetWeightKg,
      profile.targetWaistCm,
      profile.dailyCalorieTarget,
      profile.dailyProteinTargetGrams,
      profile.dailyStepsTarget,
      profile.dailyWalkingMinutesTarget,
      profile.dailyWaterTargetGlasses,
      profile.weeklyWorkoutsTarget,
      profile.language,
      profile.updatedAt || '',
    ],
  ];

  // 2. Body Measurements
  const measurementHeaders = [
    'ID',
    'Date',
    'WeightKg',
    'WaistCm',
    'BMI',
    'WaistToHeightRatio',
    'Notes',
    'CreatedAt',
  ];
  const measurementRows = [...bodyMeasurements]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((m) => [
      m.id,
      m.date,
      m.weightKg,
      m.waistCm,
      m.bmi,
      m.waistToHeightRatio,
      m.notes || '',
      m.createdAt || '',
    ]);

  // 3. Nutrition Logs
  const nutritionHeaders = [
    'ID',
    'Date',
    'MealType',
    'FoodNameEn',
    'FoodNameBn',
    'Portion',
    'Unit',
    'CaloriesKcal',
    'ProteinGrams',
    'CarbsGrams',
    'FatGrams',
    'Notes',
    'CreatedAt',
  ];
  const nutritionRows = [...nutritionLogs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((n) => [
      n.id,
      n.date,
      n.mealType,
      n.foodName,
      n.foodNameBn || n.foodName,
      n.portion,
      n.unit,
      n.calories,
      n.protein,
      n.carbs ?? 0,
      n.fat ?? 0,
      n.notes || '',
      n.createdAt || '',
    ]);

  // 4. Exercise Logs
  const exerciseHeaders = [
    'ID',
    'Date',
    'ExerciseCategory',
    'ExerciseName',
    'Sets',
    'Reps',
    'DurationMinutes',
    'PerceivedEffortRPE',
    'CaloriesBurnedKcal',
    'Notes',
    'CreatedAt',
  ];
  const exerciseRows = [...exerciseLogs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => [
      e.id,
      e.date,
      e.exerciseType,
      e.name,
      e.sets,
      e.reps,
      e.durationMinutes,
      e.rpe,
      e.caloriesBurned ?? 0,
      e.notes || '',
      e.createdAt || '',
    ]);

  // 5. Activity Logs
  const activityHeaders = [
    'ID',
    'Date',
    'Steps',
    'WalkingDurationMinutes',
    'DistanceKm',
    'Notes',
    'CreatedAt',
  ];
  const activityRows = [...activityLogs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((a) => [
      a.id,
      a.date,
      a.steps,
      a.walkingDurationMinutes,
      a.distanceKm,
      a.notes || '',
      a.createdAt || '',
    ]);

  // 6. Habit Logs
  const habitHeaders = [
    'ID',
    'Date',
    'WaterGlasses',
    'WaterLitersApprox',
    'SittingBreaks',
    'WalkingDone',
    'ExerciseDone',
    'MealLogged',
    'VegetableMet',
    'SleepRoutineMet',
    'UpdatedAt',
  ];
  const habitRows = [...habitLogs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((h) => [
      h.id,
      h.date,
      h.waterGlasses,
      Number((h.waterGlasses * 0.25).toFixed(2)),
      h.sittingBreaks,
      h.walkingDone ? 'Yes' : 'No',
      h.exerciseDone ? 'Yes' : 'No',
      h.mealLogged ? 'Yes' : 'No',
      h.vegetableMet ? 'Yes' : 'No',
      h.sleepRoutineMet ? 'Yes' : 'No',
      h.updatedAt || '',
    ]);

  // 7. Sleep Logs
  const sleepHeaders = [
    'ID',
    'Date',
    'Bedtime',
    'WakeTime',
    'DurationMinutes',
    'DurationHours',
    'QualityRating1To5',
    'Notes',
    'CreatedAt',
  ];
  const sleepRows = [...sleepLogs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((s) => [
      s.id,
      s.date,
      s.bedtime,
      s.wakeTime,
      s.durationMinutes,
      Number((s.durationMinutes / 60).toFixed(2)),
      s.quality,
      s.notes || '',
      s.createdAt || '',
    ]);

  // 8. Health Records
  const healthHeaders = [
    'ID',
    'Date',
    'RecordType',
    'SystolicMmHg',
    'DiastolicMmHg',
    'PulseBpm',
    'GlucoseFastingMgDl',
    'GlucosePostMealMgDl',
    'HbA1cPercent',
    'TotalCholesterolMgDl',
    'LDLMgDl',
    'HDLMgDl',
    'TriglyceridesMgDl',
    'ReportNote',
    'CreatedAt',
  ];
  const healthRows = [...healthRecords]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((r) => [
      r.id,
      r.date,
      r.type,
      r.systolic ?? '',
      r.diastolic ?? '',
      r.pulse ?? '',
      r.glucoseFasting ?? '',
      r.glucosePostMeal ?? '',
      r.hba1c ?? '',
      r.totalCholesterol ?? '',
      r.ldl ?? '',
      r.hdl ?? '',
      r.triglycerides ?? '',
      r.reportNote || '',
      r.createdAt || '',
    ]);

  // 9. AI Coach Notes
  const coachHeaders = [
    'ID',
    'Date',
    'FocusArea',
    'Advice',
    'ActionItems',
    'CreatedAt',
  ];
  const coachRows = [...aiCoachNotes]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => [
      c.id,
      c.date,
      c.focusArea,
      c.advice,
      c.actionItems || '',
      c.createdAt || '',
    ]);

  // 10. Favorite Foods (resolved with full food metadata)
  const allFoodsCatalog = [...customFoods, ...BENGALI_FOODS];
  const favoriteHeaders = [
    'FoodID',
    'FoodNameEn',
    'FoodNameBn',
    'Category',
    'DefaultPortion',
    'DefaultUnit',
    'GramsPerUnit',
    'DefaultCaloriesKcal',
    'DefaultProteinGrams',
    'DefaultCarbsGrams',
    'DefaultFatGrams',
    'WaistGuidance',
    'Source',
  ];
  const uniqueFavIds = Array.from(new Set(favoriteFoodIds));
  const favoriteRows = uniqueFavIds.map((favId) => {
    const found = allFoodsCatalog.find((f) => f.id === favId);
    if (!found) {
      return [favId, favId, favId, 'unknown', '', '', '', '', '', '', '', '', 'custom'];
    }
    const calc = calculateFoodNutrition(found, found.defaultPortion, found.defaultUnit);
    return [
      found.id,
      found.name,
      found.nameBn,
      found.category,
      found.defaultPortion,
      found.defaultUnit,
      found.gramsPerUnit,
      calc.calories,
      calc.protein,
      calc.carbs,
      calc.fat,
      found.waistGuidance || 'moderate',
      found.isCustom ? 'Custom Template' : 'Bangladeshi Food DB',
    ];
  });

  // 11. Custom Food Templates
  const customFoodHeaders = [
    'ID',
    'FoodNameEn',
    'FoodNameBn',
    'Category',
    'DefaultPortion',
    'DefaultUnit',
    'GramsPerUnit',
    'CaloriesPer100gOrUnit',
    'ProteinPer100gOrUnit',
    'CarbsPer100gOrUnit',
    'FatPer100gOrUnit',
    'IsPerUnit',
    'WaistGuidance',
    'CreatedAt',
  ];
  const customFoodRows = customFoods.map((f) => [
    f.id,
    f.name,
    f.nameBn,
    f.category,
    f.defaultPortion,
    f.defaultUnit,
    f.gramsPerUnit,
    f.caloriesPer100gOrUnit,
    f.proteinPer100gOrUnit,
    f.carbsPer100gOrUnit,
    f.fatPer100gOrUnit,
    f.isPerUnit ? 'Yes' : 'No',
    f.waistGuidance || 'moderate',
    f.createdAt || '',
  ]);

  return {
    user_profile: {
      filename: '01_user_profile.csv',
      title: 'User Profile',
      csvContent: buildCsvTable(profileHeaders, profileRows),
      rowCount: profileRows.length,
    },
    body_measurements: {
      filename: '02_body_measurements.csv',
      title: 'Body Measurements',
      csvContent: buildCsvTable(measurementHeaders, measurementRows),
      rowCount: measurementRows.length,
    },
    nutrition_logs: {
      filename: '03_nutrition_logs.csv',
      title: 'Nutrition Logs',
      csvContent: buildCsvTable(nutritionHeaders, nutritionRows),
      rowCount: nutritionRows.length,
    },
    exercise_logs: {
      filename: '04_exercise_logs.csv',
      title: 'Exercise Logs',
      csvContent: buildCsvTable(exerciseHeaders, exerciseRows),
      rowCount: exerciseRows.length,
    },
    activity_logs: {
      filename: '05_activity_logs.csv',
      title: 'Activity Logs',
      csvContent: buildCsvTable(activityHeaders, activityRows),
      rowCount: activityRows.length,
    },
    habit_logs: {
      filename: '06_habit_logs.csv',
      title: 'Habit Logs',
      csvContent: buildCsvTable(habitHeaders, habitRows),
      rowCount: habitRows.length,
    },
    sleep_logs: {
      filename: '07_sleep_logs.csv',
      title: 'Sleep Logs',
      csvContent: buildCsvTable(sleepHeaders, sleepRows),
      rowCount: sleepRows.length,
    },
    health_records: {
      filename: '08_health_records.csv',
      title: 'Health Records',
      csvContent: buildCsvTable(healthHeaders, healthRows),
      rowCount: healthRows.length,
    },
    ai_coach_notes: {
      filename: '09_ai_coach_notes.csv',
      title: 'AI Coach Notes',
      csvContent: buildCsvTable(coachHeaders, coachRows),
      rowCount: coachRows.length,
    },
    favorite_foods: {
      filename: '10_favorite_foods.csv',
      title: 'Favorite Foods',
      csvContent: buildCsvTable(favoriteHeaders, favoriteRows),
      rowCount: favoriteRows.length,
    },
    custom_foods: {
      filename: '11_custom_food_templates.csv',
      title: 'Custom Food Templates',
      csvContent: buildCsvTable(customFoodHeaders, customFoodRows),
      rowCount: customFoodRows.length,
    },
  };
}

/**
 * Generates a single combined CSV string containing all 11 sections with UTF-8 BOM.
 */
export function generateCombinedAllCategoriesCsv(bundle: UserExportBundle): string {
  const map = generateCategoryCsvMap(bundle);
  const sections: string[] = [];

  (Object.keys(map) as Array<keyof typeof map>).forEach((key) => {
    const item = map[key];
    sections.push(`"=== SECTION: ${item.title.toUpperCase()} (${item.rowCount} records) ==="`);
    sections.push(item.csvContent.trimEnd());
    sections.push(''); // blank line separator between tables
  });

  return UTF8_BOM + sections.join('\r\n');
}

// ============================================================================
// Pure TypeScript Standard ZIP Builder (STORE / Uncompressed + CRC32)
// ============================================================================

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createZipArchive(
  files: { name: string; content: string }[]
): Blob {
  const encoder = new TextEncoder();
  const localFileParts: Uint8Array[] = [];
  const centralDirParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    // Prepend UTF-8 BOM to every CSV file in the ZIP for Excel compatibility
    const dataBytes = encoder.encode(
      file.content.startsWith(UTF8_BOM) ? file.content : UTF8_BOM + file.content
    );
    const fileCrc = crc32(dataBytes);
    const size = dataBytes.length;

    // Local file header (30 bytes + file name)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true); // Local file header signature
    localView.setUint16(4, 20, true); // Version needed to extract (2.0)
    localView.setUint16(6, 0x0800, true); // General purpose bit flag (UTF-8 filename)
    localView.setUint16(8, 0, true); // Compression method (0 = STORE)
    localView.setUint16(10, 0, true); // Last mod file time
    localView.setUint16(12, 0x5421, true); // Last mod file date
    localView.setUint32(14, fileCrc, true); // CRC-32
    localView.setUint32(18, size, true); // Compressed size
    localView.setUint32(22, size, true); // Uncompressed size
    localView.setUint16(26, nameBytes.length, true); // File name length
    localView.setUint16(28, 0, true); // Extra field length
    localHeader.set(nameBytes, 30);

    localFileParts.push(localHeader, dataBytes);

    // Central directory file header (46 bytes + file name)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true); // Central file header signature
    centralView.setUint16(4, 20, true); // Version made by
    centralView.setUint16(6, 20, true); // Version needed to extract
    centralView.setUint16(8, 0x0800, true); // General purpose bit flag (UTF-8)
    centralView.setUint16(10, 0, true); // Compression method (0 = STORE)
    centralView.setUint16(12, 0, true); // Last mod time
    centralView.setUint16(14, 0x5421, true); // Last mod date
    centralView.setUint32(16, fileCrc, true); // CRC-32
    centralView.setUint32(20, size, true); // Compressed size
    centralView.setUint32(24, size, true); // Uncompressed size
    centralView.setUint16(28, nameBytes.length, true); // File name length
    centralView.setUint16(30, 0, true); // Extra field length
    centralView.setUint16(32, 0, true); // File comment length
    centralView.setUint16(34, 0, true); // Disk number start
    centralView.setUint16(36, 0, true); // Internal file attributes
    centralView.setUint32(38, 0, true); // External file attributes
    centralView.setUint32(42, offset, true); // Relative offset of local header
    centralHeader.set(nameBytes, 46);

    centralDirParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralDirSize = centralDirParts.reduce((acc, part) => acc + part.length, 0);
  const endOfCentralDir = new Uint8Array(22);
  const endView = new DataView(endOfCentralDir.buffer);
  endView.setUint32(0, 0x06054b50, true); // End of central dir signature
  endView.setUint16(4, 0, true); // Number of this disk
  endView.setUint16(6, 0, true); // Disk where central directory starts
  endView.setUint16(8, files.length, true); // Number of central directory records on this disk
  endView.setUint16(10, files.length, true); // Total number of central directory records
  endView.setUint32(12, centralDirSize, true); // Size of central directory
  endView.setUint32(16, offset, true); // Offset of start of central directory
  endView.setUint16(20, 0, true); // Comment length

  const totalZipSize = offset + centralDirSize + endOfCentralDir.length;
  const zipBytes = new Uint8Array(totalZipSize);
  let cursor = 0;
  for (const part of localFileParts) {
    zipBytes.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralDirParts) {
    zipBytes.set(part, cursor);
    cursor += part.length;
  }
  zipBytes.set(endOfCentralDir, cursor);

  return new Blob([zipBytes.buffer], {
    type: 'application/zip',
  });
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCsvExport(
  bundle: UserExportBundle,
  dateStr: string,
  category: CsvExportCategory = 'all_zip'
): void {
  const categoryMap = generateCategoryCsvMap(bundle);

  if (category === 'all_zip') {
    const files = (Object.keys(categoryMap) as Array<keyof typeof categoryMap>).map(
      (key) => ({
        name: categoryMap[key].filename,
        content: categoryMap[key].csvContent,
      })
    );
    // Also include a combined master CSV inside the ZIP for convenience
    files.push({
      name: '00_all_data_combined.csv',
      content: generateCombinedAllCategoriesCsv(bundle),
    });

    const zipBlob = createZipArchive(files);
    triggerBrowserDownload(zipBlob, `myfit_journey_csv_export_${dateStr}.zip`);
    return;
  }

  if (category === 'all_combined_csv') {
    const combinedCsv = generateCombinedAllCategoriesCsv(bundle);
    const blob = new Blob([combinedCsv], { type: 'text/csv;charset=utf-8;' });
    triggerBrowserDownload(blob, `myfit_journey_complete_export_${dateStr}.csv`);
    return;
  }

  const target = categoryMap[category];
  if (target) {
    const blob = new Blob([UTF8_BOM + target.csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    triggerBrowserDownload(
      blob,
      `myfit_${category}_${dateStr}.csv`
    );
  }
}
