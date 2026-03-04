import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-lime-100 px-4">
      <SignUp routing="path" path="/sign-up" signInUrl="/login" forceRedirectUrl="/" />
    </div>
  );
}
