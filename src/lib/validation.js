// lib/validation.js
import validator from 'validator';
import { VALIDATION } from './constants';

export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmedEmail = email.trim();

  if (!validator.isEmail(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (!VALIDATION.EMAIL.PATTERN.test(trimmedEmail)) {
    return { valid: false, error: 'Email does not meet format requirements' };
  }

  return { valid: true, value: trimmedEmail };
}

export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const trimmedUsername = username.trim();

  if (trimmedUsername.length < VALIDATION.USERNAME.MIN_LENGTH) {
    return { 
      valid: false, 
      error: `Username must be at least ${VALIDATION.USERNAME.MIN_LENGTH} characters` 
    };
  }

  if (trimmedUsername.length > VALIDATION.USERNAME.MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Username must not exceed ${VALIDATION.USERNAME.MAX_LENGTH} characters` 
    };
  }

  if (!VALIDATION.USERNAME.PATTERN.test(trimmedUsername)) {
    return { 
      valid: false, 
      error: 'Username can only contain letters, numbers, underscores, and hyphens' 
    };
  }

  return { valid: true, value: trimmedUsername };
}

export function validateMobile(mobile) {
  if (!mobile || typeof mobile !== 'string') {
    return { valid: false, error: 'Mobile number is required' };
  }

  const trimmedMobile = mobile.trim();

  if (trimmedMobile.length < VALIDATION.MOBILE.MIN_LENGTH) {
    return { 
      valid: false, 
      error: `Mobile number must be at least ${VALIDATION.MOBILE.MIN_LENGTH} digits` 
    };
  }

  if (trimmedMobile.length > VALIDATION.MOBILE.MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Mobile number must not exceed ${VALIDATION.MOBILE.MAX_LENGTH} digits` 
    };
  }

  if (!VALIDATION.MOBILE.PATTERN.test(trimmedMobile)) {
    return { 
      valid: false, 
      error: 'Invalid mobile number format. Use Indian mobile format (e.g., 9876543210 or +919876543210)' 
    };
  }

  return { valid: true, value: trimmedMobile };
}

export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < VALIDATION.PASSWORD.MIN_LENGTH) {
    return { 
      valid: false, 
      error: `Password must be at least ${VALIDATION.PASSWORD.MIN_LENGTH} characters` 
    };
  }

  if (!VALIDATION.PASSWORD.PATTERN.test(password)) {
    return { 
      valid: false, 
      error: 'Password must contain uppercase, lowercase, number, and special character' 
    };
  }

  return { valid: true, value: password };
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return validator.escape(input.trim());
}