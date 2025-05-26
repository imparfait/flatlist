import React from 'react';
import { store } from '../store';
import { Provider } from 'react-redux';
import Main from '../app';

export default function App() {
  return (
    <Provider store={store}>
      <Main />
    </Provider>
  );
}
