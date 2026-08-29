"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { loginSchema, registerSchema } from "@/validations/auth";
import { slugify } from "@/lib/slug";

export async function registerAction(formData: FormData) {
  const input = registerSchema.parse(Object.fromEntries(formData));
  const exists = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (exists) throw new Error("EMAIL_IN_USE");
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
      ...(input.role === "SELLER"
        ? {
            seller: {
              create: {
                businessName: input.name,
                slug: `${slugify(input.name)}-${Date.now()}`,
                store: {
                  create: {
                    name: input.name,
                    slug: `${slugify(input.name)}-${Date.now()}`,
                  },
                },
              },
            },
          }
        : {}),
      cart: { create: {} },
      wishlist: { create: {} },
    },
  });
  await createSession(user.id);
  redirect(input.role === "SELLER" ? "/seller/dashboard" : "/");
}

export async function loginAction(formData: FormData) {
  const input = loginSchema.parse(Object.fromEntries(formData));
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new Error("INVALID_CREDENTIALS");
  }
  await createSession(user.id);
  redirect(user.role === "ADMIN" ? "/admin/dashboard" : user.role === "SELLER" ? "/seller/dashboard" : "/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
