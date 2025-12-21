/**
 * Generate initials from a name
 * @param name - The full name to generate initials from
 * @returns The initials (up to 2 characters)
 */
export const getInitials = (name: string): string => {
  if (!name || name.trim() === '') return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();

  return firstInitial + lastInitial;
};

/**
 * Generate a background color CSS class based on name for avatar initials
 * @param name - The name to generate color class from
 * @returns A CSS class name for the background color
 */
export const getAvatarColor = (name: string): string => {
  const colors = [
    'avatar-color-blue',
    'avatar-color-red',
    'avatar-color-green',
    'avatar-color-yellow',
    'avatar-color-purple',
    'avatar-color-cyan',
    'avatar-color-orange',
    'avatar-color-lime',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};