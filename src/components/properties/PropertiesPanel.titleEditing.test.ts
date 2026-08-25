import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('PropertiesPanel inline title editing contract', () => {
  const source = readFileSync(new URL('./PropertiesPanel.vue', import.meta.url), 'utf8')

  it('starts inline editing when the property title is double-clicked', () => {
    expect(source).toContain('@dblclick.stop="startTitleEditing(item.key, item.prop.title)"')
    expect(source).toContain('v-if="editingTitleKey === item.key"')
    expect(source).toContain('titleEditorRef')
  })

  it('saves with Enter or blur and cancels with Escape', () => {
    expect(source).toContain('@keyup.enter="saveTitleEditing(item.key)"')
    expect(source).toContain('@blur="saveTitleEditing(item.key)"')
    expect(source).toContain('@keyup.esc="cancelTitleEditing"')
    expect(source).toContain("propertiesStore.editProperty(key, { title })")
    expect(source).toContain("commitHistory('rename-property')")
  })

  it('keeps titles between 2 and 50 trimmed characters', () => {
    expect(source).toContain('title.length < 2 || title.length > 50')
    expect(source).toContain('editingTitleValue.value.trim()')
  })
})
