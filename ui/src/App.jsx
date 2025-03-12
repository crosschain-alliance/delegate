import React from "react"
import { HashRouter, Route, Routes } from "react-router"

import Dashboard from "./components/pages/Dashboard"
import Home from "./components/pages/Home"

export default () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/address/:id" element={<Dashboard />} />
      </Routes>
    </HashRouter>
  )
}
