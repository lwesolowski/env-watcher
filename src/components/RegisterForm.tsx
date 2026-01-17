import * as React from "react"
import { useState } from "react"
import { supabaseClient } from "@/db/supabase.client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function RegisterForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRegistered, setIsRegistered] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setIsRegistered(true)
      setLoading(false)
    }
  }

  if (isRegistered) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Check your email</CardTitle>
          <CardDescription className="text-center">
            We've sent a confirmation link to <strong>{email}</strong>. 
            Please click the link to activate your account.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Button variant="outline" onClick={() => window.location.href = "/login"}>
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Register</CardTitle>
        <CardDescription>
          Create a new account to start managing your projects.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleRegister}>
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="text-sm font-medium text-destructive">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </Button>
          <div className="text-sm text-center">
            Already have an account?{" "}
            <a href="/login" className="text-primary hover:underline font-medium">
              Login
            </a>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
