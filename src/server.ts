import express from "express"
import * as dotenv from "dotenv"
import Radar from "./Radar.js"

dotenv.config()

const radar: Radar = new Radar()
const api = express()

api.use(express.json())
api.set("port", process.env.API_SERVER_PORT)

api.get("/coordinate", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "*")
  res.setHeader("Access-Control-Allow-Headers", "*")

  const lat = parseFloat(req.query.lat.toString())
  const lng = parseFloat(req.query.lng.toString())

  const forecast = radar.getForecastAtNode([lat, lng])

  res.status(200)
  res.write(JSON.stringify(forecast, null, 2))
  res.end()
})

api.get("/route", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "*")
  res.setHeader("Access-Control-Allow-Headers", "*")

  const [from, to] = JSON.parse(req.query.route.toString())

  console.log(from, to)

  res.status(200)
  res.end()
})

api.listen(api.get("port"), () => {
  console.log("App is running at http://localhost:%d", api.get("port"))
  console.log("Press CTRL-C to stop\n")
})
