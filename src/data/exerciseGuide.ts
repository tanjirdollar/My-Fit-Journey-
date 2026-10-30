import { ExerciseCategory } from '../types';

export interface ExerciseDefinition {
  id: string;
  category: ExerciseCategory;
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  targetMusclesEn: string;
  targetMusclesBn: string;
  benefitsEn: string;
  benefitsBn: string;
  defaultSets: number;
  defaultReps: number;
  defaultDurationMin: number;
  defaultRpe: number;
  caloriesBurnedRatePerMin: number; // approximate for 63kg male
}

export const EXERCISE_GUIDE: ExerciseDefinition[] = [
  {
    id: 'ex_walking',
    category: 'walking',
    nameEn: 'Daily Moderate Walking',
    nameBn: 'স্বাভাবিক গতিতে হাঁটা',
    descriptionEn: 'Continuous rhythmic walking, ideal for post-meal glucose disposal and building daily baseline activity.',
    descriptionBn: 'খাবারের পর বা কাজের ফাঁকে স্বাভাবিক গতিতে হাঁটা, যা রক্তে শর্করা নিয়ন্ত্রণ ও অ্যাক্টিভিটি বাড়াতে সাহায্য করে।',
    targetMusclesEn: 'Cardiovascular system, calves, hamstrings',
    targetMusclesBn: 'হৃৎপিণ্ড, পায়ের কাফ ও হ্যামস্ট্রিং',
    benefitsEn: 'Low impact, lowers visceral fat accumulation, safe joint mobility for sedentary starters.',
    benefitsBn: 'কোমল প্রভাব, পেটের চর্বি জমতে বাধা দেয় এবং জয়েন্টের সচলতা বাড়ায়।',
    defaultSets: 1,
    defaultReps: 0,
    defaultDurationMin: 30,
    defaultRpe: 4,
    caloriesBurnedRatePerMin: 3.8,
  },
  {
    id: 'ex_brisk_walking',
    category: 'brisk_walking',
    nameEn: 'Brisk Walking (Paced)',
    nameBn: 'দ্রুত গতিতে হাঁটা (Brisk Walk)',
    descriptionEn: 'Walking fast enough that talking is possible but singing is not (~5.5-6.0 km/h).',
    descriptionBn: 'এমন গতিতে হাঁটা যাতে কথা বলা যায় কিন্তু গান গাওয়া কঠিন হয় (প্রতি ঘণ্টায় প্রায় ৫.৫-৬ কিমি)।',
    targetMusclesEn: 'Aerobic fitness, glutes, core stability',
    targetMusclesBn: 'অ্যারোবিক ফিটনেস, নিতম্ব ও কোর স্ট্যাবিলিটি',
    benefitsEn: 'Significantly improves waist-to-height ratio, insulin sensitivity, and resting metabolic rate.',
    benefitsBn: 'কোমরের মেদ কমাতে, ইনসুলিন সংবেদনশীলতা এবং মেটাবলিজম বাড়াতে অত্যন্ত কার্যকর।',
    defaultSets: 1,
    defaultReps: 0,
    defaultDurationMin: 30,
    defaultRpe: 6,
    caloriesBurnedRatePerMin: 5.2,
  },
  {
    id: 'ex_squats',
    category: 'squats',
    nameEn: 'Bodyweight Squats',
    nameBn: 'বডিওয়েট স্কোয়াট (Squats)',
    descriptionEn: 'Feet shoulder-width apart, lowering hips back and down with chest tall and knees tracking toes.',
    descriptionBn: 'কাঁধ বরাবর পা রেখে কোমর ও নিতম্ব পেছনের দিকে নামিয়ে চেয়ারে বসার মতো স্কোয়াট করুন।',
    targetMusclesEn: 'Quadriceps, glutes, core, lower back',
    targetMusclesBn: 'উরু (Quadriceps), গ্লুটস ও তলপেট',
    benefitsEn: 'Builds large lower-body muscles which burn more resting calories and tighten the midsection.',
    benefitsBn: 'পায়ের বড় পেশী মজবুত করে, যা বিশ্রাম অবস্থায়ও বেশি ক্যালোরি পোড়ায়।',
    defaultSets: 3,
    defaultReps: 12,
    defaultDurationMin: 8,
    defaultRpe: 6,
    caloriesBurnedRatePerMin: 6.0,
  },
  {
    id: 'ex_push_ups',
    category: 'push_ups',
    nameEn: 'Push-ups / Incline Push-ups',
    nameBn: 'পুশ-আপ / ইনক্লাইন পুশ-আপ',
    descriptionEn: 'Plank position with hands slightly wider than shoulders. Beginners can use a raised bench or wall.',
    descriptionBn: 'হাত কাঁধ বরাবর রেখে শরীর সোজা রেখে বুক মেঝে বা টেবিলের দিকে নামিয়ে পুশ করুন।',
    targetMusclesEn: 'Pectorals (chest), triceps, anterior deltoids, core',
    targetMusclesBn: 'বুকের পেশী, ট্রাইসেপস ও পেটের কোর',
    benefitsEn: 'Strengthens upper body and activates the anterior core for natural posture support.',
    benefitsBn: 'বুকের ও বাহুর শক্তি বাড়ায় এবং সোজা হয়ে দাঁড়ানোর ভঙ্গি উন্নত করে।',
    defaultSets: 3,
    defaultReps: 10,
    defaultDurationMin: 6,
    defaultRpe: 7,
    caloriesBurnedRatePerMin: 6.5,
  },
  {
    id: 'ex_plank',
    category: 'plank',
    nameEn: 'Forearm Plank Hold',
    nameBn: 'প্ল্যাঙ্ক হোল্ড (Plank)',
    descriptionEn: 'Elbows under shoulders, core braced like taking a punch, body forming a rigid straight line.',
    descriptionBn: 'কনুই মাটিতে রেখে শরীর সোজা রডের মতো শক্ত করে পেট ভেতরের দিকে টেনে ধরে রাখুন।',
    targetMusclesEn: 'Transverse abdominis (deep core), obliques, glutes',
    targetMusclesBn: 'পেটের গভীর মাংসপেশী (Transverse Abdominis) ও পিঠ',
    benefitsEn: 'Draws in the visceral abdominal wall, acting like a natural corset to slim the waist circumference.',
    benefitsBn: 'কোমরের ভেতরের পেশী শক্ত করে পেটের ফোলাভাব ও কোমর কমাতে প্রাকৃতিক বেল্টের মতো কাজ করে।',
    defaultSets: 3,
    defaultReps: 30, // seconds
    defaultDurationMin: 5,
    defaultRpe: 7,
    caloriesBurnedRatePerMin: 4.5,
  },
  {
    id: 'ex_glute_bridge',
    category: 'glute_bridge',
    nameEn: 'Glute Bridge',
    nameBn: 'গ্লুট ব্রিজ (Glute Bridge)',
    descriptionEn: 'Lying on back with knees bent, feet flat, driving through heels to lift hips until thighs align with torso.',
    descriptionBn: 'চিৎ হয়ে শুয়ে হাঁটু ভাঁজ করে গোড়ালিতে ভর দিয়ে কোমর ও নিতম্ব ওপরের দিকে তুলুন।',
    targetMusclesEn: 'Gluteus maximus, hamstrings, lower back stabilizers',
    targetMusclesBn: 'নিতম্ব (Glutes), হ্যামস্ট্রিং ও কোমরের নিচের অংশ',
    benefitsEn: 'Re-activates dormant glute muscles from sitting all day, correcting anterior pelvic tilt.',
    benefitsBn: 'সারাদিন বসে থাকার কারণে অলস হয়ে পড়া নিতম্ব সচল করে এবং পিঠের ব্যথা দূর করে।',
    defaultSets: 3,
    defaultReps: 12,
    defaultDurationMin: 6,
    defaultRpe: 5,
    caloriesBurnedRatePerMin: 4.0,
  },
  {
    id: 'ex_stretching',
    category: 'stretching',
    nameEn: 'Desk Relief Mobility & Stretching',
    nameBn: 'ডেস্ক ওয়ার্কার স্ট্রেচিং ও মুভমেন্ট',
    descriptionEn: 'Hip flexor stretch, doorway chest opener, cat-cow and gentle spinal twists.',
    descriptionBn: 'হিপ ফ্লেক্সর স্ট্রেচ, বুকের প্রসারণ, ক্যাট-কাউ এবং মেরুদণ্ডের হালকা ঘূর্ণন।',
    targetMusclesEn: 'Hip flexors, pectorals, thoracic spine, neck',
    targetMusclesBn: 'হিপস, ঘাড়, কাঁধ ও মেরুদণ্ড',
    benefitsEn: 'Relieves stiffness from 8+ hours of desk work, improves blood flow and digestion.',
    benefitsBn: '৮ ঘণ্টার বেশি ডেস্কে বসার জড়তা দূর করে এবং রক্ত সঞ্চালন বাড়ায়।',
    defaultSets: 1,
    defaultReps: 0,
    defaultDurationMin: 10,
    defaultRpe: 3,
    caloriesBurnedRatePerMin: 2.8,
  }
];
