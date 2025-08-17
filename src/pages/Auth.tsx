import { useState } from "react"
import { LoginForm } from "@/components/Auth/LoginForm"
import { SignUpForm } from "@/components/Auth/SignUpForm"

const Auth = () => {
  const [isLoginMode, setIsLoginMode] = useState(true)

  return (
    <div className="min-h-screen bg-chat-background flex items-center justify-center p-4">
      {isLoginMode ? (
        <LoginForm onToggleForm={() => setIsLoginMode(false)} />
      ) : (
        <SignUpForm onToggleForm={() => setIsLoginMode(true)} />
      )}
    </div>
  )
}

export default Auth