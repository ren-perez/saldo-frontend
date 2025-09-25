// utils/etl.ts
import { parse, format } from 'date-fns';

interface AmountProcessing {
  debit_column?: string;
  credit_column?: string;
  debit_multiplier?: number;
  credit_multiplier?: number;
  amount_column?: string;
  amount_multiplier?: number;
  transaction_type_column?: string;
  debit_values?: string[];
  credit_values?: string[];
}

export interface PresetConfig {
  _id?: string;
  userId: string;
  name: string;
  description: string;
  delimiter: string;
  hasHeader: boolean;
  skipRows: number;
  accountColumn?: string;
  amountMultiplier: number;
  categoryColumn?: string;
  categoryGroupColumn?: string;
  dateColumn: string;
  dateFormat: string;
  descriptionColumn: string;
  amountColumns: string[];
  amountProcessing: AmountProcessing; // Keep the complex JSON structure
  transactionTypeColumn?: string;
  createdAt: string;
}

export interface NormalizedTransaction {
  date: string; // ISO format YYYY-MM-DD
  amount: number;
  description: string;
  category?: string;
  categoryGroup?: string;
  transactionType?: string;
  account?: string;
  rawData: Record<string, unknown>; // Keep original row for debugging
}

export interface ValidationError {
  row: number;
  column: string;
  error: string;
  value: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  totalRows: number;
  validRows: number;
}

/**
 * Parse date string using the preset's date format
 */
export function parseDate(value: string, dateFormat: string): Date | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    // Handle common date format mappings
    const formatMap: Record<string, string> = {
      '%m/%d/%y': 'MM/dd/yy',
      '%m/%d/%Y': 'MM/dd/yyyy',
      '%Y-%m-%d': 'yyyy-MM-dd',
      '%d/%m/%Y': 'dd/MM/yyyy',
      '%m-%d-%Y': 'MM-dd-yyyy',
      '%Y/%m/%d': 'yyyy/MM/dd'
    };

    const jsFormat = formatMap[dateFormat] || dateFormat;
    const parsedDate = parse(value.trim(), jsFormat, new Date());

    // Check if date is valid
    if (isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  } catch {
    return null;
  }
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export function formatDateToISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Compute transaction amount based on preset's amount processing rules
 */
// export function computeAmount(row: Record<string, unknown>, amountProcessing: AmountProcessing): number {
//   if (!amountProcessing) {
//     return 0;
//   }

//   // Case 1: Separate debit and credit columns (like Capital One Credit Card)
//   if (amountProcessing.debit_column && amountProcessing.credit_column) {
//     const debitRaw = row[amountProcessing.debit_column];
//     const creditRaw = row[amountProcessing.credit_column];
//     const debitValue = parseFloat(String(debitRaw ?? 0)) || 0;
//     const creditValue = parseFloat(String(creditRaw ?? 0)) || 0;

//     const debitMultiplier = amountProcessing.debit_multiplier || 1;
//     const creditMultiplier = amountProcessing.credit_multiplier || -1;

//     // Only one should have a value typically
//     if (debitValue !== 0) {
//       return debitValue * debitMultiplier;
//     }
//     if (creditValue !== 0) {
//       return creditValue * creditMultiplier;
//     }
//     return 0;
//   }

//   function toNumber(value: unknown): number {
//     if (typeof value === "number") return value;
//     if (typeof value === "string") {
//       const n = parseFloat(value);
//       return isNaN(n) ? 0 : n;
//     }
//     return 0;
//   }

//   function toString(value: unknown): string {
//     return typeof value === "string" ? value : "";
//   }

//   // Case 2: Single amount column with transaction type (like Capital One 360 Checking)
//   if (amountProcessing.amount_column && amountProcessing.transaction_type_column) {
//     // const amount = parseFloat(row[amountProcessing.amount_column]) || 0;
//     const amount = toNumber(row[amountProcessing.amount_column]);
//     // const transactionType = row[amountProcessing.transaction_type_column];
//     const transactionType = toString(row[amountProcessing.transaction_type_column]);
//     const amountMultiplier = amountProcessing.amount_multiplier || 1;

//     // Check if it's a debit transaction
//     if (amountProcessing.debit_values &&
//       amountProcessing.debit_values.includes(transactionType)) {
//       return amount * amountMultiplier * -1; // Debits are negative
//     }

//     // Check if it's a credit transaction
//     if (amountProcessing.credit_values &&
//       amountProcessing.credit_values.includes(transactionType)) {
//       return amount * amountMultiplier; // Credits are positive
//     }

//     // Default behavior if type not recognized
//     return amount * amountMultiplier;
//   }

//   // Case 3: Simple single amount column
//   if (amountProcessing.amount_column) {
//     const amount = parseFloat(row[amountProcessing.amount_column]) || 0;
//     const multiplier = amountProcessing.amount_multiplier || 1;
//     return amount * multiplier;
//   }

