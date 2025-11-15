import React from 'react';

const NavTabs = ({ activeTab, onTabChange }) => {
  return (
    <div className="nav-tabs">
      <button 
        className={`tab ${activeTab === 'day' ? 'active' : ''}`}
        onClick={() => onTabChange('day')}
      >
        Day
      </button>
      <button 
        className={`tab ${activeTab === 'week' ? 'active' : ''}`}
        onClick={() => onTabChange('week')}
      >
        Week
      </button>
      <button 
        className={`tab ${activeTab === 'month' ? 'active' : ''}`}
        onClick={() => onTabChange('month')}
      >
        Month
      </button>
    </div>
  );
};

export default NavTabs;