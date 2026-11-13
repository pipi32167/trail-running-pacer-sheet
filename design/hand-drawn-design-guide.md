---
title: "手绘风格 · Hand-Drawn"
slug: hand-drawn
category: 自然与人文 / Natural & Human
era: 2012 —
tags: [手写, 抖线, 涂鸦, 亲和]
updated: 2026-10-26
---

# 手绘风格 · Hand-Drawn

> 像在纸上画出来：抖动的线条、手写字体、荧光笔高亮与随手贴的便签。

| 项目 | 内容 |
| --- | --- |
| 类别 | 自然与人文（Natural & Human） |
| 年代 | 2012 — |
| 关键词 | 手写 · 抖线 · 涂鸦 · 亲和 |
| 主色 | `#2a4d9b` | 
| 底色 | `#fbf7ef` |
| 圆角 | 6px / 10px |
| 控制高度 | 42px |

## 1. 视觉特征

- 边框不规则：用 SVG 描边或轻微旋转模拟手绘。
- 字体：手写体只用于标题与短标签。
- 高亮用半透明荧光色块（模仿马克笔）。
- 图形为线稿，线条粗细略有变化。

## 2. 适用与慎用

**适合：** 教育与儿童、创意工具、工作坊与社区、个人博客。

**慎用：** 金融医疗、需要权威感的机构站、高密度表单。

## 3. 设计令牌（CSS Variables）

### 色彩与语义

角色化命名，主题切换只改这一层。

| 令牌 | CSS 属性 | 值 |
| --- | --- | --- |
| `--color-bg` | background-color | `#fbf7ef` |
| `--color-surface` | background-color | `#ffffff` |
| `--color-surface-alt` | background-color | `#f4eee1` |
| `--color-fg` | color | `#23201c` |
| `--color-muted` | color | `#5e594f` |
| `--color-primary` | background-color | `#2a4d9b` |
| `--color-on-primary` | color | `#ffffff` |
| `--color-accent` | background-color | `#e0533c` |
| `--color-accent-2` | background-color | `#e0b23c` |
| `--color-border` | border-color | `#23201c` |
| `--color-disabled` | background-color | `#ece5d8` |
| `--color-on-disabled` | color | `#9b9487` |

### 字体与排版

展示字体只用于标题，正文与数字各有一档。

| 令牌 | CSS 属性 | 值 |
| --- | --- | --- |
| `--font-display` | font-family | `"Instrument Serif", "Songti SC", "Georgia", serif` |
| `--font-body` | font-family | `"Schibsted Grotesk", ui-sans-serif, system-ui, "PingFang SC", sans-serif` |
| `--font-mono` | font-family | `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace` |
| `--type-weight-display` | font-weight | `600` |
| `--type-tracking` | letter-spacing | `0.01em` |
| `--type-transform` | text-transform | `none` |
| `--type-leading` | line-height | `1.7` |

### 形状与层次

圆角、描边、阴影、模糊共同决定材质手感。

| 令牌 | CSS 属性 | 值 |
| --- | --- | --- |
| `--radius-control` | border-radius | `6px` |
| `--radius-card` | border-radius | `10px` |
| `--border-width` | border-width | `2px` |
| `--shadow-control` | box-shadow | `2px 2px 0 rgba(35,32,28,.85)` |
| `--shadow-card` | box-shadow | `3px 3px 0 rgba(35,32,28,.75)` |
| `--backdrop-blur` | backdrop-filter | `none` |

### 间距与尺寸

4 的倍数起步，密度由 --space-* 统一调节。

| 令牌 | CSS 属性 | 值 |
| --- | --- | --- |
| `--space-1` | padding | `4px` |
| `--space-2` | padding | `8px` |
| `--space-3` | padding | `12px` |
| `--space-4` | padding | `16px` |
| `--space-5` | padding | `24px` |
| `--space-6` | padding | `32px` |
| `--size-control` | height | `42px` |
| `--control-padding-x` | padding-inline | `16px` |

### 按钮 · Button

组件私有变量，全部引用语义层，不写死色值。

| 令牌 | CSS 属性 | 值 |
| --- | --- | --- |
| `--button-bg` | background-color | `var(--color-accent-2)` |
| `--button-fg` | color | `#23201c` |
| `--button-radius` | border-radius | `var(--radius-control)` |
| `--button-height` | height | `var(--size-control)` |
| `--button-padding-x` | padding-inline | `var(--control-padding-x)` |
| `--button-border` | border | `2px solid #23201c` |
| `--button-shadow` | box-shadow | `var(--shadow-control)` |
| `--button-hover-bg` | background-color | `#294584` |
| `--button-disabled-bg` | background-color | `var(--color-disabled)` |

### 输入框 · Input

与按钮共用圆角与高度，保证行内对齐。

| 令牌 | CSS 属性 | 值 |
| --- | --- | --- |
| `--input-bg` | background-color | `#fffdf7` |
| `--input-border` | border | `2px dashed #23201c` |
| `--input-radius` | border-radius | `var(--radius-control)` |
| `--input-height` | height | `var(--size-control)` |
| `--input-padding-x` | padding-inline | `var(--control-padding-x)` |
| `--input-shadow` | box-shadow | `none` |
| `--input-blur` | backdrop-filter | `var(--backdrop-blur)` |

