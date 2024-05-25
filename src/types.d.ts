type PointForecastData = { forecastinfo: ForecastDatasetInfo; data: Array<{ time: Date; value: number }> }
type RouteForecastData = {
  forecastinfo: ForecastDatasetInfo
  data: Array<{ node: LatLng; forecast: PointForecastData }>
}
type PointForecastParameters = Array<{ offset: number; slope: number }>
type ForecastFrame = { time: Date; data: Uint8Array }
type LatLng = [number, number]
type Path = LatLng[]

type ForecastData = {
  info: ForecastDatasetInfo
  frames: ForecastFrame[]
}

type ForecastDatasetInfo = {
  filename: string
  datetime: Date
}

type KNMIDownloadURLResponse = {
  contentType: string
  lastModified: string
  size: string
  temporaryDownloadUrl?: string
}
type KNMIRadarForecastData = {
  filename: string
  date: Date
  data: ArrayBuffer
}

type KNMIMQTTMessage = {
  datasetName: string
  datasetVersion: string
  filename: string
  url: string
}

type GraphHopperAPIResponse = {
  hints: GraphHopperAPIResponseHints
  info: GraphHopperAPIResponseInfo
  paths: GraphHopperAPIResponsePath[]
}
type GraphHopperAPIResponseHints = {
  "visited_nodes.sum": number
  "visited_nodes.average": number
}
type GraphHopperAPIResponseInfo = {
  copyrights: string[]
  took: number
  road_data_timestamp: string
}
type GraphHopperAPIResponsePathDetails = {
  surface: [number, number, string][]
  road_class: [number, number, string][]
}
type GraphHopperAPIResponsePathPoints = {
  type: string
  coordinates: LatLng[]
}
type GraphHopperAPIResponsePath = {
  distance: number
  weight: number
  time: number
  transfers: number
  points_encoded: boolean
  bbox: [number, number, number, number]
  points: GraphHopperAPIResponsePathPoints
  legs: any[]
  details: GraphHopperAPIResponsePathDetails
  ascend: number
  descend: number
  snapped_waypoints: GraphHopperAPIResponsePathPoints
}
