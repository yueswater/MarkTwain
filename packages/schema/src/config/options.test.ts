import { describe, expect, it } from "@jest/globals";
import { SCHOOLS } from "./schools";
import { collegesOf, departmentsOf, findCollege, findDepartment } from "./options";

describe("college and department options", () => {
  it("every school preset has colleges with departments", () => {
    for (const school of SCHOOLS) {
      const colleges = collegesOf(school.code);
      expect(colleges.length).toBeGreaterThan(0);
      expect(colleges.every((c) => c.zh !== "" && c.departments.length > 0)).toBe(true);
    }
  });

  it("looks up English names by the Chinese ones", () => {
    const college = collegesOf("ntu")[0];
    expect(college).toBeDefined();
    expect(findCollege("ntu", college!.zh)?.en).toBe(college!.en);
    const department = departmentsOf("ntu", college!.zh)[0];
    expect(findDepartment("ntu", department!.zh)?.en).toBe(department!.en);
  });

  it("returns nothing for an unknown school or college", () => {
    expect(collegesOf("none")).toEqual([]);
    expect(departmentsOf("ntu", "不存在")).toEqual([]);
    expect(findDepartment("none", "x")).toBeUndefined();
  });
});
