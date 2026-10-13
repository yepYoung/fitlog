import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ExerciseRecord from '../pages/ExerciseRecord'
import Cycling from '../pages/Cycling'
import useStore from '../store/useStore'
import { clearAllData } from '../utils/storage'

vi.mock('../components/RouteMap', () => ({ default: () => <div data-testid="cycling-map" /> }))

beforeEach(() => {
  clearAllData()
  useStore.setState({
    records: [],
    settings: useStore.getState().settings,
    timer: { running: false, startedAt: null, base: 120 },
    exerciseDraft: null,
  })
})

function renderExerciseRecord() {
  return render(
    <MemoryRouter initialEntries={['/record/exercise']}>
      <Routes>
        <Route path="/record/exercise" element={<ExerciseRecord />} />
        <Route path="/record/exercise/cycling" element={<Cycling />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ExerciseRecord', () => {
  it('restores unsaved draft after remounting the page', () => {
    const firstView = renderExerciseRecord()

    fireEvent.change(screen.getByPlaceholderText('如：卧推、深蹲'), { target: { value: '卧推' } })
    fireEvent.change(screen.getByPlaceholderText('重量'), { target: { value: '60' } })
    fireEvent.change(screen.getByPlaceholderText('次数'), { target: { value: '8' } })
    fireEvent.change(screen.getByPlaceholderText('感受、调整...'), { target: { value: '第1组稳定' } })

    firstView.unmount()

    renderExerciseRecord()

    expect(screen.getByPlaceholderText('如：卧推、深蹲')).toHaveValue('卧推')
    expect(screen.getByPlaceholderText('重量')).toHaveValue(60)
    expect(screen.getByPlaceholderText('次数')).toHaveValue(8)
    expect(screen.getByPlaceholderText('感受、调整...')).toHaveValue('第1组稳定')
  })

  it('opens cycling from cardio and restores the unsaved exercise form on return', () => {
    renderExerciseRecord()
    expect(screen.queryByRole('button', { name: '骑行地图' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '🏃 有氧运动' }))
    fireEvent.click(screen.getByRole('button', { name: '跑步' }))
    fireEvent.click(screen.getByRole('button', { name: '关闭计时器' }))
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '20' } })
    fireEvent.change(screen.getByPlaceholderText('感受、调整...'), { target: { value: '有氧草稿' } })

    fireEvent.click(screen.getByRole('button', { name: '骑行地图' }))
    expect(screen.getByRole('heading', { name: '骑行地图' })).toBeInTheDocument()
    expect(screen.getByTestId('cycling-map')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '返回' }))

    expect(screen.getByRole('heading', { name: '记录运动' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('如：跑步、椭圆机')).toHaveValue('跑步')
    expect(screen.getByPlaceholderText('0')).toHaveValue(20)
    expect(screen.getByPlaceholderText('感受、调整...')).toHaveValue('有氧草稿')
    expect(screen.getByRole('button', { name: '骑行地图' })).toBeInTheDocument()
    expect(useStore.getState().records).toEqual([])
  })
})
