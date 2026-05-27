'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const DEFAULT_MEALS = ['早餐', '午餐', '下午茶', '晚餐']
const deepBlue = '#1D3461'
const lightBlue = '#5B9BD5'
const lightBlueBg = '#EBF3FB'
const card = { background: '#fff', borderRadius: 18, padding: 16, marginBottom: 10 }

export default function Home() {
  const [user, setUser] = useState(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [meals, setMeals] = useState([])
  const [goals, setGoals] = useState({ calories: 2000, protein: 60, carbs: 250, fat: 65, weight: 0 })
  const [activeTab, setActiveTab] = useState('diet')
  const [loading, setLoading] = useState(true)

  const dateKey = (d) => d.toISOString().split('T')[0]
  const fmtDate = (d) => d.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' })

  const fetchMeals = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('meals').select('*')
      .eq('user_id', user.id).eq('date', dateKey(currentDate)).order('created_at')
    if (data && data.length > 0) setMeals(data)
    else setMeals(DEFAULT_MEALS.map(name => ({ meal_name: name, food: '', calories: '', protein: '', carbs: '', fat: '' })))
  }, [user, currentDate])

  const fetchGoals = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).single()
    if (data) setGoals(data)
  }, [user])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login'
      else { setUser(data.user); setLoading(false) }
    })
  }, [])

  useEffect(() => {
    if (user) { fetchMeals(); fetchGoals() }
  }, [user, currentDate, fetchMeals, fetchGoals])

  async function saveMeal(index, field, value) {
    const updated = [...meals]
    updated[index] = { ...updated[index], [field]: value }
    setMeals(updated)
    const meal = updated[index]
    if (meal.id) {
      await supabase.from('meals').update({ [field]: value }).eq('id', meal.id)
    } else {
      const { data } = await supabase.from('meals').insert({
        user_id: user.id, date: dateKey(currentDate),
        meal_name: meal.meal_name, food: meal.food || '',
        calories: meal.calories || 0, protein: meal.protein || 0,
        carbs: meal.carbs || 0, fat: meal.fat || 0
      }).select().single()
      if (data) { updated[index] = data; setMeals([...updated]) }
    }
  }

  async function addMeal() {
    setMeals([...meals, { meal_name: '加餐', food: '', calories: '', protein: '', carbs: '', fat: '' }])
  }

  async function deleteMeal(index) {
    const meal = meals[index]
    if (meal.id) await supabase.from('meals').delete().eq('id', meal.id)
    setMeals(meals.filter((_, i) => i !== index))
  }

  async function saveGoals() {
    await supabase.from('goals').upsert({ user_id: user.id, ...goals })
    alert('目標已儲存！')
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + (parseFloat(m.calories) || 0),
    protein: acc.protein + (parseFloat(m.protein) || 0),
    carbs: acc.carbs + (parseFloat(m.carbs) || 0),
    fat: acc.fat + (parseFloat(m.fat) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f2f2f7' }}>載入中...</div>
  )

  return (
    <div style={{ background: '#f2f2f7', minHeight: '100vh', maxWidth: 512, margin: '0 auto', paddingBottom: 80 }}>

      <div style={{ background: '#fff', padding: '48px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: deepBlue }}>飲食追蹤</h1>
        <button onClick={logout} style={{ fontSize: 13, color: '#8e8e93', border: 'none', background: 'none', cursor: 'pointer' }}>登出</button>
      </div>

      <div style={{ padding: 16 }}>

        {activeTab === 'diet' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d) }}
                style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', border: 'none', fontSize: 20, color: deepBlue, cursor: 'pointer' }}>‹</button>
              <span style={{ fontWeight: 600, fontSize: 15, color: deepBlue }}>{fmtDate(currentDate)}</span>
              <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d) }}
                style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', border: 'none', fontSize: 20, color: deepBlue, cursor: 'pointer' }}>›</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[['熱量', 'calories', 'kcal'], ['蛋白質', 'protein', 'g'], ['碳水', 'carbs', 'g'], ['脂質', 'fat', 'g']].map(([label, key, unit]) => {
                const val = Math.round(totals[key])
                const goal = parseFloat(goals[key]) || 0
                const pct = goal > 0 ? Math.min(Math.round(val / goal * 100), 100) : 0
                return (
                  <div key={key} style={{ ...card, padding: 14 }}>
                    <div style={{ fontSize: 11, color: '#8e8e93', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: deepBlue, marginBottom: 2 }}>{val}</div>
                    <div style={{ fontSize: 11, color: '#8e8e93', marginBottom: 6 }}>{val} / {goal} {unit}</div>
                    <div style={{ height: 5, background: lightBlueBg, borderRadius: 3, overflow: 'hidden', marginBottom: 3 }}>
                      <div style={{ height: 5, width: `${pct}%`, background: lightBlue, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 11, color: lightBlue }}>{pct}%</div>
                  </div>
                )
              })}
            </div>

            {meals.map((meal, i) => (
              <div key={i} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  {i >= 4 ? (
                    <input style={{ fontSize: 15, fontWeight: 700, color: deepBlue, border: 'none', background: 'transparent', outline: 'none', flex: 1 }}
                      defaultValue={meal.meal_name}
                      onBlur={e => saveMeal(i, 'meal_name', e.target.value)} />
                  ) : (
                    <span style={{ fontSize: 15, fontWeight: 700, color: deepBlue }}>{meal.meal_name}</span>
                  )}
                  {i >= 4 && (
                    <button onClick={() => deleteMeal(i)} style={{ fontSize: 22, color: '#ccc', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
                  )}
                </div>
                <input style={{ width: '100%', background: '#f2f2f7', borderRadius: 12, padding: '8px 12px', fontSize: 13, color: deepBlue, border: 'none', outline: 'none', marginBottom: 10 }}
                  placeholder="食物描述" defaultValue={meal.food}
                  onBlur={e => saveMeal(i, 'food', e.target.value)} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {[['熱量', 'calories'], ['蛋白質', 'protein'], ['碳水', 'carbs'], ['脂質', 'fat']].map(([label, key]) => (
                    <div key={key}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: lightBlue, marginBottom: 4 }}>{label}</div>
                      <input style={{ width: '100%', background: '#f2f2f7', borderRadius: 10, padding: '6px 4px', fontSize: 12, color: deepBlue, border: 'none', outline: 'none', textAlign: 'center' }}
                        type="number" placeholder="0" defaultValue={meal[key]}
                        onBlur={e => saveMeal(i, key, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button onClick={addMeal} style={{ width: '100%', background: '#fff', borderRadius: 18, padding: 14, fontSize: 13, color: '#8e8e93', border: 'none', cursor: 'pointer' }}>
              ＋ 新增一餐
            </button>
          </>
        )}

        {activeTab === 'goal' && (
          <>
            <div style={{ ...card, padding: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: deepBlue, marginBottom: 16 }}>每日營養目標</h2>
              {[['熱量 (kcal)', 'calories'], ['蛋白質 (g)', 'protein'], ['碳水化合物 (g)', 'carbs'], ['脂質 (g)', 'fat'], ['體重目標 (kg)', 'weight']].map(([label, key]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: lightBlue, marginBottom: 6 }}>{label}</div>
                  <input style={{ width: '100%', background: '#f2f2f7', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: deepBlue, border: 'none', outline: 'none' }}
                    type="number" value={goals[key] || ''}
                    onChange={e => setGoals({ ...goals, [key]: e.target.value })} />
                </div>
              ))}
              <button onClick={saveGoals} style={{ width: '100%', background: deepBlue, color: '#fff', borderRadius: 14, padding: 13, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                儲存目標
              </button>
            </div>

            <div style={{ ...card, padding: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: deepBlue, marginBottom: 12 }}>目前設定</h2>
              {[['熱量', 'calories', 'kcal'], ['蛋白質', 'protein', 'g'], ['碳水化合物', 'carbs', 'g'], ['脂質', 'fat', 'g'], ['體重目標', 'weight', 'kg']].map(([label, key, unit], idx, arr) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: idx < arr.length - 1 ? '0.5px solid #f2f2f7' : 'none' }}>
                  <span style={{ fontSize: 13, color: '#8e8e93' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: deepBlue }}>{goals[key] || '—'} {goals[key] ? unit : ''}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'weight' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚖️</div>
            <p style={{ color: '#8e8e93', fontSize: 13, marginBottom: 20 }}>前往體重追蹤頁面</p>
            <button onClick={() => window.location.href = '/weight'}
              style={{ background: deepBlue, color: '#fff', borderRadius: 18, padding: '13px 32px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              開啟體重追蹤
            </button>
          </div>
        )}

      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 512, background: '#fff', borderTop: '0.5px solid #f2f2f7', display: 'flex' }}>
        {[{ id: 'diet', label: '飲食', icon: '🥗' }, { id: 'goal', label: '目標', icon: '🎯' }, { id: 'weight', label: '體重', icon: '⚖️' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, padding: '10px 0 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, border: 'none', background: 'none', cursor: 'pointer', color: activeTab === tab.id ? deepBlue : '#8e8e93' }}>
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            <span style={{ fontSize: 11, fontWeight: activeTab === tab.id ? 700 : 400 }}>{tab.label}</span>
          </button>
        ))}
      </div>

    </div>
  )
}