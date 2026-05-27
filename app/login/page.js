'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setMessage('')
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('註冊成功！請check email確認信')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else window.location.href = '/'
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isSignUp ? '註冊帳號' : '登入'}
        </h1>
        <input
          className="w-full border rounded-lg px-4 py-2 mb-3 text-sm"
          type="email" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded-lg px-4 py-2 mb-4 text-sm"
          type="password" placeholder="密碼"
          value={password} onChange={e => setPassword(e.target.value)}
        />
        <button
          className="w-full bg-black text-white rounded-lg py-2 text-sm font-medium"
          onClick={handleSubmit} disabled={loading}
        >
          {loading ? '處理中...' : isSignUp ? '註冊' : '登入'}
        </button>
        {message && <p className="text-sm text-center mt-3 text-gray-600">{message}</p>}
        <p className="text-sm text-center mt-4 text-gray-500 cursor-pointer"
          onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? '已有帳號？登入' : '沒有帳號？註冊'}
        </p>
      </div>
    </div>
  )
}