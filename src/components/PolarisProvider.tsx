import React from 'react';
import { AppProvider } from '@shopify/polaris';
import { useAppBridge } from '@/hooks/useAppBridge';

interface PolarisProviderProps {
  children: React.ReactNode;
}

export const PolarisProvider: React.FC<PolarisProviderProps> = ({ children }) => {
  const { isEmbedded, shopDomain } = useAppBridge();

  // Configure Polaris for embedded or standalone mode
  const polarisConfig = {
    // Use shop domain or fallback for app context
    shopDomain: shopDomain || 'smartpop-app',
    
    // Features for embedded apps
    features: {
      newDesignLanguage: true,
    },
    
    // App context information
    i18n: {
      Polaris: {
        Common: {
          checkbox: 'checkbox',
          undo: 'Undo',
          cancel: 'Cancel',
          clear: 'Clear',
          close: 'Close',
          submit: 'Submit',
          more: 'More',
        },
        Actions: {
          moreActions: 'More actions',
        },
        ResourceList: {
          loading: 'Loading',
          selected: 'Selected',
          selectAll: 'Select all',
          emptySearchResultTitle: 'No results found',
          emptySearchResultDescription: 'Try changing the filters or search term',
          filteringAccessibilityLabel: 'Filtering',
          selectAllItems: 'Select all items',
          sortAccessibilityLabel: 'Sort',
        },
      },
    },
  };

  return (
    <AppProvider {...polarisConfig}>
      <div className={isEmbedded ? 'polaris-embedded' : 'polaris-standalone'}>
        {children}
      </div>
    </AppProvider>
  );
};