// Types for editor store

export interface EditorState {
  zoomLevel: number
  backgroundColor: string
  showTimeSimulator: boolean
  showZoomControls: boolean
  showHistoryControls: boolean
  showRulerGuides: boolean
  rulerGuidesColor: string
  rulerGuidesMajor: number
  rulerGuidesMinor: number
  showKeyGuidelines: boolean
  keyGuidelineDivisions: 2 | 3 | 4 | 5 | 6 | 8
  enableManualGuides: boolean
}
