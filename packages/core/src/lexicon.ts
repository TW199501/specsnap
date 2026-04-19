/**
 * Bilingual lexicon — maps CSS property names to Traditional Chinese annotations.
 * First-class schema feature (P3 of the design). Override via SerializeOptions.lexiconOverride.
 */
export const DEFAULT_LEXICON: Readonly<Record<string, string>> = Object.freeze({
  // Box model
  'padding': '內邊距',
  'padding-top': '上內邊距',
  'padding-right': '右內邊距',
  'padding-bottom': '下內邊距',
  'padding-left': '左內邊距',
  'margin': '外邊距',
  'margin-top': '上外邊距',
  'margin-right': '右外邊距',
  'margin-bottom': '下外邊距',
  'margin-left': '左外邊距',
  'border': '邊框',
  'border-width': '邊框寬度',
  'border-style': '邊框樣式',
  'border-color': '邊框顏色',
  'border-radius': '圓角',

  // Sizing
  'width': '寬度',
  'height': '高度',
  'min-width': '最小寬度',
  'min-height': '最小高度',
  'max-width': '最大寬度',
  'max-height': '最大高度',

  // Typography
  'color': '文字顏色',
  'font-family': '字體',
  'font-size': '字體大小',
  'font-weight': '字重',
  'font-style': '字型樣式',
  'line-height': '行高',
  'letter-spacing': '字距',
  'text-align': '對齐方式',
  'text-decoration': '文字裝飾',
  'text-transform': '文字轉換',

  // Background
  'background': '背景',
  'background-color': '背景色',
  'background-image': '背景圖',

  // Layout
  'display': '顯示模式',
  'position': '定位方式',
  'top': '上偏移',
  'right': '右偏移',
  'bottom': '下偏移',
  'left': '左偏移',
  'z-index': '層級',
  'overflow': '溢出處理',
  'visibility': '可見性',

  // Flex / Grid
  'flex': '彈性排版',
  'flex-direction': '主軸方向',
  'flex-wrap': '換行',
  'gap': '間距',
  'justify-content': '主軸對齊',
  'align-items': '交叉軸對齊',

  // Visual
  'box-shadow': '陰影',
  'opacity': '不透明度',
  'transform': '變形',
  'transition': '過渡效果',
  'cursor': '游標樣式',

  // Interaction
  'pointer-events': '指標事件',
  'user-select': '文字選取'
});

/**
 * Resolve a CSS property to its bilingual annotation.
 *
 * @param property the CSS property name (case-insensitive)
 * @param override optional user-supplied overrides (keys MUST be lowercase)
 * @returns the Chinese translation, or '' if unknown
 */
export function annotate(
  property: string,
  override?: Readonly<Record<string, string>>
): string {
  const key = property.toLowerCase();
  if (override && key in override) return override[key]!;
  return DEFAULT_LEXICON[key] ?? '';
}
