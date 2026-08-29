import { OrderStatus } from "@prisma/client";
const transitions: Record<OrderStatus, OrderStatus[]> = {
	PENDING: ["CONFIRMED", "CANCELLED"],
	CONFIRMED: ["PROCESSING", "CANCELLED"],
	PROCESSING: ["SHIPPED", "CANCELLED"],
	SHIPPED: ["DELIVERED"],
	DELIVERED: ["REFUNDED"],
	CANCELLED: [],
	REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus) {
	return transitions[from].includes(to);
}
