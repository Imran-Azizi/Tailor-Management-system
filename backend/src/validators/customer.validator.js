import { z } from 'zod';

export const customerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  phoneNumber: z.string().min(7, 'Phone number must be at least 7 digits'),
});
