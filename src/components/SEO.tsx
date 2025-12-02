import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  url?: string;
}

const defaultSEO = {
  title: 'OCPP Simulator - EV Charging Station Testing Tool',
  description: 'Web-based OCPP simulator for testing Electric Vehicle charging stations. Simulate charge points, test OCPP 1.6 and 2.0.1 protocols, monitor network traffic, and manage charging sessions.',
  keywords: 'OCPP, EV charging, electric vehicle, charging station, OCPP simulator, charge point, CSMS, EV testing, OCPP 1.6, OCPP 2.0, WebSocket, charging protocol',
  image: '/og-image.png',
  type: 'website',
  siteName: 'OCPP Simulator',
  twitterHandle: '@ocppsimulator',
};

export function SEO({
  title,
  description,
  keywords,
  image,
  type,
  url,
}: SEOProps) {
  const location = useLocation();
  const currentUrl = url || `${window.location.origin}${location.pathname}${location.hash}`;
  const fullTitle = title ? `${title} | ${defaultSEO.title}` : defaultSEO.title;
  const metaDescription = description || defaultSEO.description;
  const metaKeywords = keywords || defaultSEO.keywords;
  const metaImage = image || `${window.location.origin}${defaultSEO.image}`;
  const metaType = type || defaultSEO.type;

  useEffect(() => {
    document.title = fullTitle;

    const updateMetaTag = (name: string, content: string, attribute: string = 'name') => {
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    const updateLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    updateMetaTag('description', metaDescription);
    updateMetaTag('keywords', metaKeywords);
    updateMetaTag('author', 'OCPP Simulator');
    updateMetaTag('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    updateMetaTag('googlebot', 'index, follow');
    updateMetaTag('theme-color', '#000000');

    updateMetaTag('og:title', fullTitle, 'property');
    updateMetaTag('og:description', metaDescription, 'property');
    updateMetaTag('og:image', metaImage, 'property');
    updateMetaTag('og:url', currentUrl, 'property');
    updateMetaTag('og:type', metaType, 'property');
    updateMetaTag('og:site_name', defaultSEO.siteName, 'property');
    updateMetaTag('og:locale', 'en_US', 'property');

    updateMetaTag('twitter:card', 'summary_large_image', 'name');
    updateMetaTag('twitter:title', fullTitle, 'name');
    updateMetaTag('twitter:description', metaDescription, 'name');
    updateMetaTag('twitter:image', metaImage, 'name');
    updateMetaTag('twitter:site', defaultSEO.twitterHandle, 'name');
    updateMetaTag('twitter:creator', defaultSEO.twitterHandle, 'name');

    updateLinkTag('canonical', currentUrl);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'OCPP Simulator',
      description: metaDescription,
      url: window.location.origin,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: [
        'OCPP 1.6 and 2.0.1 Protocol Support',
        'Real-time WebSocket Communication',
        'Charge Point Simulation',
        'Network Traffic Monitoring',
        'Charging Session Management',
        'Meter Value Reporting',
      ],
    };

    let scriptElement = document.querySelector('script[type="application/ld+json"]');
    if (!scriptElement) {
      scriptElement = document.createElement('script');
      scriptElement.setAttribute('type', 'application/ld+json');
      document.head.appendChild(scriptElement);
    }
    scriptElement.textContent = JSON.stringify(jsonLd);
  }, [fullTitle, metaDescription, metaKeywords, metaImage, metaType, currentUrl]);

  return null;
}

