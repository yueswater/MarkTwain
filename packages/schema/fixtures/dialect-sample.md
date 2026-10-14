# 緒論 {#cha:intro}

這是一段含 **粗體**、*斜體*、~~刪除線~~、`行內程式碼` 與 [連結](https://example.com) 的文字。能量 $E=mc^2$ 守恆，見 @eq:energy 與 @fig:arch，如 [@wang2020; @lee2021] 所示，@chen2019 指出[^1]。

$$
E = mc^2
$$ {#eq:energy}

## 方法 {#sec:method}

- 項目一
- 項目二
  - 巢狀項目

1. 步驟一
2. 步驟二

> 引言一行。

第一行\
第二行

```python {#lst:sort caption=排序}
print("hello")
```

![系統架構](figures/arch.png){#fig:arch width=60%}

::: {#fig:row .figrow}
![甲](figures/a.png)

![乙](figures/b.png)

函數圖形比較
:::

| 方法 | 結果 |
| :--- | ---: |
| A | 1 |
| B | 2 |

: 實驗結果 {#tbl:result notes=資料來源：自行整理}

| 項目 | 數值 | 備註 |
| :--- | :---: | ---: |
| 合併 |  |  |
| 甲 | 乙 | 丙 |
|  | 己 | 戊 |

: 合併儲存格與版面 {#tbl:layout cells=2.1:colspan=3;3.1:rowspan=2,valign=top heights=2:24pt style=grid widths=20%,auto,30%}

::: {.abstract-zh}
摘要內容。
:::

PDF
: 編譯後輸出的文件格式

---

[^1]: 這是腳註 **內容**
