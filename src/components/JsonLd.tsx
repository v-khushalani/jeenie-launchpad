import { useEffect } from 'react';

interface JsonLdProps {
  data: Record<string, unknown>;
}

const JsonLd = ({ data }: JsonLdProps) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    script.dataset.jsonld = 'true';
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [data]);

  return null;
};

export default JsonLd;

// Pre-built schemas
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'JEEnie AI',
  url: 'https://jeenie.website',
  logo: 'https://jeenie.website/logo.png',
  description:
    'AI-powered personalized learning platform for JEE Main, JEE Advanced, NEET and Foundation exam preparation.',
  sameAs: [],
  foundingDate: '2024',
  areaServed: { '@type': 'Country', name: 'India' },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'support@jeenie.website',
    contactType: 'customer support',
  },
};

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'JEEnie AI',
  url: 'https://jeenie.website',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://jeenie.website/practice?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

export const softwareAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'JEEnie AI',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web, Android, iOS',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
    description: 'Free tier with premium plans starting at ₹99/month',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '1200',
    bestRating: '5',
  },
};

export const faqSchema = (faqs: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
});
