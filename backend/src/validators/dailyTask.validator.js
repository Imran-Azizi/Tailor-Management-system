import { z } from "zod";

export const createDailyTaskSchema = z.object({
  fromName: z.string().min(1, "Sender name is required").max(100),
  recipientName: z.string().min(1, "Recipient name is required").max(100),
  amount: z
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number",
    })
    .positive("Amount must be greater than 0"),
  taskDate: z
    .string({ required_error: "Date & time is required" })
    .min(1, "Date & time is required")
    .transform((val) => new Date(val)),
  note: z.string().max(1000).optional(),
});

export const updateDailyTaskSchema = createDailyTaskSchema;
