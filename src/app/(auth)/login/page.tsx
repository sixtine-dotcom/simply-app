import { SignIn } from "@clerk/nextjs";

type LoginPageProps = {
  searchParams?: {
    next?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const nextPath = searchParams?.next || "/";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          "linear-gradient(rgba(244, 250, 245, 0.45), rgba(236, 247, 238, 0.45)), url('/auth-login-bg.jpg')",
      }}
    >
      <SignIn routing="path" path="/login" signUpUrl="/sign-up" forceRedirectUrl={nextPath} />
    </div>
  );
}
