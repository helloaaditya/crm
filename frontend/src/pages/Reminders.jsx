import { FiPlus } from 'react-icons/fi'

const Reminders = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Reminders</h1>
        <button className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700">
          <FiPlus className="mr-2" />
          Create Reminder
        </button>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Reminder management interface will be implemented here.</p>
      </div>
    </div>
  )
}

export default Reminders
