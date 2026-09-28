import './style.css';
import { renderApp } from './app.js';

renderApp(document.querySelector('#app'), {
  version: __APP_VERSION__,
  builtAt: __BUILT_AT__,
});
