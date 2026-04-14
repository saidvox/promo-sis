import { useState, useRef } from "react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { EllipsisVerticalIcon, CircleUserRoundIcon, LogOutIcon, UserIcon, ShieldIcon, MailIcon, CameraIcon, Loader2Icon } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { getErrorMessage } from "@/lib/error-utils"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const { session, profile, refreshProfile } = useAuth()
  const [showProfile, setShowProfile] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success("Sesión cerrada correctamente")
      window.location.reload() 
    } catch {
      toast.error("Error al cerrar sesión")
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !session?.user) return

    // Validar tipo y tamaño
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecciona una imagen válida')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen es demasiado grande (máximo 2MB)')
      return
    }

    try {
      setIsUploading(true)
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`
      const filePath = `${session.user.id}/${fileName}`

      // 1. Subir al Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // 3. Actualizar tabla perfiles
      const { error: updateError } = await supabase
        .from('perfiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id)

      if (updateError) throw updateError

      toast.success('¡Foto de perfil actualizada!')
      if (refreshProfile) refreshProfile()
    } catch (error: unknown) {
      console.error('Error uploading avatar:', error)
      toast.error(getErrorMessage(error, 'No se pudo subir la imagen'))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
              }
            >
              <Avatar className="size-8 rounded-lg grayscale">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-foreground/70">
                  {user.email}
                </span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="rounded-lg">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setShowProfile(true)}>
                  <CircleUserRoundIcon />
                  Mi Cuenta
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowLogoutConfirm(true)} className="text-destructive focus:text-destructive">
                <LogOutIcon />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Input de archivo oculto */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleFileUpload} 
      />

      {/* Dialogo de Perfil */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center pb-4 text-center">
            <div className="relative group cursor-pointer" onClick={() => !isUploading && fileInputRef.current?.click()}>
              <Avatar className="size-24 border-4 border-background shadow-xl transition-all group-hover:brightness-50 group-hover:scale-105">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-4xl">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? (
                  <Loader2Icon className="size-8 text-white animate-spin" />
                ) : (
                  <CameraIcon className="size-8 text-white" />
                )}
              </div>
            </div>
            <DialogTitle className="mt-4 text-2xl font-bold tracking-tight">
              {user.name}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {profile?.rol || "Administrador Financiero"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 border-t border-border/50 font-sans">
            <div className="flex items-center gap-3 px-1 text-sm">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MailIcon className="size-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Correo Electrónico</p>
                <p className="font-medium text-foreground">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-1 text-sm">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <ShieldIcon className="size-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Rol del Sistema</p>
                <p className="font-medium text-foreground">{profile?.rol || "Acceso Total"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-1 text-sm">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <UserIcon className="size-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Código Universitario</p>
                <p className="font-medium text-foreground">{profile?.codigo_u || "N/A"}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button variant="secondary" onClick={() => setShowProfile(false)} className="px-8 font-semibold">
              Cerrar Perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alerta de Cierre de Sesión */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>¿Cerrar sesión?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas salir del sistema? No se perderán los cambios guardados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
              Permanecer
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Salir del sistema
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
