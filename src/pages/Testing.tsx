import { useState, useEffect } from 'react'
import { CheckCircle, Clock, GitBranch, Code, Zap } from 'lucide-react'

const Testing = () => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const testFeatures = [
    {
      id: 1,
      name: 'GitHub Integration',
      status: '✅ Working',
      description: 'Changes are being deployed from GitHub',
      icon: <GitBranch className="h-6 w-6 text-green-600" />
    },
    {
      id: 2,
      name: 'Real-time Updates',
      status: '✅ Active',
      description: 'Live time updates are functioning',
      icon: <Clock className="h-6 w-6 text-blue-600" />
    },
    {
      id: 3,
      name: 'Code Deployment',
      status: '✅ Successful',
      description: 'Latest code changes are live',
      icon: <Code className="h-6 w-6 text-purple-600" />
    },
    {
      id: 4,
      name: 'Performance',
      status: '✅ Optimal',
      description: 'Application is running smoothly',
      icon: <Zap className="h-6 w-6 text-yellow-600" />
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🧪 Testing & Deployment Verification</h1>
        <p className="text-gray-600">This page is dedicated to testing GitHub deployment changes</p>
      </div>

      {/* Developer Info Card */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="text-center">
          <div className="text-4xl mb-4">👨‍💻</div>
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Rishabh Agarwal</h2>
          <p className="text-blue-700 mb-1">Full Stack Developer</p>
          <p className="text-blue-600 text-sm">Hotel Diplomat Residency Software</p>
        </div>
      </div>

      {/* Current Time Display */}
      <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-2">🕐 Live Time Display</h3>
          <p className="text-2xl font-mono text-green-700">
            {currentTime.toLocaleString()}
          </p>
          <p className="text-green-600 text-sm mt-1">
            This updates every second to verify real-time functionality
          </p>
        </div>
      </div>

      {/* Test Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testFeatures.map((feature) => (
          <div key={feature.id} className="card bg-white border-2 border-gray-200 hover:border-blue-300 transition-colors">
            <div className="flex items-center space-x-3">
              {feature.icon}
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{feature.name}</h4>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {feature.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Deployment Status */}
      <div className="card bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-purple-800 mb-2">🚀 Deployment Status</h3>
          <div className="flex items-center justify-center space-x-4">
            <div className="text-center">
              <div className="text-2xl">✅</div>
              <p className="text-sm text-purple-700">GitHub</p>
            </div>
            <div className="text-purple-400">→</div>
            <div className="text-center">
              <div className="text-2xl">✅</div>
              <p className="text-sm text-purple-700">Build</p>
            </div>
            <div className="text-purple-400">→</div>
            <div className="text-center">
              <div className="text-2xl">✅</div>
              <p className="text-sm text-purple-700">Deploy</p>
            </div>
            <div className="text-purple-400">→</div>
            <div className="text-center">
              <div className="text-2xl">✅</div>
              <p className="text-sm text-purple-700">Live</p>
            </div>
          </div>
          <p className="text-purple-600 text-sm mt-3">
            If you can see this page, your GitHub changes have been successfully deployed!
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="card bg-yellow-50 border-2 border-yellow-200">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">📝 Testing Instructions</h3>
        <div className="space-y-2 text-yellow-700">
          <p>1. Make changes to your code</p>
          <p>2. Commit and push to GitHub main branch</p>
          <p>3. Wait for deployment to complete</p>
          <p>4. Refresh this page to see your changes</p>
          <p>5. If you see this page with updated content, deployment was successful!</p>
        </div>
      </div>
    </div>
  )
}

export default Testing 