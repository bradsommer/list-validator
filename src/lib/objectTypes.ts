/**
 * Object Types - Defines the HubSpot object types that rules and questions can apply to.
 */

export type ObjectType = 'contacts' | 'companies' | 'deals';

export const OBJECT_TYPES: { value: ObjectType; label: string; icon: string }[] = [
  { value: 'contacts', label: 'Contacts', icon: 'user' },
  { value: 'companies', label: 'Companies', icon: 'building' },
  { value: 'deals', label: 'Deals', icon: 'dollar' },
];

export const ALL_OBJECT_TYPES: ObjectType[] = ['contacts', 'companies', 'deals'];

/**
 * Check if an item applies to a specific object type
 * Returns true if objectTypes is empty/null (applies to all) or includes the type
 */
export function appliesToObjectType(
  objectTypes: ObjectType[] | null | undefined,
  selectedType: ObjectType
): boolean {
  // If no object types specified, applies to all
  if (!objectTypes || objectTypes.length === 0) return true;
  return objectTypes.includes(selectedType);
}

/**
 * Get display label for an object type
 */
export function getObjectTypeLabel(type: ObjectType): string {
  const found = OBJECT_TYPES.find(t => t.value === type);
  return found?.label || type;
}
