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
if (typeof window !== "undefined" && supabaseClient) {
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

      if (session) {
        const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `sb-access-token=${session.access_token}; path=/; expires=${expires}; SameSite=Lax; secure`;
        document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; expires=${expires}; SameSite=Lax; secure`;
      }
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

    if (session) {
      const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `sb-access-token=${session.access_token}; path=/; expires=${expires}; SameSite=Lax; secure`;
      document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; expires=${expires}; SameSite=Lax; secure`;
    } else {
      document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  });
} else {
  $authLoading.set(false);
}
