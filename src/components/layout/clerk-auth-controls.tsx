"use client";

import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";

export function ClerkAuthControls() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) {
    return (
      <>
        <SignInButton />
        <SignUpButton />
      </>
    );
  }

  return <UserButton />;
}
