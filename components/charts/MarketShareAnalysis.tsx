'use client'

import { useEffect, useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { generateMarketShareData, MarketShareData, loadCompetitiveIntelligenceData } from '@/lib/competitive-intelligence-data'
import { useDashboardStore } from '@/lib/store'
import { GeographyMultiSelect } from '@/components/filters/GeographyMultiSelect'
import { Filter, X } from 'lucide-react'

interface MarketShareAnalysisProps {
  year?: number
}

export function MarketShareAnalysis({ year: propYear = 2025 }: MarketShareAnalysisProps) {
  const { data, filters, updateFilters } = useDashboardStore()
  const [marketShareData, setMarketShareData] = useState<MarketShareData[]>([])
  const [allCompaniesData, setAllCompaniesData] = useState<MarketShareData[]>([])
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart')
  const [selectedYear, setSelectedYear] = useState<number>(propYear)
  const [showFilters, setShowFilters] = useState(false)

  // Get available years from metadata
  const availableYears = useMemo(() => {
    if (data?.metadata?.years) {
      return data.metadata.years.sort((a, b) => a - b)
    }
    // Fallback: generate years from start_year to forecast_year
    if (data?.metadata?.start_year && data?.metadata?.forecast_year) {
      const years: number[] = []
      for (let y = data.metadata.start_year; y <= data.metadata.forecast_year; y++) {
        years.push(y)
      }
      return years
    }
    return [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]
  }, [data])

  // Filter data based on selected filters
  const filteredMarketShareData = useMemo(() => {
    // For now, we'll use the generated data, but in the future this could filter based on geography/year
    return marketShareData
  }, [marketShareData, filters.geographies, selectedYear])

  const filteredAllCompaniesData = useMemo(() => {
    return allCompaniesData
  }, [allCompaniesData, filters.geographies, selectedYear])

  useEffect(() => {
    const abortController = new AbortController()
    let isMounted = true
    
    async function loadData() {
      if (!isMounted || abortController.signal.aborted) return
      
      const chartData = await generateMarketShareData(10) // Top 10 for chart
      
      if (isMounted && !abortController.signal.aborted) {
        setMarketShareData(chartData)
      }
      
      // Load all companies for table view
      if (isMounted && !abortController.signal.aborted) {
        const jsonData = await loadCompetitiveIntelligenceData()
        if (jsonData && jsonData.market_share_data) {
          const sorted = [...jsonData.market_share_data].sort((a, b) => b.marketShare - a.marketShare)
          if (isMounted && !abortController.signal.aborted) {
            setAllCompaniesData(sorted)
          }
        }
      }
    }
    
    loadData()
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [])

  // No labels on chart - percentages only in tooltip
  const renderCustomLabel = () => null

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0]
    const marketSize = 5000 // Total market size in Cr INR
    const revenue = (data.value / 100) * marketSize
    
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-black mb-2">{data.name}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-sm text-black">Market Share:</span>
            <span className="text-sm font-semibold text-black">{data.value.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-sm text-black">Revenue (Cr INR):</span>
            <span className="text-sm font-semibold text-black">
              {revenue.toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Custom legend - show in a more compact grid format
  const renderLegend = (props: any) => {
    const { payload } = props
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 mt-4 max-h-48 overflow-y-auto">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-black truncate" title={entry.value}>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-6">
      {/* Filters Section */}
      <div className="mb-4 border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-black flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </h4>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
            {/* Geography Filter */}
            <div>
              <label className="block text-xs font-medium text-black mb-2">
                Geography
              </label>
              <GeographyMultiSelect />
            </div>
            
            {/* Year Filter */}
            <div>
              <label className="block text-xs font-medium text-black mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Active Filters Summary */}
            {(filters.geographies.length > 0 || selectedYear !== propYear) && (
              <div className="md:col-span-2 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-black">
                    <span className="font-medium">Active Filters:</span>
                    <span className="ml-2">
                      {filters.geographies.length > 0 && (
                        <span className="inline-block mr-2">
                          Geography: {filters.geographies.length} selected
                        </span>
                      )}
                      {selectedYear !== propYear && (
                        <span className="inline-block">
                          Year: {selectedYear}
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      updateFilters({ geographies: [] })
                      setSelectedYear(propYear)
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    title="Clear all filters"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('chart')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'chart'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-black hover:text-black'
          }`}
        >
          Chart View
        </button>
        <button
          onClick={() => setActiveTab('table')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'table'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-black hover:text-black'
          }`}
        >
          All Companies ({filteredAllCompaniesData.length})
        </button>
      </div>

      {activeTab === 'chart' ? (
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Pie Chart */}
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={450}>
              <PieChart>
                <Pie
                  data={filteredMarketShareData as any}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={150}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="marketShare"
                  nameKey="company"
                  paddingAngle={2}
                >
                  {filteredMarketShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderLegend} />
              </PieChart>
            </ResponsiveContainer>
          </div>

        {/* Market Stats */}
        <div className="lg:w-80">
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="space-y-3">
              {filteredMarketShareData.slice(0, 5).map((company, idx) => (
                <div key={company.company} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-black w-4">{idx + 1}.</span>
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: company.color }}
                    />
                    <span className="text-sm text-black">{company.company}</span>
                  </div>
                  <span className="text-sm font-semibold text-black">
                    {company.marketShare.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-black">Top 5 Total:</span>
                <span className="font-semibold text-black">
                  {filteredMarketShareData.slice(0, 5).reduce((sum, c) => sum + c.marketShare, 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-black">Year:</span>
                <span className="font-semibold text-black">{selectedYear}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-black">Companies Shown:</span>
                <span className="font-semibold text-black">
                  Top {filteredMarketShareData.filter(c => c.company !== 'Others').length} + Others
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      ) : (
        /* Table View */
        <div className="w-full">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-black">All Companies Market Share ({selectedYear})</h3>
              <span className="text-xs text-black">Total: {filteredAllCompaniesData.length} companies</span>
            </div>
          </div>
          
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-gray-100 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider border-b border-gray-200">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider border-b border-gray-200">
                    Company Name
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-black uppercase tracking-wider border-b border-gray-200">
                    Market Share
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-black uppercase tracking-wider border-b border-gray-200">
                    Revenue (Cr INR)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-black uppercase tracking-wider border-b border-gray-200 w-16">
                    Color
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAllCompaniesData.map((company, index) => {
                  const marketSize = 5000 // Total market size in Cr INR
                  const revenue = (company.marketShare / 100) * marketSize
                  
                  return (
                    <tr key={company.company} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-black">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-black">
                        {company.company}
                      </td>
                      <td className="px-4 py-3 text-sm text-black text-right">
                        {company.marketShare.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-black text-right">
                        {revenue.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div 
                          className="w-6 h-6 rounded-full mx-auto border border-gray-300"
                          style={{ backgroundColor: company.color }}
                          title={company.company}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-black">
                    Total
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-black text-right">
                    {filteredAllCompaniesData.reduce((sum, c) => sum + c.marketShare, 0).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-black text-right">
                    {filteredAllCompaniesData.reduce((sum, c) => {
                      const marketSize = 5000
                      return sum + ((c.marketShare / 100) * marketSize)
                    }, 0).toFixed(0)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
