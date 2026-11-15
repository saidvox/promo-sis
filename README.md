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

## Mesas e invitados

- Cada familia incluye ocho asientos; los extras cuestan S/40 y se ubican en mesas compartidas.
- Las familias se asignan a mesas numeradas. En celular se usan las listas de asignación y saldos; en escritorio, el plano tiene mesas fijas y permite recorrer y ampliar la vista. El salón crece con los participantes activos e inscritos.
- La lista de invitados exige nombres y apellidos en cada fila utilizada. Los comprobantes de pago se guardan en Storage privado.
- `mesa_cuentas_sistema` relaciona las cuentas de acceso con sus fichas de participante. Sus elecciones solo pueden cambiarlas el titular o el owner.
- Los vínculos de cuentas de solo acceso y la marca `es_owner` se configuran desde el servidor; los clientes autenticados no tienen permiso para modificarlos. Al incorporar una nueva cuenta, revisar este vínculo sin duplicar su ficha financiera.
