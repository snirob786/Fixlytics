import { Login } from "@/components/auth/login";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
