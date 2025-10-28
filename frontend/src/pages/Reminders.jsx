import { FiPlus } from 'react-icons/fi'

const Reminders = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Reminders</h1>
        <button className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base">
          <FiPlus className="mr-2" />
          Create Reminder
        </button>
      </div>
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <p className="text-sm sm:text-base text-gray-600">Reminder management interface will be implemented here.</p>
      </div>
    </div>
  )
}

export default Reminders
