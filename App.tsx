import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TimerBar from './components/TimerBar';
import BudgetCard from './components/BudgetCard';
import TrackerList from './components/TrackerList';
import ProjectsList from './components/ProjectsList';
import ClientsList from './components/ClientsList';
import ReportsView from './components/ReportsView';
import TimesheetView from './components/TimesheetView';
import { MOCK_PROJECTS, MOCK_TIME_ENTRIES } from './constants';
import { Project, TimeEntry } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('timesheet'); // Default to show new feature
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(5025); // Start with some time for demo
  const [activeProject, setActiveProject] = useState<Project | null>(MOCK_PROJECTS[0]);

  // Timer Effect
  useEffect(() => {
    let interval: number | undefined;
    if (isRunning) {
      interval = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleRestartTask = (entry: TimeEntry) => {
    setIsRunning(true);
    // In a real app, this would set the task input value
    const project = MOCK_PROJECTS.find(p => p.id === entry.projectId);
    if(project) setActiveProject(project);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* Sidebar - Fixed width */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content - Flex Grow */}
      <main className="flex-1 ml-[250px] min-w-0 flex flex-col h-screen">
        
        {/* Sticky Timer Bar */}
        <TimerBar 
            activeProject={activeProject} 
            isRunning={isRunning} 
            setIsRunning={setIsRunning}
            elapsedSeconds={elapsedSeconds}
        />

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scroll-smooth">
            
            {/* Dashboard View */}
            {currentView === 'dashboard' && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Budget Overview</h2>
                      <span className="text-xs font-medium text-slate-400">Updated just now</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {MOCK_PROJECTS.slice(0, 3).map((proj) => (
                          <BudgetCard key={proj.id} project={proj} />
                      ))}
                  </div>
              </section>
            )}

            {/* Timesheet View */}
            {currentView === 'timesheet' && (
              <TimesheetView />
            )}

            {/* Tracker View */}
            {currentView === 'tracker' && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Time Entries</h2>
                  </div>
                  <TrackerList 
                      entries={MOCK_TIME_ENTRIES}
                      onRestart={handleRestartTask}
                  />
              </section>
            )}

            {/* Projects View */}
            {currentView === 'projects' && (
              <ProjectsList />
            )}

            {/* Clients View */}
            {currentView === 'clients' && (
              <ClientsList />
            )}

            {/* Reports View */}
            {currentView === 'reports' && (
              <ReportsView />
            )}

            {/* Bottom Spacer */}
            <div className="h-10"></div>
        </div>
      </main>

    </div>
  );
};

export default App;