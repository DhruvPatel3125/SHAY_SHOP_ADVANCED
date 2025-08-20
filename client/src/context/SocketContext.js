import React, { createContext, useContext, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to the Socket.IO server
    const newSocket = io('http://localhost:5000'); // Replace with your server URL if different
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO server!');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server.');
    });

    // Clean up on component unmount
    return () => {
      if (newSocket.connected) {
        newSocket.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};
