import * as React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import styled, { createGlobalStyle } from 'styled-components'

import { AssetGrid } from './components/AssetGrid'
import { Header } from './components/Header'
import { PaymentScreen } from './components/PaymentScreen'

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  body {
    margin: 0;
    padding: 0;
  }
`

const AppContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
`

const App = (): React.ReactElement => {
  return (
    <Router>
      <GlobalStyle />
      <AppContainer>
        <Header />
        <Routes>
          <Route path="/" element={<AssetGrid />} />
          <Route path="/pay" element={<PaymentScreen />} />
        </Routes>
      </AppContainer>
    </Router>
  )
}

export default App
