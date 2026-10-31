import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  destructive?: boolean
}

export function ConfirmDialog({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel, destructive = false }: ConfirmDialogProps) {
  const { t } = useTranslation()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel()
    }}>
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <p className="eyebrow">{t('settings')}</p>
        <h2 id="dialog-title">{title}</h2>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <button type="button" className="button button-quiet" onClick={onCancel}>{cancelLabel ? t(cancelLabel) : t('cancel')}</button>
          <button type="button" className={destructive ? 'button button-danger' : 'button button-primary'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  )
}