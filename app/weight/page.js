'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function WeightPage() {
  const [user, setUser] = useState(null)
  const [weights, setWeights] = useState([])
  const [val, setVal] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login'
      else { setUser(data.user); setLoading(false) }
    })
  }, [])

  useEffect(() => {
    if (user) fetchWeights()
  }, [user])

  async function fetchWeights() {
    const { data } = await supabase.from('weight_logs').select('*')
      .eq('user_id', user.id).order('date', { ascending: false }).order('created_at', { ascending: false })
    if (data) setWeights(data)
  }

  async function addWeight() {
    if (!val || parseFloat(val) < 20) return alert('請輸入有效體重')
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('weight_logs').insert({
      user_id: user.id, date: today, time: time || '—', weight: parseFloat(val)
    })
    if (!error) { setVal(''); setTime(''); fetchWeights() }
  }

  const sorted = [...weights].sort((a, b) => new Date(a.date) - new Date(b.date))
  const minW = sorted.length ? Math.min(...sorted.map(w => w.weight)) : 0
  const maxW = sorted.length ? Math.max(...sorted.map(w => w.weight)) : 0
  const chartH = 160
  const chartW = 300

  function getY(w) {
    if (maxW === minW) return chartH / 2
    return chartH - ((w - minW) / (maxW - minW)) * (chartH - 20) - 10
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center">
        <button onClick={() => window.location.href = '/'} className="text-sm text-gray-400">← 回飲食紀錄</button>
        <h1 className="font-bold text-lg">體重追蹤</h1>
        <div className="w-16" />
      </div>

      <div className="p-4">
        <div className="bg-white rounded-xl border p-4 mb-4">
          <h2 className="font-medium text-sm mb-3">新增體重紀錄</h2>
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1">體重 (kg)</div>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" type="number"
                placeholder="60.5" step="0.1" value={val} onChange={e => setVal(e.target.value)} />
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1">量測時間</div>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="07:00" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <button onClick={addWeight} className="w-full bg-black text-white rounded-lg py-2 text-sm">新增</button>
        </div>

        {sorted.length > 1 && (
          <div className="bg-white rounded-xl border p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-medium text-sm">體重趨勢</h2>
              <span className="text-xs text-gray-400">最低 {minW} kg｜最高 {maxW} kg</span>
            </div>
            <svg width="100%" viewBox={`0 0 ${chartW} ${chartH + 20}`} className="overflow-visible">
              <polyline
                fill="none" stroke="#000" strokeWidth="1.5"
                points={sorted.map((w, i) => `${(i / (sorted.length - 1)) * chartW},${getY(w.weight)}`).join(' ')}
              />
              {sorted.map((w, i) => (
                <circle key={i} cx={(i / (sorted.length - 1)) * chartW} cy={getY(w.weight)} r="3" fill="#000" />
              ))}
              {sorted.map((w, i) => (
                <text key={i} x={(i / (sorted.length - 1)) * chartW} y={getY(w.weight) - 8}
                  textAnchor="middle" fontSize="9" fill="#666">{w.weight}</text>
              ))}
            </svg>
          </div>
        )}

        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-medium text-sm mb-3">歷史紀錄</h2>
          {weights.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">尚無紀錄</p>
          ) : (
            weights.slice(0, 20).map((w, i) => (
              <div key={i} className="flex justify-between py-2 border-b last:border-0 text-sm">
                <span className="text-gray-500">{w.date} {w.time}</span>
                <span className="font-medium">{w.weight} kg</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}