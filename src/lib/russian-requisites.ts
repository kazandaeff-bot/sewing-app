/**
 * Validation utilities for Russian financial requisites.
 * Used in Zod schemas to validate INN, KPP, BIK, and bank accounts.
 */

/**
 * Validate Russian INN (Individual Taxpayer Number).
 * - Organizations: 10 digits with check digit at position 10
 * - Individual entrepreneurs: 12 digits with check digits at positions 11 and 12
 */
export function validateINN(inn: string): { valid: boolean; error?: string } {
  const cleaned = inn.replace(/\s/g, '')

  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: 'ИНН должен содержать только цифры' }
  }

  if (cleaned.length === 10) {
    // Organization INN
    const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8]
    const sum = weights.reduce((acc, w, i) => acc + w * parseInt(cleaned[i]), 0)
    const checkDigit = (sum % 11) % 10
    if (checkDigit !== parseInt(cleaned[9])) {
      return { valid: false, error: 'Неверная контрольная цифра ИНН (10-значный)' }
    }
    return { valid: true }
  }

  if (cleaned.length === 12) {
    // IP INN — two check digits
    const weights1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
    const sum1 = weights1.reduce((acc, w, i) => acc + w * parseInt(cleaned[i]), 0)
    const check1 = (sum1 % 11) % 10
    if (check1 !== parseInt(cleaned[10])) {
      return { valid: false, error: 'Неверная контрольная цифра ИНН (11-я позиция)' }
    }

    const weights2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
    const sum2 = weights2.reduce((acc, w, i) => acc + w * parseInt(cleaned[i]), 0)
    const check2 = (sum2 % 11) % 10
    if (check2 !== parseInt(cleaned[11])) {
      return { valid: false, error: 'Неверная контрольная цифра ИНН (12-я позиция)' }
    }
    return { valid: true }
  }

  return { valid: false, error: 'ИНН должен содержать 10 или 12 цифр' }
}

/**
 * Validate Russian KPP (Tax Registration Reason Code).
 * 9 digits: NNNNPPXXX where NNNN=tax office code, PP=reason, XXX=serial
 */
export function validateKPP(kpp: string): { valid: boolean; error?: string } {
  const cleaned = kpp.replace(/\s/g, '')

  if (!/^\d{9}$/.test(cleaned)) {
    return { valid: false, error: 'КПП должен содержать ровно 9 цифр' }
  }

  // First 4 digits = tax office code (region + office number)
  const regionCode = parseInt(cleaned.substring(0, 2))
  if (regionCode < 1 || regionCode > 99) {
    return { valid: false, error: 'КПП: неверный код региона (первые 2 цифры)' }
  }

  // Reason code (positions 5-6): 01-50 for Russian organizations, 51-99 for foreign
  const reasonCode = parseInt(cleaned.substring(4, 6))
  if (reasonCode < 1 || reasonCode > 99) {
    return { valid: false, error: 'КПП: неверный код причины постановки на учёт' }
  }

  return { valid: true }
}

/**
 * Validate Russian BIK (Bank Identification Code).
 * 9 digits, starts with 04 (Russian banks).
 */
export function validateBIK(bik: string): { valid: boolean; error?: string } {
  const cleaned = bik.replace(/\s/g, '')

  if (!/^\d{9}$/.test(cleaned)) {
    return { valid: false, error: 'БИК должен содержать ровно 9 цифр' }
  }

  if (!cleaned.startsWith('04')) {
    return { valid: false, error: 'БИК должен начинаться с 04' }
  }

  return { valid: true }
}

/**
 * Validate Russian checking account (расчётный счёт).
 * 20 digits with checksum that depends on BIK.
 *
 * Algorithm:
 * - Take BIK (positions 4-6 determine the checksum key)
 * - For checking accounts: prefix = "0" + BIK[6:9]
 * - For correspondent accounts: prefix = BIK[0:3] + BIK[4:6]
 * - Concatenate prefix + account
 * - Multiply each digit by weights [7,1,3,7,1,3,7,1,3,7,1,3,7,1,3,7,1,3,7,1,3,7,1]
 * - Sum must be divisible by 10
 */
export function validateCheckingAccount(
  account: string,
  bik: string,
  isCorrAccount = false,
): { valid: boolean; error?: string } {
  const cleanedAccount = account.replace(/\s/g, '')
  const cleanedBik = bik.replace(/\s/g, '')

  if (!/^\d{20}$/.test(cleanedAccount)) {
    return { valid: false, error: 'Расчётный счёт должен содержать ровно 20 цифр' }
  }

  if (!validateBIK(cleanedBik).valid) {
    // If BIK is invalid, skip the checksum validation
    return { valid: true }
  }

  // Build the key string based on account type
  let key: string
  if (isCorrAccount) {
    // Correspondent account: prefix = BIK[0:3] + BIK[4:6]
    key = cleanedBik.substring(0, 3) + cleanedBik.substring(4, 6) + cleanedAccount
  } else {
    // Checking account: prefix = "0" + BIK[6:9]
    key = '0' + cleanedBik.substring(6, 9) + cleanedAccount
  }

  // Check digit validation
  const weights = [7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1]
  let sum = 0
  for (let i = 0; i < key.length; i++) {
    sum += parseInt(key[i]) * weights[i]
  }

  if (sum % 10 !== 0) {
    return { valid: false, error: 'Неверная контрольная сумма расчётного счёта (проверьте БИК и номер счёта)' }
  }

  return { valid: true }
}

/**
 * Validate correspondent account (корреспондентский счёт).
 * Same as checking account but uses different BIK prefix for checksum.
 */
export function validateCorrAccount(
  account: string,
  bik: string,
): { valid: boolean; error?: string } {
  const cleaned = account.replace(/\s/g, '')

  if (!/^\d{20}$/.test(cleaned)) {
    return { valid: false, error: 'Корр. счёт должен содержать ровно 20 цифр' }
  }

  return validateCheckingAccount(account, bik, true)
}
