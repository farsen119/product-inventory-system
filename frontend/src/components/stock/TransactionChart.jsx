import { useEffect, useMemo, useState } from 'react'
import { getStockReport } from '../../api/stock'
import LoadingSpinner from '../common/LoadingSpinner'
import { alertInfo } from '../../utils/ui'
import '../../utils/chartSetup'
import { Doughnut } from 'react-chartjs-2'

export default function TransactionChart({ filterParams = {} }) {
  const [report, setReport] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const query = { page: 1, page_size: 200 }
    if (filterParams.start_date) query.start_date = filterParams.start_date
    if (filterParams.end_date) query.end_date = filterParams.end_date
    if (filterParams.product_id) query.product_id = filterParams.product_id
    if (filterParams.transaction_type) query.transaction_type = filterParams.transaction_type

    getStockReport(query)
      .then(({ data }) => setReport(data.results || []))
      .catch(() => setReport([]))
      .finally(() => setLoading(false))
  }, [
    filterParams.start_date,
    filterParams.end_date,
    filterParams.product_id,
    filterParams.transaction_type,
  ])

  const chartData = useMemo(() => {
    const totals = report.reduce(
      (acc, row) => {
        const type = row.transaction_type || 'OTHER'
        acc[type] = (acc[type] || 0) + Number(row.quantity || 0)
        return acc
      },
      { PURCHASE: 0, SALE: 0 },
    )

    return {
      labels: ['Purchase', 'Sale'],
      datasets: [
        {
          label: 'Quantity',
          data: [totals.PURCHASE || 0, totals.SALE || 0],
          backgroundColor: ['rgba(25, 135, 84, 0.8)', 'rgba(220, 53, 69, 0.8)'],
          borderColor: ['rgba(25, 135, 84, 1)', 'rgba(220, 53, 69, 1)'],
          borderWidth: 1,
        },
      ],
    }
  }, [report])

  if (loading) {
    return <LoadingSpinner label="Loading chart..." />
  }

  const hasData = chartData.datasets[0].data.some((value) => value > 0)

  if (!hasData) {
    return (
      <div className={alertInfo}>No transaction data to chart yet.</div>
    )
  }

  return (
    <div style={{ height: '260px' }}>
      <Doughnut
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            title: {
              display: true,
              text: 'Purchase vs Sale Volume',
              font: { size: 14, weight: '600' },
            },
          },
        }}
      />
    </div>
  )
}
