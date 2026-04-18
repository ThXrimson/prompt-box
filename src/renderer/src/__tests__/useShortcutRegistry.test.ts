import { describe, it, expect } from 'vitest'
import { useShortcutRegistry } from '../hooks/useShortcutRegistry'

describe('useShortcutRegistry', () => {
    const { shortcuts, registerShortcut, unregisterShortcut, getShortcutsByCategory, formatShortcutTooltip, findShortcutById } =
        useShortcutRegistry()

    it('should have default shortcuts', () => {
        expect(shortcuts.value.length).toBeGreaterThan(0)
    })

    it('should find shortcut by id', () => {
        const shortcut = findShortcutById('editor-undo')
        expect(shortcut).toBeDefined()
        expect(shortcut!.keys).toBe('Ctrl+Z')
        expect(shortcut!.description).toBe('撤回')
    })

    it('should register a new shortcut', () => {
        const initialLength = shortcuts.value.length
        registerShortcut({
            id: 'test-shortcut',
            keys: 'Ctrl+T',
            description: '测试快捷键',
            category: '测试',
        })
        expect(shortcuts.value.length).toBe(initialLength + 1)
        const found = findShortcutById('test-shortcut')
        expect(found).toBeDefined()
        expect(found!.description).toBe('测试快捷键')
    })

    it('should update existing shortcut when registering with same id', () => {
        registerShortcut({
            id: 'editor-undo',
            keys: 'Ctrl+Shift+Z',
            description: '撤回(新)',
            category: '编辑器',
        })
        const found = findShortcutById('editor-undo')
        expect(found!.keys).toBe('Ctrl+Shift+Z')
        expect(found!.description).toBe('撤回(新)')
        registerShortcut({
            id: 'editor-undo',
            keys: 'Ctrl+Z',
            description: '撤回',
            category: '编辑器',
        })
    })

    it('should unregister a shortcut', () => {
        registerShortcut({
            id: 'temp-shortcut',
            keys: 'Ctrl+X',
            description: '临时',
            category: '测试',
        })
        const lengthBefore = shortcuts.value.length
        unregisterShortcut('temp-shortcut')
        expect(shortcuts.value.length).toBe(lengthBefore - 1)
        expect(findShortcutById('temp-shortcut')).toBeUndefined()
    })

    it('should get shortcuts by category', () => {
        const navShortcuts = getShortcutsByCategory('导航')
        expect(navShortcuts.length).toBeGreaterThan(0)
        expect(navShortcuts.every((s) => s.category === '导航')).toBe(true)
    })

    it('should format shortcut tooltip', () => {
        expect(formatShortcutTooltip('撤回', 'Ctrl+Z')).toBe('撤回 (Ctrl+Z)')
        expect(formatShortcutTooltip('复制')).toBe('复制')
        expect(formatShortcutTooltip('搜索', 'Ctrl+F')).toBe('搜索 (Ctrl+F)')
    })
})
