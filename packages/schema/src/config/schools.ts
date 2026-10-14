/** 兩個模板內建的學校預設（`schools/*.yml`）；名稱取自各檔的 `university` 欄位。 */
export type School = { code: string; name: string; nameEn: string };

export const SCHOOLS: readonly School[] = [
  { code: "ccu", name: "國立中正大學", nameEn: "National Chung Cheng University" },
  { code: "nccu", name: "國立政治大學", nameEn: "National Chengchi University" },
  { code: "nchu", name: "國立中興大學", nameEn: "National Chung Hsing University" },
  { code: "ncku", name: "國立成功大學", nameEn: "National Cheng Kung University" },
  { code: "ncu", name: "國立中央大學", nameEn: "National Central University" },
  { code: "ncue", name: "國立彰化師範大學", nameEn: "National Changhua University of Education" },
  { code: "nknu", name: "國立高雄師範大學", nameEn: "National Kaohsiung Normal University" },
  { code: "nsysu", name: "國立中山大學", nameEn: "National Sun Yat-sen University" },
  { code: "nthu", name: "國立清華大學", nameEn: "National Tsing Hua University" },
  { code: "ntnu", name: "國立臺灣師範大學", nameEn: "National Taiwan Normal University" },
  { code: "ntou", name: "國立臺灣海洋大學", nameEn: "National Taiwan Ocean University" },
  { code: "ntpu", name: "國立臺北大學", nameEn: "National Taipei University" },
  { code: "ntu", name: "國立臺灣大學", nameEn: "National Taiwan University" },
  { code: "nuk", name: "國立高雄大學", nameEn: "National University of Kaohsiung" },
  { code: "nycu", name: "國立陽明交通大學", nameEn: "National Yang Ming Chiao Tung University" },
];

export function isKnownSchool(code: string): boolean {
  return SCHOOLS.some((school) => school.code === code);
}
