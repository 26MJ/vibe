import { expect, test } from "@playwright/test";

test("demo F1 states and search behavior", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "영화 박스오피스 인사이트" })).toBeVisible();
  await expect(page.getByRole("table").first()).toBeVisible();
  await page.getByLabel("영화명 검색").fill("바다");
  await expect(page.getByRole("cell", { name: "바다의 노래" })).toBeVisible();
  await page.getByLabel("영화명 검색").fill("없는 제목");
  await expect(page.getByRole("heading", { name: "'없는 제목' 검색 결과가 없습니다." })).toBeVisible();
  await page.getByLabel("영화명 검색").fill("");
  await page.getByLabel("조회 날짜").fill("2026-09-06");
  await expect(page.getByRole("heading", { name: "해당 기간의 박스오피스 데이터가 없습니다." })).toBeVisible();
  await page.locator('select[aria-label="demo 상태"]').selectOption("loading");
  await expect(page.getByRole("heading", { name: "박스오피스 정보를 불러오는 중입니다." })).toBeVisible();
  await page.locator('select[aria-label="demo 상태"]').selectOption("error");
  await expect(page.locator('.status-panel[role="alert"]')).toContainText("박스오피스 정보를 불러오지 못했습니다.");
});
