import { test, expect } from "@playwright/test";
test("operator signs in, creates a draft, publishes and reviews a real submission", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "개발 테스트 운영자 로그인" }).click();
  await expect(page.getByRole("heading", { name: "연구 관리" })).toBeVisible();
  await page.getByLabel("title (ko)", { exact: true }).fill("활동 연구 테스트");
  await page
    .getByLabel("title (en)", { exact: true })
    .fill("Activity research test");
  for (const key of ["description", "consent"])
    for (const lang of ["ko", "en"])
      await page
        .getByLabel(`${key} (${lang})`, { exact: true })
        .fill("Test-only study, no participant data.");
  await page.getByLabel("제공 기관", { exact: true }).fill("Test Lab");
  await page
    .getByLabel("startsAt", { exact: true })
    .fill("2026-01-01T00:00:00.000Z");
  await page
    .getByLabel("endsAt", { exact: true })
    .fill("2030-01-01T00:00:00.000Z");
  await page.getByLabel("points", { exact: true }).fill("40");
  await page.getByRole("button", { name: "초안 저장" }).click();
  await expect(
    page.getByRole("heading", { name: "활동 연구 테스트" }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept("TEST ONLY"));
  await page.getByRole("button", { name: "발행", exact: true }).click();
  await expect(page.getByText("published · v1 · 40 P")).toBeVisible();
  const auth = await (
    await request.post("http://localhost:4000/auth/test", {
      data: { subject: "browser-participant" },
    })
  ).json();
  const headers = { Authorization: `Bearer ${auth.token}` };
  const studies = await (
    await request.get("http://localhost:4000/studies", { headers })
  ).json();
  const s = studies[0];
  await request.post("http://localhost:4000/enrollments", {
    headers,
    data: { studyId: s.id, version: 1, accepted: true, answers: {} },
  });
  const w = await (
    await request.get(`http://localhost:4000/studies/${s.id}/window`, {
      headers,
    })
  ).json();
  await request.post("http://localhost:4000/submissions", {
    headers,
    data: {
      studyId: s.id,
      version: 1,
      activity: "health",
      periodStart: w.start,
      periodEnd: w.end,
      records: [
        {
          id: "browser-record",
          type: "steps",
          start: w.start,
          end: w.start,
          origin: "synthetic",
          unit: "count",
          value: { count: 100 },
        },
      ],
    },
  });
  await page.getByRole("button", { name: "제출 검토", exact: true }).click();
  await expect(page.getByText("pending", { exact: true })).toBeVisible();
  page.once("dialog", (d) => d.accept("Synthetic record reviewed"));
  await page.getByRole("button", { name: "approved", exact: true }).click();
  await expect(
    page.getByText("approved", { exact: true }).first(),
  ).toBeVisible();
  const points = await (
    await request.get("http://localhost:4000/points", { headers })
  ).json();
  expect(points.total).toBe(40);
  await page.screenshot({ path: "test-results/admin.png", fullPage: true });
});
