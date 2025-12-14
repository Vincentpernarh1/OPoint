import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = '636796df44d8accb3ad28d29d3f049d1522529d36275b5bd2d8d95062a622963';
const encryptedText = 'U2FsdGVkX1+Gy39+J8hi7JtIXMg+fu21AerqbUesdVMRjYd8x9l7SW9ECk8DEhxSjI4ueedNDnZbsV2XPMWoyA==';

const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
const decrypted = bytes.toString(CryptoJS.enc.Utf8);

console.log('Decrypted Company ID:', decrypted);