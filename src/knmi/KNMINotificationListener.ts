import mqtt from "mqtt"

export default class KNMINotificationListener {
  #client: mqtt.MqttClient
  #onMessage: (m: KNMIMQTTMessage) => void

  constructor(onMessage: (m: KNMIMQTTMessage) => void) {
    this.#onMessage = onMessage

    this.#client = mqtt.connect("wss://mqtt.dataplatform.knmi.nl:443", {
      username: "token",
      password: process.env.KNMI_NOTIFY_KEY,
      clientId: process.env.KNMI_NOTIFY_CLIENT_ID,
      protocolId: "MQTT",
      protocolVersion: 5,
    })

    this.#client.on("connect", () => {
      console.log("MQTT client connected to the KNMI notification service, subscribing")
      this.#client.subscribe("dataplatform/file/v1/radar_forecast/1.0/created")
    })

    this.#client.on("message", (topic, message) => {
      console.log("Received mqtt message", topic)
      const message_json = JSON.parse(message.toString())
      this.#onMessage(message_json.data as KNMIMQTTMessage)
    })
  }
}
