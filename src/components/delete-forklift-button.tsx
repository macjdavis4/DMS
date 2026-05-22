'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { softDeleteForklift } from '@/lib/actions/forklift'

export function DeleteForkliftButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  function onClick() {
    if (!confirming) {
      setConfirming(true)
      // auto-cancel after 4s so a stray click doesn't sit armed
      setTimeout(() => setConfirming(false), 4000)
      return
    }
    startTransition(async () => {
      try {
        await softDeleteForklift(id)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to archive forklift')
        setConfirming(false)
      }
    })
  }

  return (
    <Button variant="destructive" onClick={onClick} disabled={pending}>
      {pending ? 'Archiving…' : confirming ? 'Click again to confirm' : 'Archive'}
    </Button>
  )
}
