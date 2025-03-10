import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Buffer } from "buffer"

window.Buffer = window.Buffer || Buffer

import App from "./App.jsx"

import "./index.css"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
