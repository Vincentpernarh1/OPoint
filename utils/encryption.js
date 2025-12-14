import CryptoJS from 'crypto-js';

// Encryption functions
const ENCRYPTION_KEY = import.meta?.env?.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;

export function encrypt(text) {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

export function decrypt(encryptedText) {
  const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}