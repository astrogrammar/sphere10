# Sphere10.js リファクタリング計画

## 現状分析

- **総行数**: 1950行
- **関数数**: 47個
- **主な問題点**:
  1. 1つの巨大な `initApp()` 関数（約1780行）
  2. 関数のネストが深い（内部関数が多数）
  3. グローバルスコープとローカルスコープの混在
  4. マジックナンバーの多用
  5. コメントの不統一

## リファクタリング方針

### 1. **定数の抽出** ✅ 優先度: 高
- マジックナンバーを定数化
- 設定値を一箇所に集約

```javascript
// 例
const CONSTANTS = {
  CANVAS_SCALE_FACTOR: 0.35,
  ZOOM_MIN: 0.1,
  ZOOM_MAX: 10,
  STAR_SIZE_FACTOR: 0.8,
  // ...
};
```

### 2. **関数の整理とグループ化** ✅ 優先度: 高
現在の関数を論理的なグループに分類:

#### A. 座標変換・数学関数
- `toHorizontal()`
- `rotateZaxis()`, `rotateXaxis()`, `rotateYaxis()`
- `applyAllRotations()`
- `project()`

#### B. データ変換・パース
- `convertRA()`
- `convertDec()`

#### C. 描画関数
- `drawStars()`, `drawSun()`, `drawMoon()`, `drawPlanets()`
- `drawHorizon()`, `drawAltitudeGrid()`
- `drawGreatCircle()`, `drawMeridian()`, `drawEquator()`, `drawEcliptic()`
- `drawEclipticBand()`, `drawZodiacDivisions()`, `drawZodiacSymbols()`
- `drawRA12Lines()`, `drawDeclinationLines()`
- `drawCardinalDirections()`, `drawZenithNadir()`

#### D. UI・設定管理
- `saveSettings()`, `loadSettings()`
- `getStoredBoolean()`, `setStoredBoolean()`, `normalizeStoredBoolean()`
- `setupPersistentToggle()`, `migrateZenithNadirPreference()`
- `updateAllUI()`, `initSectionToggles()`

#### E. デバッグ
- `createDebugPanel()`, `updateDebugInfo()`

#### F. イベント・制御
- `setActiveButton()`
- `changeDateByDays()`, `startDateControl()`, `stopDateControl()`
- `updateDateControlButtons()`, `resetToToday()`
- `initDateNavigationControls()`

#### G. レンダリング制御
- `requestRender()`, `renderFrame()`

#### H. データロード
- `loadStars()`, `initStars()`
- `updateAllPositions()`

### 3. **コメントの整理** ✅ 優先度: 中
- デバッグコメント（`// ★ ADDED`, `// ★ FIXED`）を整理
- JSDoc形式のコメントに統一
- セクション区切りを統一

### 4. **コードの重複削減** ✅ 優先度: 中
- 類似パターンの抽出
- ヘルパー関数の作成

### 5. **パフォーマンス最適化** ⚠️ 優先度: 低（今回は見送り）
- 現状で問題なし
- 将来的な課題として記録

## 実行計画

### Phase 1: 定数の抽出
1. マジックナンバーを特定
2. `CONSTANTS` オブジェクトを作成
3. 全ての参照を置換

### Phase 2: コメントの整理
1. デバッグコメントを削除または統一
2. セクション区切りを統一
3. 複雑な処理にJSDocを追加

### Phase 3: 関数の整理（軽微）
1. 内部関数の必要性を検討
2. 不要なネストを削減
3. 関数の順序を論理的に整理

### Phase 4: テスト
1. 構文チェック
2. ブラウザでの動作確認
3. 全機能のテスト

## 注意事項

- **破壊的変更は避ける**: 既存の動作を保持
- **段階的に実行**: 各変更後にテスト
- **バックアップ**: 各段階でコミット
- **mainにマージしない**: `manus/depth-shading` ブランチで作業

## 期待される効果

1. **可読性向上**: コードが理解しやすくなる
2. **保守性向上**: 変更が容易になる
3. **バグ削減**: 構造が明確になる
4. **次のベース**: クリーンな状態で次の開発に進める
