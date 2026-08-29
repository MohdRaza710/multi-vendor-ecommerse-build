import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { updateStore } from "@/actions/seller";

export default async function SellerStorePage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  if (
    user.role !== "SELLER" ||
    !user.seller ||
    user.seller.status !== "APPROVED"
  ) {
    redirect("/seller/dashboard");
  }

  const store = user.seller.store;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
      <h1 className="text-4xl font-black">
        Store Settings
      </h1>

      <p className="mt-2 text-slate-500">
        Manage your public storefront.
      </p>

      <form
        action={updateStore}
        className="mt-8 space-y-5 rounded-3xl border bg-white p-6"
      >
        <Field
          label="Store Name"
          name="name"
          defaultValue={
            store?.name ?? user.seller.businessName
          }
          required
        />

        <Field
          label="Description"
          name="description"
          defaultValue={store?.description ?? ""}
        />

        <Field
          label="Logo URL"
          name="logo"
          type="url"
          defaultValue={store?.logo ?? ""}
        />

        <Field
          label="Banner URL"
          name="banner"
          type="url"
          defaultValue={store?.banner ?? ""}
        />

        <Field
          label="Contact Email"
          name="contactEmail"
          type="email"
          defaultValue={
            store?.contactEmail ?? user.email
          }
        />

        <Field
          label="Contact Phone"
          name="contactPhone"
          defaultValue={
            store?.contactPhone ?? user.phone ?? ""
          }
        />

        <Field
          label="Address"
          name="address"
          defaultValue={store?.address ?? ""}
        />

        <button
          type="submit"
          className="w-full rounded-xl bg-slate-950 py-3 font-bold text-white"
        >
          Save Store
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-bold">
        {label}
      </label>

      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 w-full rounded-xl border px-4 py-3"
      />
    </div>
  );
}