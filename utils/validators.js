/**
 * Validation utilities for the application
 */

/**
 * Validates if an email address is in a valid format
 * @param {string} email - The email to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validates if a phone number is a valid Ghana phone number
 * @param {string} phone - The phone number to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidGhanaPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Ghana phone numbers should be 9-10 digits after country code
    // Format: +233XXXXXXXXX or 0XXXXXXXXX or XXXXXXXXX
    const ghanaRegex = /^(\+233|0)?[2356789]\d{8}$/;
    return ghanaRegex.test(phone);
}

/**
 * Sanitizes a Ghana phone number to a standard format
 * @param {string} phone - The phone number to sanitize
 * @returns {string} The sanitized phone number
 */
export function sanitizePhone(phone) {
    if (!phone || typeof phone !== 'string') return phone;

    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If it starts with 233, remove it and add 0
    if (cleaned.startsWith('233') && cleaned.length === 12) {
        cleaned = '0' + cleaned.substring(3);
    }
    // If it doesn't start with 0, add it
    else if (!cleaned.startsWith('0') && cleaned.length === 9) {
        cleaned = '0' + cleaned;
    }

    return cleaned;
}

/**
 * Validates if a string is a valid UUID
 * @param {string} uuid - The UUID to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}