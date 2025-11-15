import React, { useState } from 'react';
import Header from './components/UI/Header';
import Home from './pages/Home';
import Plan from './pages/Plan';
import Do from './pages/Do';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="app-container">
      <Header currentPage={currentPage} onNavigate={handleNavigate} />
      <main className="main-content">
        {currentPage === 'home' && <Home onNavigate={handleNavigate} />}
        {currentPage === 'plan' && <Plan />}
        {currentPage === 'do' && <Do />}
      </main>
    </div>
  );
};

export default App;