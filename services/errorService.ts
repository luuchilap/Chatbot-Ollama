import { useMemo } from 'react';

import { useTranslation } from 'next-i18next';

import { ErrorMessage } from '@/types/error';

const useErrorService = () => {
  const { t } = useTranslation('chat');

  return {
    getModelsError: useMemo(
      () => (error: any) => {
        if (!error) return null;
        
        // Create a basic error message structure
        const errorMessage: ErrorMessage = {
          title: t('Error fetching models.'),
          code: error.status || 'unknown',
          messageLines: [error.message || error.statusText || t('An unexpected error occurred.')],
        };
        
        // Add suggestion if available
        if (error.suggestion) {
          errorMessage.suggestion = error.suggestion;
        } else if (error.error === 'Network Error') {
          errorMessage.suggestion = t('Please check your internet connection and ensure the backend server is running.');
        }
        
        return errorMessage;
      },
      [t],
    ),
  };
};

export default useErrorService;
