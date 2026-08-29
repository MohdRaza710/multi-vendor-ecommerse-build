import { z } from "zod";
export const cartItemSchema = z.object({
	productId: z.string().min(1),
	variantId: z.string().optional(),
	quantity: z.coerce.number().int().min(1).max(99),
});
