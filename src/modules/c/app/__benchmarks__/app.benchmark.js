import { createElement } from "lwc";
import MyApp from "c/app";

describe("c-app", () => {
  // eslint-disable-next-line no-undef
  benchmark("create_and_render", () => {
    let element;
    // eslint-disable-next-line no-undef
    run(() => {
      element = createElement("c-app", { is: MyApp });
      element.flavor = "red";
      document.body.appendChild(element);
    });
    afterAll(() => {
      return element && element.parentElement.removeChild(element);
    });
  });
});
