import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Expense Manager</h1>
      <p className="mt-2 text-gray-600">
        Use the sidebar to open Ledger, Dashboard, Payment methods, Categories, or Custom query.
      </p>
      <ul className="mt-4 list-inside list-disc space-y-1 text-gray-600">
        <li>
          <Link to="/ledger" className="text-blue-600 hover:underline">Ledger</Link>
        </li>
        <li>
          <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
        </li>
        <li>
          <Link to="/payment-methods" className="text-blue-600 hover:underline">Payment methods</Link>
        </li>
        <li>
          <Link to="/categories" className="text-blue-600 hover:underline">Categories</Link>
        </li>
        <li>
          <Link to="/custom-query" className="text-blue-600 hover:underline">Custom query</Link>
        </li>
      </ul>
    </div>
  )
}
