import { z } from "zod";

export const createDailyTaskSchema = z.object({
  fromName: z.string().min(1, "Sender name is required").max(100),
  recipientName: z.string().min(1, "Recipient name is required").max(100),
  orderId: z.preprocess((value) => {
    if (value === null || value === undefined) return undefined;
    const text = String(value).trim();
    return text.length ? text : undefined;
  }, z.string().optional()),
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

export const createDailyTaskBatchSchema = z.object({
  fromName: z.string().min(1, "Sender name is required").max(100),
  recipientName: z.string().min(1, "Recipient name is required").max(100),
  taskDate: z
    .string({ required_error: "Date & time is required" })
    .min(1, "Date & time is required")
    .transform((val) => new Date(val)),
  note: z.string().max(1000).optional(),
  allocations: z
    .array(
      z.object({
        orderId: z.preprocess(
          (value) => {
            if (value === null || value === undefined) return "";
            return String(value).trim();
          },
          z.string().min(1, "orderId is required"),
        ),
        amount: z
          .number({
            required_error: "Amount is required",
            invalid_type_error: "Amount must be a number",
          })
          .positive("Amount must be greater than 0"),
      }),
    )
    .min(1, "At least one order allocation is required"),
});

export const updateDailyTaskSchema = createDailyTaskSchema;
