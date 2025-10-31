import { FiDollarSign } from 'react-icons/fi'

const Expenses = () => {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Expense Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage petrol, reimbursements, and other expenses</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 sm:p-6 text-gray-700">
        <div className="flex items-center text-gray-500">
          <FiDollarSign className="mr-2" />
          Expense module placeholder
        </div>
        <p className="mt-2 text-sm">Accessible only to main admins. Add listing, create and approvals here.</p>
      </div>
    </div>
  )
}

export default Expenses