//   // Fallback: Try to use the first amount column from the preset
//   // This handles legacy configurations
//   return 0;
// }
export function computeAmount(row: Record<string, unknown>, amountProcessing: AmountProcessing): number {
  if (!amountProcessing) {
    return 0;
  }

  function toNumber(value: unknown): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const n = parseFloat(value);
      return isNaN(n) ? 0 : n;
    }
    return 0;
  }

  function toString(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  // Case 1: Separate debit and credit columns
  if (amountProcessing.debit_column && amountProcessing.credit_column) {
    const debitValue = toNumber(row[amountProcessing.debit_column]);
    const creditValue = toNumber(row[amountProcessing.credit_column]);

    const debitMultiplier = amountProcessing.debit_multiplier || 1;
    const creditMultiplier = amountProcessing.credit_multiplier || -1;

    if (debitValue !== 0) return debitValue * debitMultiplier;
    if (creditValue !== 0) return creditValue * creditMultiplier;
    return 0;
  }

  // Case 2: Amount + transaction type
  if (amountProcessing.amount_column && amountProcessing.transaction_type_column) {
    const amount = toNumber(row[amountProcessing.amount_column]);
    const transactionType = toString(row[amountProcessing.transaction_type_column]);
    const amountMultiplier = amountProcessing.amount_multiplier || 1;

    if (amountProcessing.debit_values?.includes(transactionType)) {
      return amount * amountMultiplier * -1;
    }

    if (amountProcessing.credit_values?.includes(transactionType)) {
      return amount * amountMultiplier;
    }

    return amount * amountMultiplier;
  }

  // Case 3: Simple amount column
  if (amountProcessing.amount_column) {
    const amount = toNumber(row[amountProcessing.amount_column]);
    const multiplier = amountProcessing.amount_multiplier || 1;
    return amount * multiplier;
  }

  return 0;
}


/**
 * Extract and clean description from row
 */
export function extractDescription(row: Record<string, unknown>, descriptionColumn: string): string {
  const description = row[descriptionColumn];
  if (!description) {
    return '';
  }

  // Clean up the description: trim whitespace, normalize spaces
  return String(description).trim().replace(/\s+/g, ' ');
}

/**
 * Extract category if available
 */
export function extractCategory(row: Record<string, unknown>, categoryColumn?: string): string | undefined {
  if (!categoryColumn) {
    return undefined;
  }

  const category = row[categoryColumn];
  return category ? String(category).trim() : undefined;
}

/**
 * Extract category group if available
 */
export function extractCategoryGroup(row: Record<string, unknown>, categoryGroupColumn?: string): string | undefined {
  if (!categoryGroupColumn) {
    return undefined;
  }

  const categoryGroup = row[categoryGroupColumn];
  return categoryGroup ? String(categoryGroup).trim() : undefined;
}

/**
 * Extract transaction type if available
 */
export function extractTransactionType(row: Record<string, unknown>, transactionTypeColumn?: string): string | undefined {
  if (!transactionTypeColumn) {
    return undefined;
  }

  const transactionType = row[transactionTypeColumn];
  return transactionType ? String(transactionType).trim() : undefined;
}

/**
 * Extract account information if available
 */
export function extractAccount(row: Record<string, unknown>, accountColumn?: string): string | undefined {
  if (!accountColumn) {
    return undefined;
  }

  const account = row[accountColumn];
  return account ? String(account).trim() : undefined;
}

/**
 * Normalize a single transaction row using preset rules
 */
export function normalizeTransaction(
  row: Record<string, unknown>,
  preset: PresetConfig,
  rowIndex: number
): { transaction: NormalizedTransaction | null; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  function toString(value: unknown): string {
    return typeof value === "string" ? value : "";
  }
  // Parse date
  const dateValue = row[preset.dateColumn];
  const parsedDate = parseDate(toString(dateValue), preset.dateFormat);

  if (!parsedDate) {
    errors.push({
      row: rowIndex,
      column: preset.dateColumn,
      error: `Invalid date format. Expected ${preset.dateFormat}, got: ${dateValue}`,
      value: dateValue
    });
  }

  // Compute amount
  const amount = computeAmount(row, preset.amountProcessing);

  if (amount === 0) {
    // This might be a warning rather than an error, depending on your business rules
    // errors.push({
    //   row: rowIndex,
    //   column: 'amount',
    //   error: 'Amount is zero',
    //   value: amount
    // });
  }

  // Extract description
  const description = extractDescription(row, preset.descriptionColumn);

  if (!description) {
    errors.push({
      row: rowIndex,
      column: preset.descriptionColumn,
      error: 'Description is required',
      value: description
    });
  }

  // If we have critical errors, return null transaction
  if (errors.some(e => e.column === preset.dateColumn || e.column === preset.descriptionColumn)) {
    return { transaction: null, errors };
  }

  // Build the normalized transaction
  const transaction: NormalizedTransaction = {
    date: formatDateToISO(parsedDate!),
    amount: amount,
    description: description,
    category: extractCategory(row, preset.categoryColumn),
    categoryGroup: extractCategoryGroup(row, preset.categoryGroupColumn),
    transactionType: extractTransactionType(row, preset.transactionTypeColumn),
    account: extractAccount(row, preset.accountColumn),
    rawData: { ...row } // Keep original data for debugging
  };

  return { transaction, errors };
}

