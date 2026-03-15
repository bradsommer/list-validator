'use client';

import { useEffect } from 'react';
import 'vanilla-cookieconsent/dist/cookieconsent.css';
import * as CookieConsent from 'vanilla-cookieconsent';

export default function CookieConsentBanner() {
  useEffect(() => {
    CookieConsent.run({
      categories: {
        necessary: {
          enabled: true,
          readOnly: true,
        },
        analytics: {},
        advertising: {},
      },

      language: {
        default: 'en',
        translations: {
          en: {
            consentModal: {
              title: 'We use cookies',
              description:
                'We use cookies to ensure the proper functioning of our website and to improve your experience. You can choose which categories of cookies you allow.',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Reject all',
              showPreferencesBtn: 'Manage preferences',
            },
            preferencesModal: {
              title: 'Cookie Preferences',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Reject all',
              savePreferencesBtn: 'Save preferences',
              closeIconLabel: 'Close',
              sections: [
                {
                  title: 'Cookie Usage',
                  description:
                    'We use cookies to ensure the basic functionalities of the website and to enhance your online experience.',
                },
                {
                  title: 'Strictly Necessary Cookies',
                  description:
                    'These cookies are essential for the website to function properly. They enable basic features like authentication and session management.',
                  linkedCategory: 'necessary',
                },
                {
                  title: 'Analytics Cookies',
                  description:
                    'These cookies help us understand how visitors interact with the website, helping us improve our service.',
                  linkedCategory: 'analytics',
                },
                {
                  title: 'Advertising Cookies',
                  description:
                    'These cookies are used to deliver personalized advertisements and to measure the effectiveness of advertising campaigns.',
                  linkedCategory: 'advertising',
                },
              ],
            },
          },
        },
      },
    });
  }, []);

  return null;
}
