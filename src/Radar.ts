import proj4 from "proj4"
import interpolateBilinear from "./utils/interpolateBilinear.js"
import * as hdf5 from "jsfive"
import { add as date_fns_add } from "date-fns"
import KNMI from "./knmi/KNMI.js"

export default class Radar {
  #data: ForecastData = null
  #knmi: KNMI

  // data parameters
  static #data_max_x = 700
  static #data_max_y = 765
  static #data_max_index = 25

  // earth projection parameters
  static #proj_scale_horizontal = 1.000003457069397
  static #proj_scale_vertical = -1.000004768371582
  static #proj_offset_vertical = 3649.98193359375
  static #proj_projection = "+proj=stere +lat_0=90 +lon_0=0 +lat_ts=60 +a=6378.14 +b=6356.75 +x_0=0 y_0=0"

  constructor() {
    this.#knmi = new KNMI(process.env.KNMI_API_KEY, this.setForecastData.bind(this))
  }

  private toFrameIndex(x: number, y: number): number {
    return y * Radar.#data_max_x + x
  }

  private toXY(node: LatLng): [number, number] {
    const [lat, lng] = node
    const [px, py] = proj4(Radar.#proj_projection, [lng, lat])

    const x = px * Radar.#proj_scale_horizontal
    const y = (py + Radar.#proj_offset_vertical) * Radar.#proj_scale_vertical

    return [x, y]
  }

  // parameter validation methods

  private ensureFrameIndexBounds(index: number): void {
    if (index < 0 || index >= Radar.#data_max_index) {
      throw new Error(`Forecast frame index ${index} is out of bounds`)
    }
  }

  private ensureValidXYDataCoordinates(x: number, y: number): void {
    this.ensureXYBounds(x, y)
    this.ensureIntegers([x, y])
  }

  private ensureXYBounds(x: number, y: number): void {
    if (x < 0 || x >= Radar.#data_max_x || y >= Radar.#data_max_y || y < 0) {
      throw new Error(`Coordinate pair (${x},${y}) out of bounds`)
    }
  }

  private ensureIntegers(nums: number[]): void {
    if (nums.some((n) => !Number.isInteger(n))) {
      throw new Error(`${nums} contains non-integer numbers`)
    }
  }

  private ensureValidRoute(route: Path): void {
    for (const node of route) {
      const [x, y] = this.toXY(node)
      try {
        this.ensureXYBounds(x, y)
      } catch (e) {
        throw new Error(`Node ${node[0]} ${node[1]} is outside of the allowed bounds`)
      }
    }
  }

  private setForecastData(data: KNMIRadarForecastData): void {
    console.log("Radar instance received new forecast data")
    const frames = []
    const fh = new hdf5.File(data.data)
    for (let i = 0; i < 25; i++) {
      const file_image_key = `image${i + 1}`
      const image_datetime = date_fns_add(data.date, { minutes: 5 * i })
      frames.push({
        time: image_datetime,
        data: new Uint8Array(fh.get(file_image_key).get("image_data").value),
      })
    }

    this.#data = {
      info: {
        filename: data.filename,
        datetime: data.date,
      },
      frames: frames,
    }
    console.log("Forecast data updated")
  }

  private getInterpolatedForecastAtXY(x: number, y: number): PointForecastData {
    // An interpolated forecast is made by taking the four neighboring non-interpolated
    // forecasts and bilinearly interpolating between them frame by frame

    const x0 = Math.floor(x)
    const x1 = Math.ceil(x)
    const y0 = Math.floor(y)
    const y1 = Math.ceil(y)

    const forecast_t0 = this.getForecastAtXY(x0, y1)
    const forecast_t1 = this.getForecastAtXY(x1, y1)
    const forecast_b0 = this.getForecastAtXY(x0, y0)
    const forecast_b1 = this.getForecastAtXY(x1, y0)

    return {
      forecastinfo: this.#data.info,
      data: forecast_t0.data.map((frame, index) => ({
        time: frame.time,
        value: interpolateBilinear(
          frame.value,
          forecast_t1.data[index].value,
          forecast_b0.data[index].value,
          forecast_b1.data[index].value,
          x - x0,
          y - y0
        ),
      })),
    }
  }

  private getForecastAtXY(x: number, y: number): PointForecastData {
    // instead of throwing if the x, y aren't integers we could just round them to integers
    this.ensureValidXYDataCoordinates(x, y)

    const frame_index = this.toFrameIndex(x, y)

    return {
      forecastinfo: this.#data.info,
      data: this.#data.frames.map((frame_array) => ({ time: frame_array.time, value: frame_array.data[frame_index] })),
    }
  }

  public getForecastAtNode(node: LatLng, interpolated: boolean = false): PointForecastData {
    const [frame_x, frame_y] = this.toXY(node)

    if (interpolated) {
      return this.getInterpolatedForecastAtXY(frame_x, frame_y)
    }

    return this.getForecastAtXY(Math.round(frame_x), Math.round(frame_y))
  }

  public getRouteForecastData(route: Path, interpolated: boolean = false): RouteForecastData {
    this.ensureValidRoute(route)

    return {
      forecastinfo: this.#data.info,
      data: route.map((node) => ({ node: node, forecast: this.getForecastAtNode(node, interpolated) })),
    }
  }
}
