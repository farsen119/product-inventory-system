import { Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from './components/AdminRoute'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProductCreate from './pages/ProductCreate'
import ProductEdit from './pages/ProductEdit'
import Categories from './pages/Categories'
import ProductList from './pages/ProductList'
import StockManagement from './pages/StockManagement'
import StockReport from './pages/StockReport'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/products/create" element={<ProductCreate />} />
          <Route path="/products/:id/edit" element={<ProductEdit />} />
          <Route path="/stock" element={<StockManagement />} />
          <Route
            path="/categories"
            element={
              <AdminRoute>
                <Categories />
              </AdminRoute>
            }
          />
          <Route
            path="/stock/report"
            element={
              <AdminRoute>
                <StockReport />
              </AdminRoute>
            }
          />
          <Route path="/stock-report" element={<Navigate to="/stock/report" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
