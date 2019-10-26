import { LightningElement, track, api } from 'lwc';

// const FORM_FACTOR_MODULES = {
//     desktop: 'c/desktop',
//     mobile: 'c/mobile'
// };
const DEFAULT_FORM_FACTOR = 'desktop';

export default class DynamicComponent extends LightningElement {
    @api formFactor = DEFAULT_FORM_FACTOR;
    @track formFactorModule;
    @track passedInValue = 'This is a value from the parent';

    // Now that the component is in the DOM start the process of loading a new module
    connectedCallback() {
        this.loadFormFactorModule();
    }

    // Need to use the async pattern to load a module at runtime
    async loadFormFactorModule() {
        if (this.isMobile) {
            const loadModule = await import('c/mobile');
            this.formFactorModule = loadModule;
        }

        if (this.isDesktop) {
            const loadModule = await import('c/desktop');
            this.formFactorModule = loadModule;
        }

        // const loadModule = await import(
        //     `${FORM_FACTOR_MODULES[this.formFactor]}`
        // );
        // this.formFactor = loadModule;
    }

    get isMobile() {
        if (this.formFactor === 'mobile') {
            return true;
        }
        return false;
    }

    get isDesktop() {
        if (this.formFactor === 'desktop') {
            return true;
        }
        return false;
    }
}
