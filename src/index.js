import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import router from './router';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { DataProvider } from './contexts/DataContext';
import { InvoiceProvider } from './contexts/InvoiceContext';
import { PayPeriodProvider } from './features/payperiod/PayPeriodContext';
import { AddressMemoryProvider } from './contexts/AddressMemoryContext';

// Check if root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Please ensure an element with id="root" exists in your index.html.');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <DataProvider>
          <PayPeriodProvider>
            <AddressMemoryProvider>
              <InvoiceProvider>
                <RouterProvider router={router} />
              </InvoiceProvider>
            </AddressMemoryProvider>
          </PayPeriodProvider>
        </DataProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);