import { addToCartAction } from "@/actions/cart";
import { apiError, apiSuccess } from "@/lib/errors";

export async function POST(request: Request) {
	try {
		await addToCartAction(await request.json());
		return apiSuccess({ message: "Added to cart" }, 201);
	} catch (e) {
		const message = e instanceof Error ? e.message : "Unable to add item";
		return apiError(
			message,
			message === "UNAUTHORIZED"
				? "Please log in first."
				: "Unable to add item.",
			message === "UNAUTHORIZED" ? 401 : 400,
		);
	}
}
