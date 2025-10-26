import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { AboutPage } from './pages/AboutPage'
import { UseCasePage } from './pages/UseCasePage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'
import { VoiceNavigation } from './components/VoiceNavigation'
import './App.css'

function App() {

  return (
    <Router>
      <VoiceNavigation autoReadOnMount={false} showVoiceIndicator={false}>
        <Routes>
          {/* Home Page */}
          <Route path="/" element={<HomePage />} />

          {/* About Page */}
          <Route path="/about" element={<AboutPage />} />

          {/* Use Case Page */}
          <Route path="/use-case" element={<UseCasePage />} />

          {/* Sign In Page */}
          <Route path="/signin" element={
            <SignInPage 
              onSignUpClick={() => window.location.href = '/signup'}
              onSignInSuccess={(user) => {
                console.log('User signed in:', user);
                window.location.href = '/';
              }}
            />
          } />

          {/* Sign Up Page */}
          <Route path="/signup" element={
            <SignUpPage 
              onSignInClick={() => window.location.href = '/signin'}
              onSignUpSuccess={(user) => {
                console.log('User signed up:', user);
                window.location.href = '/';
              }}
            />
          } />
        </Routes>
      </VoiceNavigation>
    </Router>
  )
}

export default App
