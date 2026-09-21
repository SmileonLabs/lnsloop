import type { Study, SubmissionInput } from "@loop/contracts";
import { health, readPrivate, writePrivate } from "./health";
import { ApiError } from "./session";
type Request = (path: string, method?: string, body?: unknown) => Promise<any>;
export async function prepareContribution(
  request: Request,
  study: Study,
): Promise<SubmissionInput> {
  const w = await request("/studies/" + study.id + "/window");
  const end = new Date(Math.min(Date.parse(w.end), Date.now())).toISOString();
  if (Date.parse(w.start) > Date.now())
    throw new Error("Study has not started");
  const records = (await health.read(study.config.types, w.start, end)).filter(
    (r) =>
      Date.parse(r.start) >= Date.parse(w.start) &&
      Date.parse(r.end) <= Date.parse(end),
  );
  return {
    studyId: study.id,
    version: study.version,
    activity: "health",
    periodStart: w.start,
    periodEnd: w.end,
    records,
    answers: {},
  };
}
export async function submitContribution(
  request: Request,
  userId: string,
  payload: SubmissionInput,
) {
  try {
    return await request("/submissions", "POST", payload);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    const key = "queue-" + userId;
    const existing: SubmissionInput[] = (await readPrivate(key)) ?? [];
    await writePrivate(key, [
      ...existing.filter(
        (p) =>
          !(
            p.studyId === payload.studyId &&
            p.activity === payload.activity &&
            p.periodStart === payload.periodStart
          ),
      ),
      payload,
    ]);
    return { status: "queued", points: 0 };
  }
}
