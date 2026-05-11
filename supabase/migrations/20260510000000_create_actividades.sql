-- Create actividades table
CREATE TABLE IF NOT EXISTS public.actividades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    fecha_evento DATE NOT NULL,
    monto_recaudado NUMERIC NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'Planeada' CHECK (estado IN ('Planeada', 'En curso', 'Finalizada')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to view actividades
CREATE POLICY "Permitir ver actividades a usuarios autenticados" 
    ON public.actividades FOR SELECT 
    TO authenticated 
    USING (true);

-- Create policy to allow all authenticated users to insert actividades
CREATE POLICY "Permitir crear actividades a usuarios autenticados" 
    ON public.actividades FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Create policy to allow all authenticated users to update actividades
CREATE POLICY "Permitir actualizar actividades a usuarios autenticados" 
    ON public.actividades FOR UPDATE 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- Create policy to allow all authenticated users to delete actividades
CREATE POLICY "Permitir eliminar actividades a usuarios autenticados" 
    ON public.actividades FOR DELETE 
    TO authenticated 
    USING (true);

-- Create an updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_actividades_updated_at
BEFORE UPDATE ON public.actividades
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
