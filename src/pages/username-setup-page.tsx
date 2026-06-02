import { useState } from 'react'
import { ShieldCheckIcon } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { recordAuditEvent } from '@/features/audit/api/audit-events'
import { normalizeUsername, validateUsername } from '@/features/profile/utils/username'

export function UsernameSetupPage() {
  const { session, profile, refreshProfile } = useAuth()
  const [username, setUsername] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const normalizedUsername = normalizeUsername(username)
    const validationError = validateUsername(normalizedUsername)
    if (validationError) {
      toast.error(validationError)
      return
    }

    if (!session?.user || !profile) {
      toast.error('No se pudo identificar tu sesión.')
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('perfiles')
        .update({ username: normalizedUsername, updated_at: new Date().toISOString() })
        .eq('id', session.user.id)

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ese username ya está en uso. Elige otro.')
        }
        throw error
      }

      await recordAuditEvent({
        action: 'profile.username_set',
        entityType: 'perfil',
        entityId: session.user.id,
        summary: `${profile.nombre_completo} configuró su username @${normalizedUsername}`,
        metadata: { username: normalizedUsername },
        afterData: { username: normalizedUsername },
      })

      await refreshProfile()
      toast.success('Username configurado correctamente')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el username')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheckIcon className="size-6" />
          </div>
          <CardTitle className="text-2xl">Configura tu username</CardTitle>
          <CardDescription>
            Por seguridad y auditoría, necesitas un username único antes de usar el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="ej. said.lopez"
                autoComplete="username"
                disabled={isSaving}
                required
              />
              <p className="text-xs text-muted-foreground">
                Usa 3 a 20 caracteres: minúsculas, números, punto, guion o guion bajo.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar y continuar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
