import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import ProductEditForm from '../components/products/ProductEditForm'
import { btnSecondary } from '../utils/ui'

export default function ProductEdit() {
  const { id } = useParams()

  return (
    <div>
      <PageHeader
        title="Edit Product"
        description="Update product details and manage variants."
        action={
          <Link to="/products" className={btnSecondary}>
            Back to Products
          </Link>
        }
      />
      <ProductEditForm productId={id} />
    </div>
  )
}
