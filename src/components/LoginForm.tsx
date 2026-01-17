import * as React from "react"
import { useState, useEffect } from "react"
import { supabaseClient } from "@/db/supabase.client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    // Check for success message in URL (e.g. after email verification)
    const params = new URLSearchParams(window.location.search)
    if (params.get("verified") === "true") {
      setSuccessMessage("Email verified successfully. You can now log in.")
    }
    
    // Check if there is a hash fragment that might indicate a successful verification from Supabase
    // Sometimes Supabase redirects with access_token in the hash after verification
    if (window.location.hash.includes("access_token")) {
      setSuccessMessage("Email verified successfully. You can now log in.")
      // Optional: clean up the hash
      window.history.replaceState(null, "", window.location.pathname + window.location.search)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setError("Please confirm your email address before logging in.")
      } else {
        setError(error.message)
      }
      setLoading(false)
    } else {
      window.location.href = "/dashboard"
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>
          Enter your email and password to access your account.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="text-sm font-medium text-destructive">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="text-sm font-medium text-green-600 dark:text-green-400">
              {successMessage}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-6">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
          <div className="text-sm text-center">
            Don't have an account?{" "}
            <a href="/register" className="text-primary hover:underline font-medium">
              Register
            </a>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
