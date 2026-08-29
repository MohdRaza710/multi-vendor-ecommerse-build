import { z } from "zod";
export const registerSchema = z.object({
	name: z.string().min(2).max(80),
	email: z.email(),
	password: z.string().min(8).max(72),
	role: z.enum(["CUSTOMER", "SELLER"]).default("CUSTOMER"),
});
export const loginSchema = z.object({
	email: z.email(),
	password: z.string().min(1),
});
