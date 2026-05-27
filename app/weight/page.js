'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function WeightPage() {
  const [user, setUser] = useState(null)
  const [weights, setWeights] = useState([])
  const [goalWeight, setGoalWeight] = useState(0)
  const [val, setVal] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal] = useState('')

  const deepBlue = '#1D3461'
  const lightBlue = '#5B9BD5'
  const lightBlueBg = '#EBF3FB'

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login'
      else { setUser(data.user); setLoading(false) }
    })
  }, [])

  useEffect(() => {
    if (user) { fetchWeights(); fetchGoal() }
  }, [user])

  async function fetchWeights() {
    const { data } = await supabase.from('weight_logs').select('*')
      .eq('user_id', user.id).order('date', { ascending: false }).order('created_at', { ascending: false })
    if (data) setWeights(data)
  }

  async function fetchGoal() {
    const { data } = await supabase.from('goals').select('weight').eq('user_id', user.id).single()
    if (data) setGoalWeight(parseFloat(data.weight) || 0)
  }

  async function addWeight() {
    if (!val || parseFloat(val) < 20) return alert('請輸入有效體重')
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('weight_logs').insert({
      user_id: user.id, date: today, time: time || '—', weight: parseFloat(val)
    })
    if (!error) { setVal(''); setTime(''); fetchWeights() }
  }

  async function updateWeight(id) {
    if (!editVal || parseFloat(editVal) < 20) return alert('請輸入有效體重')
    await supabase.from('weight_logs').update({ weight: parseFloat(editVal) }).eq('id', id)
    setEditingId(null)
    fetchWeights()
  }

  async function deleteWeight(id) {
    if (!confirm('確定刪除這筆紀錄？')) return
    await supabase.from('weight_logs').delete().eq('id', id)
    fetchWeights()
  }

  const sorted = [...weights].sort((a, b) => new Date(a.date) - new Date(b.date))
  const latest = weights[0]?.weight
  const minW = sorted.length ? Math.min(...sorted.map(w => w.weight)) : 0
  const maxW = sorted.length ? Math.max(...sorted.map(w => w.weight)) : 0
  const diff = latest && goalWeight ? (latest - goalWeight).toFixed(1) : null
  const chartH = 140
  const chartW = 300

  function getY(w) {
    if (maxW === minW) return chartH / 2
    return chartH - ((w - minW) / (maxW - minW)) * (chartH - 20) - 10
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f2f2f7' }}>載入中...</div>

  return (
    <div className="max-w-lg mx-auto pb-8" style={{ background: '#f2f2f7', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '48px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => window.location.href = '/'} style={{ fontSize: 13, color: lightBlue, border: 'none', background: 'none', cursor: 'pointer' }}>← 返回</button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: deepBlue }}>體重追蹤</h1>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* 目前體重卡片 */}
        {latest && (
          <div style={{ background: '#fff', borderRadius: 18, padding: 20, marginBottom: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#8e8e93', marginBottom: 6 }}>目前體重</div>
            <div>
              <span style={{ fontSize: 52, fontWeight: 700, color: deepBlue }}>{latest}</span>
              <span style={{ fontSize: 16, color: '#8e8e93', marginLeft: 6 }}>kg</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#8e8e93', marginBottom: 2 }}>最低</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: lightBlue }}>{minW} kg</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#8e8e93', marginBottom: 2 }}>最高</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: deepBlue }}>{maxW} kg</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#8e8e93', marginBottom: 2 }}>紀錄筆數</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: deepBlue }}>{weights.length} 筆</div>
              </div>
            </div>
            {goalWeight > 0 && diff !== null && (
              <div style={{ background: lightBlueBg, borderRadius: 12, padding: '10px 16px', marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: lightBlue }}>目標 {goalWeight} kg</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: deepBlue }}>
                  {parseFloat(diff) === 0 ? '🎉 已達目標！' : parseFloat(diff) > 0 ? `還差 ${diff} kg` : `已超過目標 ${Math.abs(diff)} kg`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 趨勢圖 */}
        {sorted.length > 1 && (
          <div style={{ background: '#fff', borderRadius: 18, padding: 20, marginBottom: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: deepBlue, marginBottom: 12 }}>趨勢圖</h2>
            <svg width="100%" viewBox={`0 0 ${chartW} ${chartH + 20}`} style={{ overflow: 'visible' }}>
              <polyline fill="none" stroke={lightBlue} strokeWidth="2"
                points={sorted.map((w, i) => `${(i / (sorted.length - 1)) * chartW},${getY(w.weight)}`).join(' ')} />
              {sorted.map((w, i) => (
                <g key={i}>
                  <circle cx={(i / (sorted.length - 1)) * chartW} cy={getY(w.weight)} r="4" fill={lightBlue} />
                  <text x={(i / (sorted.length - 1)) * chartW} y={getY(w.weight) - 10}
                    textAnchor="middle" fontSize="9" fill="#8e8e93">{w.weight}</text>
                </g>
              ))}
            </svg>
          </div>
        )}

        {/* 新增體重 */}
        <div style={{ background: '#fff', borderRadius: 18, padding: 20, marginBottom: 10 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: deepBlue, marginBottom: 12 }}>新增紀錄</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: lightBlue, marginBottom: 6 }}>體重 (kg)</div>
              <input style={{ width: '100%', background: '#f2f2f7', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: deepBlue, border: 'none', outline: 'none' }}
                type="number" placeholder="60.5" step="0.1"
                value={val} onChange={e => setVal(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: lightBlue, marginBottom: 6 }}>量測時間</div>
              <input style={{ width: '100%', background: '#f2f2f7', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: deepBlue, border: 'none', outline: 'none' }}
                placeholder="07:00" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <button onClick={addWeight}
            style={{ width: '100%', background: deepBlue, color: '#fff', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            新增
          </button>
        </div>

        {/* 歷史紀錄 */}
        <div style={{ background: '#fff', borderRadius: 18, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: deepBlue, marginBottom: 12 }}>歷史紀錄</h2>
          {weights.length === 0 ? (
            <p style={{ fontSize: 13, color: '#8e8e93', textAlign: 'center', padding: '20px 0' }}>尚無紀錄</p>
          ) : (
            weights.map((w, idx) => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx < weights.length - 1 ? '0.5px solid #f2f2f7' : 'none' }}>
                <div style={{ fontSize: 13, color: '#8e8e93' }}>{w.date} {w.time}</div>
                {editingId === w.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input style={{ width: 72, background: '#f2f2f7', borderRadius: 10, padding: '6px 10px', fontSize: 13, color: deepBlue, border: 'none', outline: 'none', textAlign: 'center' }}
                      type="number" step="0.1" value={editVal}
                      onChange={e => setEditVal(e.target.value)} />
                    <button onClick={() => updateWeight(w.id)}
                      style={{ fontSize: 12, color: lightBlue, border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>完成</button>
                    <button onClick={() => setEditingId(null)}
                      style={{ fontSize: 12, color: '#8e8e93', border: 'none', background: 'none', cursor: 'pointer' }}>取消</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: deepBlue }}>{w.weight} kg</span>
                    <button onClick={() => { setEditingId(w.id); setEditVal(w.weight) }}
                      style={{ fontSize: 12, color: lightBlue, border: 'none', background: 'none', cursor: 'pointer' }}>編輯</button>
                    <button onClick={() => deleteWeight(w.id)}
                      style={{ fontSize: 12, color: '#ff6b6b', border: 'none', background: 'none', cursor: 'pointer' }}>刪除</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}