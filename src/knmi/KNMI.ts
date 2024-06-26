import * as Sentry from "@sentry/node"
import fetch from "node-fetch"
import { sub as dateFnsSub } from "date-fns"
import { formatInTimeZone, utcToZonedTime, toDate } from "date-fns-tz"

import KNMINotificationListener from "./KNMINotificationListener.js"

export default class KNMI {
  #api_key: string
  #notification_listener: KNMINotificationListener
  #onNewDataListener: (forecast_data: KNMIRadarForecastData) => void

  constructor(api_key: string, onNewDataListener: (forecast_data: KNMIRadarForecastData) => void) {
    this.#api_key = api_key
    this.#notification_listener = new KNMINotificationListener(this.onMQTTMessage.bind(this))
    this.#onNewDataListener = onNewDataListener

    // immediately attempt to read new forecast dataset
    this.fetchLatestForecastDataset()
  }

  private static getLatestAvailableForecastFilename(): string {
    // The latest available forecast file is the first whole five minute time more than 5 minutes in the past
    // So from 22:13 the latest available forecast file would be 22:05
    const current_date = new Date()
    const dataset_date = dateFnsSub(current_date, { minutes: 5 + (current_date.getMinutes() % 5) })
    return `RAD_NL25_PCP_FM_${formatInTimeZone(dataset_date, "utc", "yyyyMMddHHmm")}.h5`
  }

  private static getDateFromFileName(filename: string): Date {
    const year = filename.substring(16, 20)
    const month = filename.substring(20, 22)
    const day = filename.substring(22, 24)
    const hour = filename.substring(24, 26)
    const minute = filename.substring(26, 28)

    // this date is an UTC date, but it will be initialized from a computer running in AMS time (CET)
    const forecast_date = utcToZonedTime(
      toDate(`${year}-${month}-${day} ${hour}:${minute}`, { timeZone: "utc" }),
      "cet"
    )

    return forecast_date
  }

  private onMQTTMessage(mqtt_message: KNMIMQTTMessage): void {
    this.fetchForecastDataset(mqtt_message.filename)
  }

  private fetchLatestForecastDataset(): void {
    const latest_dataset_filename = KNMI.getLatestAvailableForecastFilename()
    this.fetchForecastDataset(latest_dataset_filename)
  }

  private fetchForecastDataset(dataset_filename: string): void {
    const dataset_date = KNMI.getDateFromFileName(dataset_filename)

    console.log("Fetching forecast dataset", dataset_filename, dataset_date)

    const sentry_contexts = {}

    fetch(
      `https://api.dataplatform.knmi.nl/open-data/v1/datasets/radar_forecast/versions/1.0/files/${dataset_filename}/url`,
      {
        method: "GET",
        headers: {
          Authorization: this.#api_key,
        },
      }
    )
      .then((download_url_response) => {
        sentry_contexts["Download URL Response"] = {
          ok: download_url_response.ok,
          status: download_url_response.status,
          statusText: download_url_response.statusText,
        }

        if (!download_url_response.ok) {
          throw new Error(`Fetching ${dataset_filename} download url failed (${download_url_response.status})`)
        }

        return download_url_response.json()
      })
      .then((response_json: KNMIDownloadURLResponse) => {
        sentry_contexts["Response JSON"] = response_json

        if (!response_json.temporaryDownloadUrl) {
          throw new Error(`No temporaryDownloadUrl parameter given in the response json`)
        }

        return fetch(response_json.temporaryDownloadUrl)
      })
      .then((dataset_response) => {
        sentry_contexts["Dataset Response"] = {
          ok: dataset_response.ok,
          status: dataset_response.status,
          statusText: dataset_response.statusText,
        }

        if (!dataset_response.ok) {
          throw new Error(`Fetching ${dataset_filename} dataset failed (${dataset_response.status})`)
        }

        return dataset_response.arrayBuffer()
      })
      .then((dataset_filedata) =>
        this.#onNewDataListener({
          filename: dataset_filename,
          date: dataset_date,
          data: dataset_filedata,
        })
      )
      .catch((e) => {
        console.log(e)
        Sentry.captureEvent({
          message: "Forecast Dataset Fetch Error",
          level: "error",
          contexts: sentry_contexts,
        })
      })
  }
}
