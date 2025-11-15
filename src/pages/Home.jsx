import React from 'react';

const Home = ({ onNavigate }) => {
  return (
    <div className="home-container">
      <h1 className="home-title">DotDotDone</h1>
      <p className="home-subtitle">Plan your time. Get things done.</p>
      <div className="home-actions">
        <button className="btn btn-primary" onClick={() => onNavigate('plan')}>
          Plan Mode
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate('do')}>
          Do Mode
        </button>
      </div>
    </div>
  );
};

export default Home;