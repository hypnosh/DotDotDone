import React from 'react';

const Header = ({ currentPage, onNavigate }) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo" onClick={() => onNavigate('home')}>
          DotDotDone
        </div>
        <nav className="header-nav">
          <button 
            className={`nav-link ${currentPage === 'plan' ? 'active' : ''}`}
            onClick={() => onNavigate('plan')}
          >
            Plan
          </button>
          <button 
            className={`nav-link ${currentPage === 'do' ? 'active' : ''}`}
            onClick={() => onNavigate('do')}
          >
            Do
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;