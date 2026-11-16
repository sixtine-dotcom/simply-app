"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";

export function ClerkAuthControls() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) {
    return (
      <>
        <SignInButton />
      </>
    );
  }

  return <UserButton />;
}
