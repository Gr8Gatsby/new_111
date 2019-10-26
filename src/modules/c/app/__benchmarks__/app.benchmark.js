import { createElement } from 'lwc';
import MyApp from 'my/app';

describe('my-app', () => {
    // eslint-disable-next-line no-undef
    benchmark('create_and_render', () => {
        let element;
        // eslint-disable-next-line no-undef
        run(() => {
            element = createElement('my-app', { is: MyApp });
            element.flavor = 'red';
            document.body.appendChild(element);
        });
        afterAll(() => {
            return element && element.parentElement.removeChild(element);
        });
    });
});