### 卡片 · Card

页面级容器，阴影与描边二者只取其一为主。

| 令牌 | CSS 属性 | 值 |
| --- | --- | --- |
| `--card-bg` | background-color | `var(--color-surface)` |
| `--card-border` | border | `var(--border-width) solid var(--color-border)` |
| `--card-radius` | border-radius | `var(--radius-card)` |
| `--card-shadow` | box-shadow | `var(--shadow-card)` |
| `--card-padding` | padding | `var(--space-4)` |
| `--card-blur` | backdrop-filter | `var(--backdrop-blur)` |


```css
:root {
  /* 色彩与语义 · Color & Semantic */
  --color-bg: #fbf7ef;
  --color-surface: #ffffff;
  --color-surface-alt: #f4eee1;
  --color-fg: #23201c;
  --color-muted: #5e594f;
  --color-primary: #2a4d9b;
  --color-on-primary: #ffffff;
  --color-accent: #e0533c;
  --color-accent-2: #e0b23c;
  --color-border: #23201c;
  --color-disabled: #ece5d8;
  --color-on-disabled: #9b9487;

  /* 字体与排版 · Typography */
  --font-display: "Instrument Serif", "Songti SC", "Georgia", serif;
  --font-body: "Schibsted Grotesk", ui-sans-serif, system-ui, "PingFang SC", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --type-weight-display: 600;
  --type-tracking: 0.01em;
  --type-transform: none;
  --type-leading: 1.7;

  /* 形状与层次 · Shape & Elevation */
  --radius-control: 6px;
  --radius-card: 10px;
  --border-width: 2px;
  --shadow-control: 2px 2px 0 rgba(35,32,28,.85);
  --shadow-card: 3px 3px 0 rgba(35,32,28,.75);
  --backdrop-blur: none;

  /* 间距与尺寸 · Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --size-control: 42px;
  --control-padding-x: 16px;

  /* 按钮 · Button · Component */
  --button-bg: var(--color-accent-2);
  --button-fg: #23201c;
  --button-radius: var(--radius-control);
  --button-height: var(--size-control);
  --button-padding-x: var(--control-padding-x);
  --button-border: 2px solid #23201c;
  --button-shadow: var(--shadow-control);
  --button-hover-bg: #294584;
  --button-disabled-bg: var(--color-disabled);

  /* 输入框 · Input · Component */
  --input-bg: #fffdf7;
  --input-border: 2px dashed #23201c;
  --input-radius: var(--radius-control);
  --input-height: var(--size-control);
  --input-padding-x: var(--control-padding-x);
  --input-shadow: none;
  --input-blur: var(--backdrop-blur);

  /* 卡片 · Card · Component */
  --card-bg: var(--color-surface);
  --card-border: var(--border-width) solid var(--color-border);
  --card-radius: var(--radius-card);
  --card-shadow: var(--shadow-card);
  --card-padding: var(--space-4);
  --card-blur: var(--backdrop-blur);
}
```

## 4. 组件实现

```css
/* 按钮 · Button */
.button {
  background-color: var(--button-bg);
  color: var(--button-fg);
  border: var(--button-border);
  border-radius: var(--button-radius);
  height: var(--button-height);
  padding-inline: var(--button-padding-x);
  box-shadow: var(--button-shadow);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: var(--type-tracking);
  text-transform: var(--type-transform);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background-color .18s ease, box-shadow .18s ease, transform .18s ease;
}
.button:hover { background-color: var(--button-hover-bg); }
.button:active { transform: translateY(1px); }
.button:disabled { background-color: var(--button-disabled-bg); color: var(--color-on-disabled); cursor: not-allowed; }

/* 输入框 · Input */
.input {
  background-color: var(--input-bg);
  color: var(--color-fg);
  border: var(--input-border);
  border-radius: var(--input-radius);
  height: var(--input-height);
  padding-inline: var(--input-padding-x);
  box-shadow: var(--input-shadow);
  backdrop-filter: var(--input-blur);
  font-family: var(--font-body);
  font-size: 14px;
  width: 100%;
}
.input::placeholder { color: var(--color-muted); }
.input:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

/* 卡片 · Card */
.card {
  background-color: var(--card-bg);
  border: var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  backdrop-filter: var(--card-blur);
  padding: var(--card-padding);
  color: var(--color-fg);
}
```

## 5. 实施要点

1. 用 `filter: url(#roughen)` 或 SVG 手绘边框替代 border。
2. 高亮：`background: linear-gradient(transparent 55%, rgba(255,224,102,.6) 55%)`。
3. 控件加 0.5° 旋转，最多不超过 1.5°。
4. 正文回到 16px 系统无衬线，行高 1.7。

## 6. 常见反例

- 手写体用于正文，可读性极差。
- 抖线做得过于规整，像普通圆角框。
- 荧光色过多，画面变脏。

## 7. 参考

- Wabi-sabi 与日本民艺运动
- Risograph 印刷工艺手册
- 北欧色彩体系（NCS）
