import React from 'react'

// Mobile Responsive Wrapper Component
export const MobileWrapper = ({ children, className = '' }) => {
  return (
    <div className={`w-full overflow-x-hidden ${className}`}>
      {children}
    </div>
  )
}

// Mobile Card Component
export const MobileCard = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  )
}

// Mobile Grid Component
export const MobileGrid = ({ children, cols = 1, className = '' }) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
  }
  
  return (
    <div className={`grid ${gridClasses[cols]} gap-4 sm:gap-6 ${className}`}>
      {children}
    </div>
  )
}

// Mobile Button Component
export const MobileButton = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors min-h-44'
  
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }
  
  const widthClasses = fullWidth ? 'w-full' : ''
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// Mobile Input Component
export const MobileInput = ({ 
  label, 
  required = false, 
  error = '', 
  className = '',
  ...props 
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

// Mobile Select Component
export const MobileSelect = ({ 
  label, 
  required = false, 
  error = '', 
  options = [],
  className = '',
  ...props 
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

// Mobile Table Component
export const MobileTable = ({ 
  headers = [], 
  data = [], 
  renderRow, 
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => renderRow(row, index))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile Cards */}
      <div className="lg:hidden">
        {data.map((row, index) => (
          <div key={index} className="p-4 border-b border-gray-200 last:border-b-0">
            {renderRow(row, index, true)}
          </div>
        ))}
      </div>
    </div>
  )
}

// Mobile Modal Component
export const MobileModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = '' 
}) => {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mobile-modal ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 sm:p-6 mobile-modal-content">
          {children}
        </div>
      </div>
    </div>
  )
}

// Mobile Page Header Component
export const MobilePageHeader = ({ 
  title, 
  subtitle = '', 
  actions = null, 
  className = '' 
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 ${className}`}>
      <div className="flex-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{title}</h1>
        {subtitle && (
          <p className="text-sm sm:text-base text-gray-600 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          {actions}
        </div>
      )}
    </div>
  )
}

// Mobile Search Bar Component
export const MobileSearchBar = ({ 
  value, 
  onChange, 
  placeholder = 'Search...', 
  onSubmit,
  className = '' 
}) => {
  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSubmit) onSubmit()
  }
  
  return (
    <form onSubmit={handleSubmit} className={`space-y-3 sm:space-y-0 sm:flex sm:items-center sm:space-x-4 ${className}`}>
      <div className="flex-1 relative">
        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
        />
      </div>
      <MobileButton type="submit" size="md">
        Search
      </MobileButton>
    </form>
  )
}

export default {
  MobileWrapper,
  MobileCard,
  MobileGrid,
  MobileButton,
  MobileInput,
  MobileSelect,
  MobileTable,
  MobileModal,
  MobilePageHeader,
  MobileSearchBar
}
