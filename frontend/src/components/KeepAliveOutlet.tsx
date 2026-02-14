import React, { useRef } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';

/**
 * A replacement for <Outlet /> that keeps visited pages alive in the DOM
 * (hidden with display:none) instead of unmounting them when navigating away.
 * All page state is preserved until the application is closed.
 */
export default function KeepAliveOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const cacheRef = useRef(new Map<string, React.ReactNode>());

  const currentPath = location.pathname;

  // Cache the outlet element the first time a path is visited
  if (outlet && !cacheRef.current.has(currentPath)) {
    cacheRef.current.set(currentPath, outlet);
  }

  return (
    <>
      {Array.from(cacheRef.current.entries()).map(([path, element]) => (
        <div
          key={path}
          style={{
            display: path === currentPath ? 'block' : 'none',
          }}
        >
          {element}
        </div>
      ))}
    </>
  );
}
