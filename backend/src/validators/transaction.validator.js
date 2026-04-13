import { z } from 'zod';

export const createTransactionSchema = z.object({
  accountType: z.enum(['ADMIN', 'DOKAN', 'DOKHT', 'QICHIKAR'], {
    required_error: 'Account type is required',
    invalid_type_error: 'Invalid account type',
  }),
  userId: z.string().min(1, 'User is required'),
  amount: z
    .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0'),
  transactionDate: z
    .string({ required_error: 'Transaction date is required' })
    .min(1, 'Transaction date is required')
    .transform((val) => new Date(val)),
  note: z.string().optional(),
});
