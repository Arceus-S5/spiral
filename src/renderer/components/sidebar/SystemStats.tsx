// ============================================================
// SystemStats — CPU・メモリ使用率をサイドバーに表示
// ============================================================
import { useEffect, useState } from 'react'

interface Stats {
  cpu: number
  memory: number
  memoryMB: number
}

export function SystemStats() {
  const [stats, setStats] = useState<Stats>({ cpu: 0, memory: 0, memoryMB: 0 })

  useEffect(() => {
    let prevIdle = 0, prevTotal = 0

    const update = async () => {
      // メモリ: performance.memory (Chrome/Electron で利用可能)
      const mem = (performance as any).memory
      const memoryMB = mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : 0
      const totalMB = mem ? Math.round(mem.jsHeapSizeLimit / 1024 / 1024) : 512
      const memory = Math.min(100, Math.round((memoryMB / totalMB) * 100))

      // CPU: mainプロセスから取得
      let cpu = stats.cpu
      try {
        const result = await (window as any).electronAPI?.invoke('system:getCpuUsage')
        if (typeof result === 'number') cpu = Math.round(result)
      } catch {}

      setStats({ cpu, memory, memoryMB })
    }

    update()
    const id = setInterval(update, 2000)
    return () => clearInterval(id)
  }, [])

  const cpuColor = stats.cpu > 80 ? '#ef4444' : stats.cpu > 50 ? '#f59e0b' : '#10b981'
  const memColor = stats.memory > 80 ? '#ef4444' : stats.memory > 60 ? '#f59e0b' : '#6B4FE8'

  return (
    <div style={{
      padding: '8px 10px',
      margin: '4px 6px',
      borderRadius: 10,
      background: 'rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
    }}>
      <StatBar label="CPU" value={stats.cpu} color={cpuColor} unit="%" />
      <StatBar label="RAM" value={stats.memory} color={memColor} unit={`% · ${stats.memoryMB}MB`} />
    </div>
  )
}

function StatBar({ label, value, color, unit }: {
  label: string; value: number; color: string; unit: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{value}{unit}</span>
      </div>
      <div style={{
        height: 4, borderRadius: 99,
        background: 'rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${value}%`,
          borderRadius: 99,
          background: color,
          transition: 'width 0.8s ease, background 0.3s',
        }} />
      </div>
    </div>
  )
}
