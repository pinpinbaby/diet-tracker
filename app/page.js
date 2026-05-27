'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const DEFAULT_MEALS = ['早餐', '午餐', '下午茶', '晚餐']

export default function Home() {
  const [user, setUser] = useState(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [meals, setMeals] = useState([])
  const [goals, setGoals] = useState({ calories: 2000, protein: 60, carbs: 250, fat: 65 })
  const [activeTab, setActiveTab] = useState('diet')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login'
      else { setUser(data.user); setLoading(false) }
    })
  }, [])

  useEffect(() => {
    if (user) { fetchMeals(); fetchGoals() }
  }, [user, currentDate])

  const dateKey = (d) => d.toISOString().split('T')[0]
  const fmtDate = (d) => d.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' })

  async function fetchMeals() {
    const { data } = await supabase.from('meals').select('*')
      .eq('user_id', user.id).eq('date', dateKey(currentDate)).order('created_at')
    if (data && data.length > 0) setMeals(data)
    else {
      const defaults = DEFAULT_MEALS.map(name => ({ meal_name: name, food: '', calories: '', protein: '', carbs: '', fat: '' }))
      setMeals(defaults)
    }
  }

  async function fetchGoals() {
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).single()
    if (data) setGoals(data)
  }

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
    const newMeal = { meal_name: `加餐 ${meals.length - 3}`, food: '', calories: '', protein: '', carbs: '', fat: '' }
    setMeals([...meals, newMeal])
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center">
        <h1 className="font-bold text-lg">飲食追蹤</h1>
        <button onClick={logout} className="text-sm text-gray-400">登出</button>
      </div>

      <div className="flex border-b bg-white">
        {['diet', 'goal', 'weight'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === tab ? 'border-b-2 border-black' : 'text-gray-400'}`}>
            {tab === 'diet' ? '飲食紀錄' : tab === 'goal' ? '目標設定' : '體重'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === 'diet' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d) }}
                className="px-3 py-1 border rounded-lg text-sm">◀</button>
              <span className="font-medium text-sm">{fmtDate(currentDate)}</span>
              <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d) }}
                className="px-3 py-1 border rounded-lg text-sm">▶</button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {[['熱量', 'calories', 'kcal'], ['蛋白質', 'protein', 'g'], ['碳水', 'carbs', 'g'], ['脂質', 'fat', 'g']].map(([label, key, unit]) => (
                <div key={key} className="bg-white rounded-xl p-3 border text-center">
                  <div className="text-xs text-gray-400 mb-1">{label}</div>
                  <div className="font-bold text-sm">{Math.round(totals[key])}</div>
                  <div className="text-xs text-gray-400">{unit}</div>
                  <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full" style={{ width: `${Math.min(goals[key] > 0 ? totals[key] / goals[key] * 100 : 0, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {meals.map((meal, i) => (
              <div key={i} className="bg-white rounded-xl border p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium text-sm">{meal.meal_name}</span>
                  {i >= 4 && <button onClick={() => deleteMeal(i)} className="text-gray-300 text-lg">×</button>}
                </div>
                <input className="w-full border rounded-lg px-3 py-2 text-sm mb-2" placeholder="食物描述"
                  defaultValue={meal.food} onBlur={e => saveMeal(i, 'food', e.target.value)} />
                <div className="grid grid-cols-4 gap-2">
                  {[['熱量', 'calories'], ['蛋白質', 'protein'], ['碳水', 'carbs'], ['脂質', 'fat']].map(([label, key]) => (
                    <div key={key}>
                      <div className="text-xs text-gray-400 mb-1">{label}</div>
                      <input className="w-full border rounded-lg px-2 py-1 text-sm text-center" type="number" placeholder="0"
                        defaultValue={meal[key]} onBlur={e => saveMeal(i, key, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button onClick={addMeal} className="w-full border border-dashed rounded-xl py-3 text-sm text-gray-400 mt-1">
              ＋ 新增一餐
            </button>
          </>
        )}

        {activeTab === 'goal' && (
          <div className="bg-white rounded-xl border p-4">
            <h2 className="font-medium mb-4">每日營養目標</h2>
            {[['熱量 (kcal)', 'calories'], ['蛋白質 (g)', 'protein'], ['碳水化合物 (g)', 'carbs'], ['脂質 (g)', 'fat']].map(([label, key]) => (
              <div key={key} className="mb-3">
                <div className="text-sm text-gray-500 mb-1">{label}</div>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" type="number"
                  value={goals[key]} onChange={e => setGoals({ ...goals, [key]: e.target.value })} />
              </div>
            ))}
            <button onClick={saveGoals} className="w-full bg-black text-white rounded-lg py-2 text-sm mt-2">儲存目標</button>
          </div>
        )}
        {activeTab === 'weight' && (
  <div className="text-center py-8">
    <button onClick={() => window.location.href = '/weight'}
      className="bg-black text-white rounded-xl px-6 py-3 text-sm">
      開啟體重追蹤
    </button>
  </div>
)}
      </div>
    </div>
  )
}