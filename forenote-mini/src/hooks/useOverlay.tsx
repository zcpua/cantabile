import { useState, useCallback } from 'react'
import { Dialog, ActionSheet } from '@nutui/nutui-react-taro'

type AlertOpts = {
  title?: string
  content: string
  confirmText?: string
}
type ConfirmOpts = AlertOpts & {
  cancelText?: string
}
type SheetOption = { name: string; value: string }
type SheetOpts = {
  title?: string
  description?: string
  options: SheetOption[]
  cancelText?: string
}

// 统一封装 NutUI 的 Dialog / ActionSheet 命令式调用，替代 Taro.showModal / showActionSheet。
// 好处：弹层视觉受 NutUI 主题变量控制，自动适配暗黑模式，且全站观感一致。
// 用法：const overlay = useOverlay(); overlay.alert({...}); 并在 JSX 末尾渲染 {overlay.node}
export function useOverlay() {
  const [dialog, setDialog] = useState<{
    visible: boolean
    title?: string
    content: string
    confirmText: string
    cancelText?: string
    onConfirm?: () => void
  }>({ visible: false, content: '', confirmText: '确定' })

  const [sheet, setSheet] = useState<{
    visible: boolean
    title?: string
    description?: string
    options: SheetOption[]
    cancelText: string
    onSelect?: (value: string, index: number) => void
  }>({ visible: false, options: [], cancelText: '取消' })

  const alert = useCallback((opts: AlertOpts) => {
    setDialog({
      visible: true,
      title: opts.title,
      content: opts.content,
      confirmText: opts.confirmText || '知道了'
    })
  }, [])

  const confirm = useCallback((opts: ConfirmOpts, onConfirm: () => void) => {
    setDialog({
      visible: true,
      title: opts.title,
      content: opts.content,
      confirmText: opts.confirmText || '确定',
      cancelText: opts.cancelText || '取消',
      onConfirm
    })
  }, [])

  const actionSheet = useCallback(
    (opts: SheetOpts, onSelect: (value: string, index: number) => void) => {
      setSheet({
        visible: true,
        title: opts.title,
        description: opts.description,
        options: opts.options,
        cancelText: opts.cancelText || '取消',
        onSelect
      })
    },
    []
  )

  const closeDialog = () => setDialog(s => ({ ...s, visible: false }))
  const closeSheet = () => setSheet(s => ({ ...s, visible: false }))

  const node = (
    <>
      <Dialog
        title={dialog.title}
        visible={dialog.visible}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        hideCancelButton={!dialog.cancelText}
        onConfirm={() => {
          dialog.onConfirm?.()
          closeDialog()
        }}
        onCancel={closeDialog}
        onOverlayClick={closeDialog}
      >
        {dialog.content}
      </Dialog>
      <ActionSheet
        visible={sheet.visible}
        title={sheet.title}
        description={sheet.description}
        options={sheet.options}
        optionKey={{ name: 'name' }}
        cancelText={sheet.cancelText}
        onCancel={closeSheet}
        onSelect={(item, index) => {
          sheet.onSelect?.((item as SheetOption).value, index)
          closeSheet()
        }}
      />
    </>
  )

  return { alert, confirm, actionSheet, node }
}
