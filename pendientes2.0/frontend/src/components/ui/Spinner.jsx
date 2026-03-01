import React from 'react';

const sizes = {
    sm: 'w-4 h-4 border',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-2',
};

const Spinner = ({ size = 'md', className = '' }) => (
    <div className={`${sizes[size]} border-blue-500 border-t-transparent rounded-full animate-spin ${className}`} />
);

export default Spinner;
