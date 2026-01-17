import { atom } from "nanostores";
import type { User, Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/db/supabase.client";

export const $user = atom<User | null>(null);
export const $session = atom<Session | null>(null);
export const $authLoading = atom<boolean>(true);

export const signOut = async () => {
  await supabaseClient.auth.signOut();
  $user.set(null);
  $session.set(null);
};

// Initialize auth listener
if (typeof window !== "undefined") {
  // Set a safety timeout to stop loading if Supabase doesn't respond
  const timeoutId = setTimeout(() => {
    if ($authLoading.get()) {
      $authLoading.set(false);
    }
  }, 5000);

  supabaseClient.auth
    .getSession()
    .then(({ data: { session } }) => {
      clearTimeout(timeoutId);
      $session.set(session);
      $user.set(session?.user ?? null);
      $authLoading.set(false);
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      console.error("authStore: getSession error", err);
      $authLoading.set(false);
    });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    $session.set(session);
    $user.set(session?.user ?? null);
    $authLoading.set(false);
  });
}
