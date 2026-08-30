import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://runtime.co.zw';
const DEFAULT_TITLE =
  'Runtime | Domain Registration & Technology Platform';
const DEFAULT_DESCRIPTION =
  'Register and manage .co.zw, .org.zw, .ac.zw and other domains with Runtime. .co.zw domains from $2/year with simple renewal pricing.';

type SeoConfig = {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
};

const routeSeo = (
  pathname: string
): SeoConfig => {
  if (pathname === '/') {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonical: '/',
    };
  }

  if (
    pathname === '/pricing' ||
    pathname === '/domain-pricing'
  ) {
    return {
      title:
        'Domain Pricing | .co.zw from $2/year | Runtime',
      description:
        'Compare domain registration and renewal prices at Runtime. Register or renew .co.zw for $2/year and .org.zw or .ac.zw for $3/year.',
      canonical: '/domain-pricing',
    };
  }

  if (pathname === '/whois') {
    return {
      title:
        'WHOIS Domain Lookup | Check Domain Information | Runtime',
      description:
        'Look up domain registration information with Runtime WHOIS. Check domain details and find your next domain.',
      canonical: '/whois',
    };
  }

  if (pathname === '/contact') {
    return {
      title: 'Contact Runtime | Domain Support',
      description:
        'Contact Runtime for help with domain registration, renewals, transfers and account support.',
      canonical: '/contact',
    };
  }

  if (pathname === '/terms') {
    return {
      title: 'Terms of Service | Runtime',
      description:
        'Read the terms that apply when using Runtime services.',
      canonical: '/terms',
    };
  }

  if (pathname === '/privacy') {
    return {
      title: 'Privacy Policy | Runtime',
      description:
        'Read how Runtime handles and protects personal information.',
      canonical: '/privacy',
    };
  }

  if (
    pathname === '/coming-soon' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/auth/action' ||
    pathname.startsWith('/dashboard')
  ) {
    return {
      title: 'Runtime',
      description: DEFAULT_DESCRIPTION,
      noindex: true,
    };
  }

  return {
    title: 'Page not found | Runtime',
    description:
      'The page you requested could not be found.',
    noindex: true,
  };
};

const upsertMeta = (
  selector: string,
  attributes: Record<string, string>
) => {
  let element =
    document.head.querySelector<HTMLMetaElement>(
      selector
    );

  if (!element) {
    element =
      document.createElement('meta');

    Object.entries(attributes).forEach(
      ([key, value]) => {
        element!.setAttribute(
          key,
          value
        );
      }
    );

    document.head.appendChild(
      element
    );
  }

  return element;
};

const upsertLink = (
  rel: string,
  href: string
) => {
  let element =
    document.head.querySelector<HTMLLinkElement>(
      `link[rel="${rel}"]`
    );

  if (!element) {
    element =
      document.createElement('link');
    element.rel = rel;
    document.head.appendChild(
      element
    );
  }

  element.href = href;
};

export const SEO: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const config =
      routeSeo(location.pathname);

    document.title =
      config.title;

    const description =
      upsertMeta(
        'meta[name="description"]',
        {
          name: 'description',
          content:
            config.description,
        }
      );
    description.content =
      config.description;

    const robots =
      upsertMeta(
        'meta[name="robots"]',
        {
          name: 'robots',
          content: 'index,follow',
        }
      );

    robots.content =
      config.noindex
        ? 'noindex,nofollow'
        : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';

    const googlebot =
      upsertMeta(
        'meta[name="googlebot"]',
        {
          name: 'googlebot',
          content: robots.content,
        }
      );
    googlebot.content =
      robots.content;

    const canonicalUrl =
      config.canonical
        ? `${SITE_URL}${config.canonical}`
        : `${SITE_URL}${location.pathname}`;

    if (!config.noindex) {
      upsertLink(
        'canonical',
        canonicalUrl
      );
    } else {
      const canonical =
        document.head.querySelector(
          'link[rel="canonical"]'
        );

      canonical?.remove();
    }

    const ogTitle =
      upsertMeta(
        'meta[property="og:title"]',
        {
          property: 'og:title',
          content: config.title,
        }
      );
    ogTitle.content =
      config.title;

    const ogDescription =
      upsertMeta(
        'meta[property="og:description"]',
        {
          property:
            'og:description',
          content:
            config.description,
        }
      );
    ogDescription.content =
      config.description;

    const ogUrl =
      upsertMeta(
        'meta[property="og:url"]',
        {
          property: 'og:url',
          content: canonicalUrl,
        }
      );
    ogUrl.content =
      canonicalUrl;

    const ogSiteName =
      upsertMeta(
        'meta[property="og:site_name"]',
        {
          property:
            'og:site_name',
          content: 'Runtime',
        }
      );
    ogSiteName.content =
      'Runtime';

    const ogType =
      upsertMeta(
        'meta[property="og:type"]',
        {
          property: 'og:type',
          content: 'website',
        }
      );
    ogType.content =
      'website';

    const twitterCard =
      upsertMeta(
        'meta[name="twitter:card"]',
        {
          name: 'twitter:card',
          content:
            'summary_large_image',
        }
      );
    twitterCard.content =
      'summary_large_image';

    const twitterTitle =
      upsertMeta(
        'meta[name="twitter:title"]',
        {
          name: 'twitter:title',
          content: config.title,
        }
      );
    twitterTitle.content =
      config.title;

    const twitterDescription =
      upsertMeta(
        'meta[name="twitter:description"]',
        {
          name:
            'twitter:description',
          content:
            config.description,
        }
      );
    twitterDescription.content =
      config.description;

    const existingStructuredData =
      document.getElementById(
        'runtime-seo-structured-data'
      );

    if (
      location.pathname === '/' &&
      !config.noindex
    ) {
      const script =
        existingStructuredData ||
        document.createElement(
          'script'
        );

      script.id =
        'runtime-seo-structured-data';
      script.setAttribute(
        'type',
        'application/ld+json'
      );

      script.textContent =
        JSON.stringify({
          '@context':
            'https://schema.org',
          '@graph': [
            {
              '@type':
                'Organization',
              '@id':
                `${SITE_URL}/#organization`,
              name: 'Runtime',
              url: SITE_URL,
              description:
                'Technology platform for domains, cloud infrastructure and developer services.',
            },
            {
              '@type':
                'WebSite',
              '@id':
                `${SITE_URL}/#website`,
              url: SITE_URL,
              name: 'Runtime',
              publisher: {
                '@id':
                  `${SITE_URL}/#organization`,
              },
            },
          ],
        });

      if (
        !existingStructuredData
      ) {
        document.head.appendChild(
          script
        );
      }
    } else {
      existingStructuredData?.remove();
    }
  }, [
    location.pathname,
    location.search,
  ]);

  return null;
};
