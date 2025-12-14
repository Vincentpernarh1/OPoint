/**
 * Validates password strength based on common security criteria
 * @param {string} password - The password to validate
 * @returns {object} Validation result with isValid, errors, strength, and score
 */
export function validatePasswordStrength(password) {
    if (!password || typeof password !== 'string') {
        return {
            isValid: false,
            errors: ['Password is required'],
            strength: 'weak',
            score: 0
        };
    }

    const errors = [];
    let score = 0;

    // Minimum length check
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    } else {
        score += 1;
    }

    // Uppercase letter check
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    } else {
        score += 1;
    }

    // Lowercase letter check
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    } else {
        score += 1;
    }

    // Number check
    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    } else {
        score += 1;
    }

    // Special character check
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    } else {
        score += 1;
    }

    // Determine strength based on score
    let strength = 'weak';
    if (score >= 5) {
        strength = 'very strong';
    } else if (score >= 4) {
        strength = 'strong';
    } else if (score >= 3) {
        strength = 'medium';
    }

    const isValid = errors.length === 0;

    return {
        isValid,
        errors,
        strength,
        score
    };
}