# MarketHub — Multi-Vendor E-Commerce Platform

MarketHub is a production-style full-stack marketplace built with Next.js App Router, TypeScript and PostgreSQL/Prisma. It is intentionally structured as a serious practice project rather than a CRUD tutorial.

## Stack
- Next.js App Router + Route Handlers
- TypeScript
- Tailwind CSS v4
- PostgreSQL + Prisma
- Zod validation
- Secure database-backed sessions with httpOnly cookies
- bcrypt password hashing
- Framer Motion / Lucide / Ant Design ready for richer dashboard interactions

## Implemented foundation
- Customer, seller and admin roles
- Database-backed sessions and role authorization
- Seller approval states
- Normalized marketplace schema
- Product catalog, categories, variants and inventory
- Public seller storefronts
- Search, sorting and server pagination
- Persistent customer cart
- Server-side stock and price validation
- Mock payment abstraction through the order flow
- Parent orders + seller order groups + order items
- Commission records and seller revenue aggregation
- Product reviews schema and moderation status
- Coupons, payouts, notifications and audit-log models
- Responsive storefront and role dashboards

## Architecture
Business rules live in `src/lib`, `src/actions`, route handlers and validation modules. UI components consume server-side data and do not own financial/inventory logic.

### Database relationship overview
`User -> Seller -> Store` and `Seller -> Product -> Inventory/Variants` form the seller catalog. A customer owns a `Cart`, `Wishlist` and `Order` history. A checkout creates one parent `Order`, one `SellerOrder` per seller, and multiple `OrderItem` records. Commissions reference the historical order item and seller commission rate.

## Fresh machine setup

1. Install Node.js 20+ and PostgreSQL 15+.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Install packages:

```bash
npm install
```

4. Generate Prisma Client:

```bash
npm run db:generate
```

5. Create the development database schema:

```bash
npm run db:migrate
```

6. Seed development data:

```bash
npm run db:seed
```

7. Start Next.js:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Development accounts
The seed uses fictional development accounts only. The password for every seeded account is `DevPassword123!`. Change or remove these credentials before any real deployment.

- admin@example.com
- seller1@example.com
- seller2@example.com
- seller3@example.com
- customer1@example.com through customer10@example.com

## Useful scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Security notes
- Passwords are hashed with bcrypt.
- Session tokens are stored as SHA-256 hashes in PostgreSQL and sent to the browser only through httpOnly, same-site cookies.
- Server-side authorization is required for protected operations.
- Monetary values use PostgreSQL Decimal rather than floating point.
- Cart, coupon, inventory and checkout calculations must be revalidated on the server.
- Prisma parameterizes database queries.
- `.env` is local-only; never commit production secrets.

## Next implementation phases
1. Complete address management and shipping methods.
2. Add seller product CRUD UI and inventory mutations.
3. Add admin seller/product/review moderation screens.
4. Add coupon validation endpoint and checkout discount calculation.
5. Add notification creation and audit logging around mutations.
6. Add upload abstraction with local, S3, Cloudinary or Supabase adapters.
7. Add Stripe adapter and verified webhook handling.
8. Add rate limiting, CSRF strategy for mutating endpoints and comprehensive integration tests.
9. Add analytics charts, caching and optional Redis/realtime adapters.
10. Add automated CI with lint, typecheck, migration validation and tests.
