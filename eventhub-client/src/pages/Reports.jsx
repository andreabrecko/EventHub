import React, { useState } from 'react';

const Reports = () => {
  const [reportedEvents, setReportedEvents] = useState([
    { id: 1, eventName: 'Evento Violento', eventId: 'e1', reporter: 'UserA', creator: 'UserX', status: 'pending' },
    { id: 2, eventName: 'Contenuto Inappropriato', eventId: 'e2', reporter: 'UserB', creator: 'UserY', status: 'pending' },
    { id: 3, eventName: 'Spam', eventId: 'e3', reporter: 'UserC', creator: 'UserZ', status: 'pending' },
  ]);

  const handleDeleteEvent = (id) => {
    setReportedEvents(reportedEvents.filter(report => report.id !== id));
    console.log(`Event associated with report ${id} deleted`);
  };

  const handleBlockCreator = (id) => {
    setReportedEvents(reportedEvents.map(report => report.id === id ? { ...report, status: 'creator_blocked' } : report));
    console.log(`Creator associated with report ${id} blocked`);
  };

  const handleDeleteReport = (id) => {
    setReportedEvents(reportedEvents.filter(report => report.id !== id));
    console.log(`Report ${id} deleted`);
  };

  return (
    <div>
      <h1>Admin Reports Page</h1>
      <h2>Reported Events</h2>
      {reportedEvents.length === 0 ? (
        <p>No reported events to display.</p>
      ) : (
        <ul>
          {reportedEvents.map(report => (
            <li key={report.id}>
              Report ID: {report.id}, Event: {report.eventName} (ID: {report.eventId}), Reporter: {report.reporter}, Creator: {report.creator} (Status: {report.status})
              <button onClick={() => handleDeleteEvent(report.id)} style={{ marginLeft: '10px', backgroundColor: 'darkred', color: 'white' }}>Delete Event</button>
              <button onClick={() => handleBlockCreator(report.id)} style={{ marginLeft: '10px', backgroundColor: 'orange', color: 'white' }}>Block Creator</button>
              <button onClick={() => handleDeleteReport(report.id)} style={{ marginLeft: '10px', backgroundColor: 'red', color: 'white' }}>Delete Report</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Reports;