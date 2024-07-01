import * as Sentry from "@sentry/node"
import express from "express"
import Radar from "./Radar.js"

const radar: Radar = new Radar()
const api = express()

api.use(express.json())
api.set("port", process.env.API_SERVER_PORT)

api.get("/coordinate", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "*")
  res.setHeader("Access-Control-Allow-Headers", "*")

  const lat = parseFloat(req.query.lat?.toString())
  const lng = parseFloat(req.query.lng?.toString())
  const interpolate = parseInt(req.query.interpolate?.toString()) ? true : false

  if (process.env.NODE_ENV == "development") {
    console.log("Coordinate forecast request", lat, lng, interpolate)
  }

  try {
    const forecast = radar.getForecastAtNode([lat, lng], interpolate)

    res.status(200)
    res.write(JSON.stringify(forecast, null, 2))
    res.end()
  } catch (e) {
    res.status(400)
    res.write(e.message)
    res.end()
  }
})

Sentry.setupExpressErrorHandler(api)

api.listen(api.get("port"), () => {
  console.log("App is running on port %d in %s mode", api.get("port"), process.env.NODE_ENV)
})
