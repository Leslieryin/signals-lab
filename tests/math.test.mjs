// 信号与系统实验台 · 数学核心测试
// 被测代码从 index.html 的 [MATH-BEGIN]..[MATH-END] 标记间切片加载，
// 保证测试覆盖的正是页面上跑的那份实现。
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const m = html.match(/\/\/ \[MATH-BEGIN\]([\s\S]*?)\/\/ \[MATH-END\]/)
if (!m) throw new Error('index.html 缺少 [MATH-BEGIN]/[MATH-END] 标记，测试无法切片')
const math = new Function(
  m[1] + '; return { harmonicsSquare, aliasFreq, rcGainDb, amSideband, carrierPowerPct, convRectRect };',
)()

let passed = 0
function check(name, fn) {
  fn()
  passed++
  console.log('  ✓', name)
}

console.log('采样与混叠')
check('欠采样 f0=5 fs=8 → 混叠 3kHz', () => {
  assert.equal(Math.abs(math.aliasFreq(5, 8)), 3)
})
check('过采样 f0=3 fs=8 → 无混叠（|alias|=3=f0）', () => {
  assert.equal(Math.abs(math.aliasFreq(3, 8)), 3)
})
check('f0 恰为 fs/2 边界 → alias 落在 ±fs/2', () => {
  assert.equal(Math.abs(math.aliasFreq(4, 8)), 4)
})

console.log('傅里叶级数（方波合成）')
check('基波峰值 = 4/π ≈ 1.2732', () => {
  const peak = Math.max(...Array.from({ length: 4000 }, (_, i) =>
    math.harmonicsSquare((2 * i) / 4000, 1)))
  assert.ok(Math.abs(peak - 4 / Math.PI) < 1e-3, `peak=${peak}`)
})
check('N=99 吉布斯过冲 ≈ 8.95%（±0.15%）', () => {
  let peak = -Infinity
  for (let i = 0; i <= 20000; i++) {
    peak = Math.max(peak, math.harmonicsSquare((2 * i) / 20000, 99))
  }
  const overshoot = ((peak - 1) / 2) * 100
  assert.ok(Math.abs(overshoot - 8.95) < 0.15, `overshoot=${overshoot}%`)
})
check('合成波穿过跳变中点（t=0 处 ≈ 0）', () => {
  assert.ok(Math.abs(math.harmonicsSquare(0, 51)) < 0.05)
})

console.log('卷积')
check('矩形(宽2)⊛矩形(宽1) 峰值 = min(2,1) = 1', () => {
  const peak = math.convRectRect(2, 1, 0.004)
  assert.ok(Math.abs(peak - 1) < 0.01, `peak=${peak}`)
})
check('矩形(宽2)⊛矩形(宽2) 峰值 = 2', () => {
  const peak = math.convRectRect(2, 2, 0.004)
  assert.ok(Math.abs(peak - 2) < 0.02, `peak=${peak}`)
})

console.log('RC 滤波器')
check('低通 @fc = −3.0103 dB', () => {
  assert.ok(Math.abs(math.rcGainDb(1, 'low') + 3.0103) < 1e-3)
})
check('低通 十倍频 ≈ −20.04 dB（−20dB/dec 渐近）', () => {
  assert.ok(Math.abs(math.rcGainDb(10, 'low') + 20.0432) < 0.05)
})
check('高通 @fc = −3.0103 dB', () => {
  assert.ok(Math.abs(math.rcGainDb(1, 'high') + 3.0103) < 1e-3)
})

console.log('AM 调幅')
check('m=0.7 → 边带 0.35 = m/2', () => {
  assert.equal(math.amSideband(0.7), 0.35)
})
check('m=1 → 载波功率占比 66.7%', () => {
  assert.ok(Math.abs(math.carrierPowerPct(1) - 100 / 1.5) < 1e-9)
})

console.log(`\n全部 ${passed} 项数学锚点通过 ✓`)
