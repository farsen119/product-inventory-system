import { useEffect, useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { getStockLevels } from '../../api/stock'
import LoadingSpinner from '../common/LoadingSpinner'
import { alertInfo } from '../../utils/ui'
import '../../utils/chartSetup'

export default function StockOverviewChart() {
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStockLevels({ page_size: 100 })
      .then(({ data }) => setLevels(data.results || []))
      .finally(() => setLoading(false))
  }, [])

  const chartData = useMemo(() => {
    const totals = levels.reduce((acc, row) => {
      const key = row.product_name || 'Unknown'
      acc[key] = (acc[key] || 0) + Number(row.stock || 0)
      return acc
    }, {})

    const labels = Object.keys(totals)
    return {
      labels,
      datasets: [
        {
          label: 'Total Stock',
          data: labels.map((label) => totals[label]),
          backgroundColor: 'rgba(13, 110, 253, 0.7)',
          borderColor: 'rgba(13, 110, 253, 1)',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }
  }, [levels])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Stock by Product',
        font: { size: 14, weight: '600' },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  }

  if (loading) {
    return <LoadingSpinner label="Loading chart..." />
  }

  if (!chartData.labels.length) {
    return (
      <div className={alertInfo}>No stock data available for chart.</div>
    )
  }

  return (
    <div style={{ height: '280px' }}>
      <Bar data={chartData} options={options} />
    </div>
  )
}
