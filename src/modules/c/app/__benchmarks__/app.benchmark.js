import { createElement } from 'lwc';
import MyApp from 'my/app';
import { runInContext } from 'vm';

describe('my-app', () => {
    benchmark('creat_and_render', () => {
        let element;
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