/**
 * Process entire CSV data using preset rules
 */
export function processTransactions(
  csvRows: Record<string, unknown>[],
  preset: PresetConfig
): {
  transactions: NormalizedTransaction[];
  errors: ValidationError[];
  warnings: ValidationError[];
  stats: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
} {
  const transactions: NormalizedTransaction[] = [];
  const allErrors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Skip rows if needed
  const rowsToProcess = csvRows.slice(preset.skipRows || 0);

  rowsToProcess.forEach((row, index) => {
    const actualRowIndex = index + (preset.skipRows || 0) + 1; // +1 for human-readable row numbers

    const { transaction, errors } = normalizeTransaction(row, preset, actualRowIndex);

    if (transaction) {
      transactions.push(transaction);
    }

    if (errors.length > 0) {
      allErrors.push(...errors);
    }
  });

  const errorRowNumbers = new Set(allErrors.map(e => e.row));
  const warningRowNumbers = new Set(warnings.map(w => w.row));

  return {
    transactions,
    errors: allErrors,
    warnings,
    stats: {
      totalRows: rowsToProcess.length,
      validRows: transactions.length,
      errorRows: errorRowNumbers.size,
      warningRows: warningRowNumbers.size
    }
  };
}

/**
 * Validate preset configuration
 */
export function validatePreset(preset: PresetConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!preset.dateColumn) {
    errors.push({
      row: -1,
      column: 'dateColumn',
      error: 'Date column is required',
      value: String(preset.dateColumn || 'undefined')
    });
  }

  if (!preset.descriptionColumn) {
    errors.push({
      row: -1,
      column: 'descriptionColumn',
      error: 'Description column is required',
      value: String(preset.descriptionColumn || 'undefined')
    });
  }

  if (!preset.dateFormat) {
    errors.push({
      row: -1,
      column: 'dateFormat',
      error: 'Date format is required',
      value: String(preset.dateFormat || 'undefined')
    });
  }

  // Amount processing validation
  if (!preset.amountProcessing) {
    errors.push({
      row: -1,
      column: 'amountProcessing',
      error: 'Amount processing configuration is required',
      value: 'undefined'
    });
  } else {
    // Check if amount processing has at least one valid configuration
    const hasDebitCredit = preset.amountProcessing.debit_column && preset.amountProcessing.credit_column;
    const hasAmountWithType = preset.amountProcessing.amount_column && preset.amountProcessing.transaction_type_column;
    const hasSimpleAmount = preset.amountProcessing.amount_column;

    if (!hasDebitCredit && !hasAmountWithType && !hasSimpleAmount) {
      errors.push({
        row: -1,
        column: 'amountProcessing',
        error: 'Amount processing must specify either debit/credit columns, amount column with transaction type, or simple amount column',
        value: JSON.stringify(preset.amountProcessing)
      });
    }
  }

  return errors;
}

/**
 * Validate CSV headers against preset requirements
 */
export function validateCsvHeaders(
  headers: string[],
  preset: PresetConfig
): ValidationError[] {
  const errors: ValidationError[] = [];
  const requiredColumns: string[] = [preset.dateColumn, preset.descriptionColumn];

  // Add amount-related columns based on processing type
  if (preset.amountProcessing) {
    if (preset.amountProcessing.debit_column) {
      requiredColumns.push(preset.amountProcessing.debit_column);
    }
    if (preset.amountProcessing.credit_column) {
      requiredColumns.push(preset.amountProcessing.credit_column);
    }
    if (preset.amountProcessing.amount_column) {
      requiredColumns.push(preset.amountProcessing.amount_column);
    }
    if (preset.amountProcessing.transaction_type_column) {
      requiredColumns.push(preset.amountProcessing.transaction_type_column);
    }
  }

  // Add optional columns if specified
  if (preset.categoryColumn) requiredColumns.push(preset.categoryColumn);
  if (preset.categoryGroupColumn) requiredColumns.push(preset.categoryGroupColumn);
  if (preset.accountColumn) requiredColumns.push(preset.accountColumn);

  // Check for missing columns
  requiredColumns.forEach(column => {
    if (!headers.includes(column)) {
      errors.push({
        row: -1,
        column: column,
        error: `Required column '${column}' not found in CSV headers`,
        value: `Available: ${headers.join(', ')}` // Convert array to string
      });
    }
  });

  return errors;
}

/**
 * Get date range from transactions for deduplication logic
 */
export function getDateRange(transactions: NormalizedTransaction[]): { startDate: string; endDate: string } | null {
  if (transactions.length === 0) {
    return null;
  }

  const dates = transactions.map(t => t.date).sort();
  return {
    startDate: dates[0],
    endDate: dates[dates.length - 1]
  };
}