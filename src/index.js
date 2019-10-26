import { buildCustomElementConstructor } from 'lwc';
import MyApp from 'c/app';

customElements.define('c-app', buildCustomElementConstructor(MyApp));
