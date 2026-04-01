/**
 * Defines the user roles for the application.
 * Using a union type (instead of an enum) is a React and TypeScript community best practice 
 * as it avoids the overhead of transpiling Enums into IIFE functions and ensures 
 * zero runtime cost while providing strictly verified literal types.
 */
export type Role = 'Presidente' | 'Sub Presidente' | 'Secretaria' | 'Tesorero' | 'Logistica' | 'Redes' | 'Alumno'

/**
 * Type guard utility to check if a value is a valid Role.
 */
export const isRole = (value: string): value is Role => {
  return ['Presidente', 'Sub Presidente', 'Secretaria', 'Tesorero', 'Logistica', 'Redes', 'Alumno'].includes(value)
}
