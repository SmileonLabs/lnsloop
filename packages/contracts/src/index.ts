import { z } from "zod";
export const kinds = [
  "steps",
  "distance",
  "activeCalories",
  "totalCalories",
  "exercise",
  "sleep",
  "heartRate",
  "restingHeartRate",
  "hrv",
  "height",
  "weight",
  "bodyFat",
  "bloodPressure",
  "bloodGlucose",
  "oxygenSaturation",
  "respiratoryRate",
  "temperature",
  "nutrition",
  "hydration",
] as const;
export const localized = z.object({
  en: z.string().min(1),
  ko: z.string().min(1),
});
export const question = z
  .object({
    id: z.string().min(1),
    label: localized,
    options: z.array(z.string().min(1)).min(2),
    eligibleAnswer: z.string().optional(),
  })
  .refine(
    (q) => !q.eligibleAnswer || q.options.includes(q.eligibleAnswer),
    "Eligible answer must be an option",
  );
export const studySchema = z
  .object({
    title: localized,
    description: localized,
    recipient: z.string().min(1),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    types: z.array(z.enum(kinds)).min(1),
    consent: localized,
    consentItems: z
      .array(
        z.object({
          id: z.string().min(1),
          label: localized,
          required: z.boolean(),
        }),
      )
      .optional(),
    retentionDays: z.number().int().positive(),
    points: z.number().int().min(0).max(10000),
    surveyPoints: z.number().int().min(0).max(10000),
    periodDays: z.number().int().min(1).max(30),
    autoApprove: z.boolean(),
    minimumRecords: z.number().int().positive(),
    eligibility: z.array(question),
    survey: z.array(question),
    testOnly: z.boolean().default(false),
  })
  .refine(
    (x) => Date.parse(x.endsAt) > Date.parse(x.startsAt),
    "End must follow start",
  )
  .refine(
    (s) =>
      [s.eligibility, s.survey].every(
        (qs) => new Set(qs.map((q) => q.id)).size === qs.length,
      ),
    "Question IDs must be unique",
  );
export type StudyConfig = z.infer<typeof studySchema>;
export type Study = {
  id: string;
  version: number;
  status: "draft" | "published" | "closed";
  config: StudyConfig;
};
const finite = z.number().finite();
const positive = finite.nonnegative();
const payloads: Record<string, z.ZodTypeAny> = {
  steps: z.object({ count: positive.int() }).strict(),
  distance: z.object({ distance: positive }).strict(),
  activeCalories: z.object({ energy: positive }).strict(),
  totalCalories: z.object({ energy: positive }).strict(),
  exercise: z.object({ exerciseType: positive.int() }).strict(),
  sleep: z
    .object({
      stages: z
        .array(
          z
            .object({
              start: z.string().datetime(),
              end: z.string().datetime(),
              stage: positive.int(),
            })
            .strict(),
        )
        .max(10000),
    })
    .strict(),
  heartRate: z
    .object({
      samples: z
        .array(
          z.object({ time: z.string().datetime(), bpm: positive }).strict(),
        )
        .max(100000),
    })
    .strict(),
  restingHeartRate: z.object({ bpm: positive }).strict(),
  hrv: z.union([
    z.object({ rmssd: positive }).strict(),
    z.object({ sdnn: positive }).strict(),
  ]),
  height: z.object({ height: positive }).strict(),
  weight: z.object({ weight: positive }).strict(),
  bodyFat: z.object({ percentage: positive.max(100) }).strict(),
  bloodPressure: z.object({ systolic: positive, diastolic: positive }).strict(),
  bloodGlucose: z.object({ level: positive }).strict(),
  oxygenSaturation: z.object({ percentage: positive.max(100) }).strict(),
  respiratoryRate: z.object({ rate: positive }).strict(),
  temperature: z.object({ temperature: finite }).strict(),
  nutrition: z
    .object({
      energyKcal: positive.nullable(),
      proteinGrams: positive.nullable(),
      carbohydrateGrams: positive.nullable(),
      fatGrams: positive.nullable(),
    })
    .strict(),
  hydration: z.object({ volume: positive }).strict(),
};
const units: Record<string, string> = {
  steps: "count",
  distance: "m",
  activeCalories: "kcal",
  totalCalories: "kcal",
  exercise: "session",
  sleep: "session",
  heartRate: "bpm",
  restingHeartRate: "bpm",
  hrv: "ms",
  height: "m",
  weight: "kg",
  bodyFat: "percent",
  bloodPressure: "mmHg",
  bloodGlucose: "mmol/L",
  oxygenSaturation: "percent",
  respiratoryRate: "perMinute",
  temperature: "celsius",
  nutrition: "mixed",
  hydration: "liters",
};
export const healthRecord = z
  .object({
    id: z.string().min(1).max(200),
    type: z.enum(kinds),
    start: z.string().datetime(),
    end: z.string().datetime(),
    origin: z.string().min(1).max(200),
    unit: z.string().max(80),
    value: z.record(z.unknown()),
    zoneOffset: z.string().max(80).optional(),
    device: z.string().max(200).optional(),
    recordingMethod: z.string().max(80).optional(),
    clipped: z.boolean().optional(),
    platform: z.enum(["android", "ios"]).optional(),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (
      r.unit !== units[r.type] ||
      !payloads[r.type].safeParse(r.value).success
    )
      ctx.addIssue({ code: "custom", message: "Invalid typed health payload" });
    const start = Date.parse(r.start),
      end = Date.parse(r.end);
    if (end < start)
      ctx.addIssue({ code: "custom", message: "Invalid record time range" });
    if (
      r.type === "heartRate" &&
      Array.isArray(r.value.samples) &&
      r.value.samples.some(
        (s: any) => Date.parse(s.time) < start || Date.parse(s.time) > end,
      )
    )
      ctx.addIssue({ code: "custom", message: "Sample outside record" });
    if (
      r.type === "sleep" &&
      Array.isArray(r.value.stages) &&
      r.value.stages.some(
        (s: any) =>
          Date.parse(s.start) < start ||
          Date.parse(s.end) > end ||
          Date.parse(s.end) < Date.parse(s.start),
      )
    )
      ctx.addIssue({ code: "custom", message: "Stage outside record" });
  });
export type HealthRecord = z.infer<typeof healthRecord>;
export const submissionSchema = z.object({
  mode: z.enum(["manual", "automatic"]).optional(),
  studyId: z.string().uuid(),
  version: z.number().int(),
  activity: z.enum(["health", "survey"]),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  records: z.array(healthRecord).max(10000).default([]),
  answers: z.record(z.string()).default({}),
});
export type SubmissionInput = z.infer<typeof submissionSchema>;
export interface HealthDataProvider {
  availability(): Promise<{ available: boolean; reason?: string }>;
  permissions(types: readonly string[]): Promise<string[]>;
  requestPermissions(types: readonly string[]): Promise<string[]>;
  read(
    types: readonly string[],
    start: string,
    end: string,
  ): Promise<HealthRecord[]>;
  aggregate(
    types: readonly string[],
    start: string,
    end: string,
  ): Promise<Record<string, number | null>>;
  openSettings(): Promise<void>;
  changesToken(types: readonly string[]): Promise<string | null>;
  changes(
    token: string,
  ): Promise<{
    nextToken: string;
    hasMore: boolean;
    expired: boolean;
    changes: unknown[];
  }>;
}
