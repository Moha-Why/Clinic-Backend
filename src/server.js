import { config } from 'dotenv'
import app from './app.js'

config()

const PORT = Number(process.env.PORT) || 4000

app.listen(PORT, () => {
  console.log(`Clinic API listening on ${PORT}`)
})