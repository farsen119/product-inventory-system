import { Link } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import ProductForm from '../components/products/ProductForm'
import { btnSecondary } from '../utils/ui'

export default function ProductCreate() {
  return (
    <div>
      <PageHeader
        title="Create Product"
        description="Add a product with variants. Sub-variants are generated automatically."
        action={
          <Link to="/products" className={btnSecondary}>
            Back to Products
          </Link>
        }
      />
      <ProductForm />
    </div>
  )
}
