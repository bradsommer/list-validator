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
 * Returns true if objectTypes is null/undefined (applies to all for backwards compatibility)
 * Returns false if objectTypes is an empty array (user explicitly deselected all)
 * Returns true if objectTypes includes the selected type
 */
export function appliesToObjectType(
  objectTypes: ObjectType[] | null | undefined,
  selectedType: ObjectType
): boolean {
  // If objectTypes is null or undefined, applies to all (backwards compatibility)
  if (objectTypes === null || objectTypes === undefined) return true;
  // Ensure objectTypes is an array (defensive check for data integrity)
  if (!Array.isArray(objectTypes)) {
    console.warn('[appliesToObjectType] Expected array, got:', typeof objectTypes, objectTypes);
    return true;
  }
  // If objectTypes is an empty array, user explicitly deselected all - applies to none
  if (objectTypes.length === 0) return false;
  return objectTypes.includes(selectedType);
}

/**
 * Get display label for an object type
 */
export function getObjectTypeLabel(type: ObjectType): string {
  const found = OBJECT_TYPES.find(t => t.value === type);
  return found?.label || type;
}
