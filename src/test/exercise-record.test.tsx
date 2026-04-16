import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ExerciseRecord from '../pages/ExerciseRecord'
import useStore from '../store/useStore'
import { clearAllData } from '../utils/storage'

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
})
