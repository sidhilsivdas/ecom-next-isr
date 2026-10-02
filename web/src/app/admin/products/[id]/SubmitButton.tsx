"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-brand-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}
