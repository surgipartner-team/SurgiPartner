import React from 'react';

const Footer = () => {
    return (
        <div className="lg:flex justify-between items-center pb-10 px-10 py-4 bg-transparent">
            <p className="text-[#004071] font-semibold text-sm tracking-wide mb-2 lg:mb-0">
                Copyright © 2026 SurgiPartner, All rights reserved.
            </p>
            <p className="text-[#004071] font-semibold text-sm tracking-wide">
                Design & Developed by <a href="https://aroratechsolutions.com" target="_blank" rel="noopener noreferrer">Arora Tech Solutions Pvt Ltd</a>
            </p>
        </div>
    );
};

export default Footer;
