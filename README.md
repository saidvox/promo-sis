# Promocion Sistemas

Aplicacion para gestionar participantes, pagos, egresos y cuotas de una promocion academica.

## Requisitos

- Node.js 20 o superior
- npm
- Un proyecto de Supabase con las variables necesarias

## Configuracion

1. Copia `.env.example` como `.env.local`.
2. Completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Instala dependencias con `npm install`.

La app falla al iniciar si las variables de Supabase no existen, para evitar conexiones accidentales a un proyecto incorrecto.

## Scripts

- `npm run dev`: inicia el entorno local
- `npm run build`: genera la compilacion de produccion
- `npm run lint`: ejecuta ESLint
- `npm run preview`: abre la version compilada localmente

## Navegacion

La navegacion interna usa `hash` en la URL, por ejemplo `#/payments` o `#/expenses`, para conservar la vista actual al recargar la pagina.
