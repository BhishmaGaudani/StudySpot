import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth'
import { AuthCard, Field, SubmitButton } from '../components/AuthCard'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Find a quiet place to study at Stony Brook">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="SBU email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@stonybrook.edu" />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <SubmitButton loading={loading}>Log in</SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        New here?{' '}
        <Link to="/signup" className="font-medium text-sbu hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  )
}
