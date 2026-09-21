import { test, expect } from "@playwright/test";
test("patient enrollment, unsupported platform, survey and earned points", async ({
  page,
  request,
}) => {
  const admin = await (
    await request.post("http://localhost:4000/auth/test", {
      data: { subject: "operator" },
    })
  ).json();
  const headers = { Authorization: "Bearer " + admin.token };
  const config = {
    title: { en: "Daily wellbeing test", ko: "일상 기록 테스트" },
    description: { en: "Synthetic study for testing", ko: "검증용 합성 연구" },
    recipient: "Test Lab",
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2030-01-01T00:00:00.000Z",
    types: ["steps"],
    consent: { en: "Test-only participation", ko: "테스트 참여 동의" },
    retentionDays: 1,
    points: 40,
    surveyPoints: 10,
    periodDays: 1,
    autoApprove: true,
    minimumRecords: 1,
    eligibility: [],
    survey: [
      {
        id: "q",
        label: { en: "How was your day?", ko: "오늘 컨디션은?" },
        options: ["Good", "Okay"],
      },
    ],
    testOnly: true,
  };
  const s = await (
    await request.post("http://localhost:4000/admin/studies", {
      headers,
      data: config,
    })
  ).json();
  await request.post(`http://localhost:4000/admin/studies/${s.id}/status`, {
    headers,
    data: { status: "published", approvalReference: "TEST ONLY" },
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("http://localhost:8081");
  await page
    .getByRole("button", { name: "Development test account", exact: true })
    .click();
  await expect(page.getByText("Your next step", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: /Research/ }).click();
  await page.getByText("Daily wellbeing test", { exact: true }).waitFor();
  const card = page
    .getByText("Daily wellbeing test", { exact: true })
    .locator("..");
  await card.getByRole("button", { name: "View details" }).click();
  await page.getByRole("button", { name: "Join study", exact: true }).click();
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Join study", exact: true }).click();
  await expect(
    page.getByText(/Health Connect is unavailable here/),
  ).toBeVisible();
  await page.getByRole("button", { name: /Back/ }).click();
  await page
    .getByRole("button", { name: "Complete survey", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "Good", exact: true }).click();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(
    page.getByText("Submission received", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Back/ }).click();
  await page.getByRole("button", { name: /Back/ }).click();
  await page.getByRole("tab", { name: /Points/ }).click();
  await expect(page.getByText("+10 P", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/patient-points.png",
    fullPage: true,
  });
});
