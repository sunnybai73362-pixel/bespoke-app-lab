import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

interface LoginFormProps {
  onToggleForm: () => void
}

export const LoginForm = ({ onToggleForm }: LoginFormProps) => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(email, password)
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in to LoftyEyes.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in. Please try again.",
        variant: "destructive",
      })
    }

    setLoading(false)
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-chat-sidebar border-border">
      <CardHeader className="text-center">
        <div className="w-20 h-20 mx-auto bg-gradient-primary rounded-full flex items-center justify-center shadow-glow mb-4">
          <span className="text-2xl font-bold text-primary-foreground">LE</span>
        </div>
        <CardTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
          Welcome to LoftyEyes
        </CardTitle>
        <CardDescription>Sign in to start chatting</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="bg-background/50 border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="bg-background/50 border-border"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-gradient-primary hover:bg-gradient-glow shadow-glow"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button 
              onClick={onToggleForm}
              className="text-primary hover:text-primary-glow transition-colors"
            >
              Sign up
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}