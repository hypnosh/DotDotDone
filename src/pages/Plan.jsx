import React, { useState } from 'react';
import NavTabs from '../components/UI/NavTabs';
import DayView from '../components/Calendar/DayView';
import WeekView from '../components/Calendar/WeekView';
import MonthView from '../components/Calendar/MonthView';

const Plan = () => {
  const [activeTab, setActiveTab] = useState('day');

  return (
    <div>
      <NavTabs activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'day' && <DayView />}
      {activeTab === 'week' && <WeekView />}
      {activeTab === 'month' && <MonthView />}
    </div>
  );
};

export default Plan;