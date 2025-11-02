'use client'

import { useState, useEffect } from 'react'
import { Server, Network, Cloud, Shield, Activity, AlertCircle, CheckCircle, XCircle, Settings, Plus, Trash2 } from 'lucide-react'

interface Sensor {
  id: string
  name: string
  status: 'up' | 'down' | 'warning'
  value: string
  lastCheck: string
}

interface Category {
  id: string
  name: string
  icon: any
  sensors: Sensor[]
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([
    { id: 'hq', name: 'HQ', icon: Server, sensors: [] },
    { id: 'azure', name: 'AZURE', icon: Cloud, sensors: [] },
    { id: 'gcp', name: 'GCP', icon: Cloud, sensors: [] },
    { id: 'vpns', name: 'VPNs', icon: Shield, sensors: [] },
  ])

  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [prtgConfig, setPrtgConfig] = useState({
    server: '',
    username: '',
    passhash: '',
  })
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [newSensor, setNewSensor] = useState({
    id: '',
    name: '',
  })

  useEffect(() => {
    const savedConfig = localStorage.getItem('prtgConfig')
    if (savedConfig) {
      setPrtgConfig(JSON.parse(savedConfig))
    }

    const savedCategories = localStorage.getItem('categories')
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories))
    }

    const interval = setInterval(() => {
      refreshSensors()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const refreshSensors = async () => {
    if (!prtgConfig.server) return

    const updatedCategories = await Promise.all(
      categories.map(async (category) => {
        const updatedSensors = await Promise.all(
          category.sensors.map(async (sensor) => {
            try {
              const response = await fetch(
                `/api/prtg?server=${encodeURIComponent(prtgConfig.server)}&username=${encodeURIComponent(prtgConfig.username)}&passhash=${encodeURIComponent(prtgConfig.passhash)}&sensorId=${sensor.id}`
              )

              if (response.ok) {
                const data = await response.json()
                return {
                  ...sensor,
                  status: data.status,
                  value: data.value,
                  lastCheck: new Date().toLocaleTimeString(),
                }
              }
            } catch (error) {
              console.error('Error fetching sensor data:', error)
            }
            return sensor
          })
        )
        return { ...category, sensors: updatedSensors }
      })
    )

    setCategories(updatedCategories)
    localStorage.setItem('categories', JSON.stringify(updatedCategories))
  }

  const addSensor = () => {
    if (!newSensor.id || !newSensor.name || !selectedCategory) return

    const updatedCategories = categories.map((category) => {
      if (category.id === selectedCategory) {
        return {
          ...category,
          sensors: [
            ...category.sensors,
            {
              id: newSensor.id,
              name: newSensor.name,
              status: 'up' as const,
              value: 'Loading...',
              lastCheck: 'Never',
            },
          ],
        }
      }
      return category
    })

    setCategories(updatedCategories)
    localStorage.setItem('categories', JSON.stringify(updatedCategories))
    setShowAddModal(false)
    setNewSensor({ id: '', name: '' })
    setSelectedCategory('')

    refreshSensors()
  }

  const removeSensor = (categoryId: string, sensorId: string) => {
    const updatedCategories = categories.map((category) => {
      if (category.id === categoryId) {
        return {
          ...category,
          sensors: category.sensors.filter((s) => s.id !== sensorId),
        }
      }
      return category
    })

    setCategories(updatedCategories)
    localStorage.setItem('categories', JSON.stringify(updatedCategories))
  }

  const saveConfig = () => {
    localStorage.setItem('prtgConfig', JSON.stringify(prtgConfig))
    setShowConfigModal(false)
    refreshSensors()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default:
        return <Activity className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up':
        return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700'
      case 'down':
        return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700'
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
      default:
        return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
    }
  }

  const getCategoryStats = (category: Category) => {
    const total = category.sensors.length
    const up = category.sensors.filter((s) => s.status === 'up').length
    const down = category.sensors.filter((s) => s.status === 'down').length
    const warning = category.sensors.filter((s) => s.status === 'warning').length
    return { total, up, down, warning }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">NOC Monitoring Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Real-time PRTG Network Monitoring</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Settings className="w-5 h-5" />
              Configure PRTG
            </button>
            <button
              onClick={() => refreshSensors()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Activity className="w-5 h-5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {categories.map((category) => {
            const Icon = category.icon
            const stats = getCategoryStats(category)

            return (
              <div key={category.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                {/* Category Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{category.name}</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{stats.total} sensors</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCategory(category.id)
                      setShowAddModal(true)
                    }}
                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Stats Bar */}
                <div className="flex gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700 dark:text-gray-300">Up: {stats.up}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-gray-700 dark:text-gray-300">Warning: {stats.warning}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-700 dark:text-gray-300">Down: {stats.down}</span>
                  </div>
                </div>

                {/* Sensors List */}
                <div className="space-y-3">
                  {category.sensors.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No sensors added yet. Click the + button to add sensors.
                    </div>
                  ) : (
                    category.sensors.map((sensor) => (
                      <div
                        key={sensor.id}
                        className={`p-4 rounded-lg border-2 ${getStatusColor(sensor.status)} transition-all`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            {getStatusIcon(sensor.status)}
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white">{sensor.name}</h3>
                              <div className="flex items-center gap-4 mt-1">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Value: {sensor.value}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  Last check: {sensor.lastCheck}
                                </p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeSensor(category.id, sensor.id)}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Sensor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Add Sensor</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sensor ID
                </label>
                <input
                  type="text"
                  value={newSensor.id}
                  onChange={(e) => setNewSensor({ ...newSensor, id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., 2001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sensor Name
                </label>
                <input
                  type="text"
                  value={newSensor.name}
                  onChange={(e) => setNewSensor({ ...newSensor, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Core Switch"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={addSensor}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Sensor
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setNewSensor({ id: '', name: '' })
                    setSelectedCategory('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">PRTG Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Server URL
                </label>
                <input
                  type="text"
                  value={prtgConfig.server}
                  onChange={(e) => setPrtgConfig({ ...prtgConfig, server: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://prtg.example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={prtgConfig.username}
                  onChange={(e) => setPrtgConfig({ ...prtgConfig, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Passhash
                </label>
                <input
                  type="text"
                  value={prtgConfig.passhash}
                  onChange={(e) => setPrtgConfig({ ...prtgConfig, passhash: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="1234567890"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveConfig}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Configuration
                </button>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
