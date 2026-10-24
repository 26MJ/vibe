import { describe, expect, it } from "vitest";
import { dailyBoxOfficeFixture } from "@/test/fixtures/kobis-box-office";

describe("project foundation", () => {
  it("provides a KOBIS string-value fixture for later API tests", () => {
    expect(dailyBoxOfficeFixture.boxOfficeResult.dailyBoxOfficeList[0].salesAmt).toBe("120000000");
  });
});
