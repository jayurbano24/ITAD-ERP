import PartInventoryDashboard from './components/PartInventoryDashboard'
import {
  getGoodWarehouseParts,
  getHarvestingWarehouseParts,
  getCatalogBrands,
  getCatalogModels,
  getCatalogProductTypes
} from './actions'
import { getPendingPartRequests } from '../solicitudes/actions'

export const dynamic = 'force-dynamic'

export default async function PartsInventoryPage() {
  const [
    goodResult,
    harvestResult,
    brandResult,
    modelResult,
    productTypeResult,
    requestsResult
  ] = await Promise.all([
    getGoodWarehouseParts(),
    getHarvestingWarehouseParts(),
    getCatalogBrands(),
    getCatalogModels(),
    getCatalogProductTypes(),
    getPendingPartRequests()
  ])

  if (brandResult.error) {
    console.error('Error loading catalog brands', brandResult.error)
  }
  if (modelResult.error) {
    console.error('Error loading catalog models', modelResult.error)
  }
  if (productTypeResult.error) {
    console.error('Error loading catalog product types', productTypeResult.error)
  }
  if (requestsResult.error) {
    console.error('Error loading pending requests', requestsResult.error)
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-full">
        <PartInventoryDashboard
          goodParts={goodResult.data}
          harvestParts={harvestResult.data}
          goodError={goodResult.error}
          harvestError={harvestResult.error}
          catalogBrands={brandResult.data}
          catalogModels={modelResult.data}
          catalogProductTypes={productTypeResult.data}
          pendingRequests={requestsResult.data}
          requestsError={requestsResult.error}
        />
      </div>
    </div>
  )
}
