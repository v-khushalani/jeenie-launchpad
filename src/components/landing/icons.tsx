import React from 'react';

export const DoubtIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={64}
    height={64}
    {...props}
  >
    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" fill="none" />
    <path
      d="M24 28C24 24.134 27.134 21 32 21C36.866 21 40 24.134 40 28C40 30.5 38.5 32.5 36 33"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="32" cy="44" r="2" fill="currentColor" />
  </svg>
);

export const GroupTestIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={64}
    height={64}
    {...props}
  >
    <circle cx="20" cy="20" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="44" cy="20" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="32" cy="35" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
    <path
      d="M20 26V32M44 26V32M32 41V48"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path d="M20 32L32 41M44 32L32 41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const PathIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={64}
    height={64}
    {...props}
  >
    <circle cx="12" cy="52" r="3" fill="currentColor" />
    <circle cx="32" cy="32" r="3" fill="currentColor" />
    <circle cx="52" cy="12" r="3" fill="currentColor" />
    <path
      d="M15 50Q23 41 32 32Q41 23 50 14"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M48 18L52 12L56 16"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
