import { z } from "zod";
export const productSchema = z.object({
	name: z.string().min(2).max(160),
	description: z.string().min(10),
	shortDescription: z.string().max(300).optional(),
	categoryId: z.string().min(1),
	price: z.coerce.number().nonnegative(),
	compareAtPrice: z.coerce.number().nonnegative().optional(),
	sku: z.string().min(2).max(80),
	brand: z.string().max(80).optional(),
	stock: z.coerce.number().int().nonnegative().default(0),
	image: z.url().optional(),
});
