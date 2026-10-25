import { describe, expect, it } from "vitest";
import { dailyBoxOfficeFixture } from "@/test/fixtures/kobis-box-office";
import { getDemoBoxOffice, isDemoDate } from "@/lib/demo-box-office";

describe("project foundation", () => {
  it("provides a KOBIS string-value fixture for later API tests", () => {
    expect(dailyBoxOfficeFixture.boxOfficeResult.dailyBoxOfficeList[0].salesAmt).toBe("120000000");
  });

  it("returns demo records only inside the sample date range", () => {
    expect(isDemoDate("2026-09-07")).toBe(true);
    expect(isDemoDate("2026-09-13")).toBe(true);
    expect(getDemoBoxOffice("2026-09-06", "daily")).toEqual([]);
  });

  it("includes a movie that can be found with the 바다 query", () => {
    expect(getDemoBoxOffice("2026-09-07", "daily").map((record) => record.movieName)).toContain("바다의 노래");
  });
});
