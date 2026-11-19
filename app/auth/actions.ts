"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AuthResult =
  | { success: true; message?: string }
  | { success: false; message: string };

function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return "Please enter a valid email address.";
  }
  return null;
}

function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
}

function validateName(name: string): string | null {
  if (!name || name.trim().length < 1) {
    return "Please enter your full name.";
  }
  if (name.trim().length > 100) {
    return "Name must be 100 characters or fewer.";
  }
  return null;
}

export async function signup(formData: FormData): Promise<AuthResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const nameError = validateName(name);
  if (nameError) return { success: false, message: nameError };

  const emailError = validateEmail(email);
  if (emailError) return { success: false, message: emailError };

  const passwordError = validatePassword(password);
  if (passwordError) return { success: false, message: passwordError };

  if (password !== confirmPassword) {
    return { success: false, message: "Passwords do not match." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return {
        success: false,
        message: "An account with this email already exists.",
      };
    }
    return { success: false, message: error.message || "Sign-up failed." };
  }

  return {
    success: true,
    message:
      "Account created. Please check your email to confirm your address before logging in.",
  };
}

export async function signin(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const emailError = validateEmail(email);
  if (emailError) return { success: false, message: emailError };

  if (!password) {
    return { success: false, message: "Please enter your password." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, message: "Invalid email or password." };
  }

  redirect("/");
}

export async function signout(): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, message: "Logout failed. Please try again." };
  }

  redirect("/auth/login");
}

export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
