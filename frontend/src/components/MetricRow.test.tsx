import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MetricRow } from './MetricRow'

describe('MetricRow', () => {
  it('shows missing metrics as not recorded with an unavailable meter', () => {
    render(<MetricRow label="Expected assists" value={null} unit="per90" percentile={null} higherIsBetter />)
    expect(screen.getByText('Not recorded')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Expected assists percentile' })).toHaveAttribute(
      'aria-valuetext',
      'Not available',
    )
  })

  it('shows recorded values, including zero, with their percentile', () => {
    render(
      <MetricRow label="Dribbled past" value={0} unit="per90" percentile={92} higherIsBetter={false} weight={0.2} />,
    )
    expect(screen.getByText('0.00')).toBeInTheDocument()
    expect(screen.getByText('92nd')).toBeInTheDocument()
    expect(screen.getByText('(lower is better)')).toBeInTheDocument()
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '92')
  })
})
