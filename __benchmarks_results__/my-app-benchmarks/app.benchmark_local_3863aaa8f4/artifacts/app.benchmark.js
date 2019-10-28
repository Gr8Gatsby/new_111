(function (lwc, MyApp) {
    'use strict';

    MyApp = MyApp && MyApp.hasOwnProperty('default') ? MyApp['default'] : MyApp;

    /*
     * Copyright (c) 2019, salesforce.com, inc.
     * All rights reserved.
     * SPDX-License-Identifier: MIT
     * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
    */
    const BEFORE_ALL = 'beforeAll';
    const BEFORE = 'before';
    const AFTER_ALL = 'afterAll';
    const AFTER = 'after';
    const MODE_ONLY = 'only';
    const MODE_SKIP = 'skip';
    const MODES = { ONLY: MODE_ONLY, SKIP: MODE_SKIP };
    const HOOKS = {
        BEFORE_ALL,
        BEFORE,
        AFTER_ALL,
        AFTER,
    };
    const RUN_BENCHMARK = 'run_benchmark';

    /*
     * Copyright (c) 2019, salesforce.com, inc.
     * All rights reserved.
     * SPDX-License-Identifier: MIT
     * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
    */
    const makeDescribe = (name, parent, mode) => ({
        type: "group",
        mode: parent && !mode ? parent.mode : mode,
        children: [],
        hooks: [],
        startedAt: 0,
        aggregate: 0,
        name,
        parent,
    });
    const makeBenchmark = (name, parent, mode) => ({
        type: "benchmark",
        mode: parent && !mode ? parent.mode : mode,
        hooks: [],
        name,
        parent,
        startedAt: 0,
        aggregate: 0,
    });
    const makeBenchmarkRun = (fn, parent) => ({
        type: "run",
        fn,
        name: RUN_BENCHMARK,
        parent,
        startedAt: 0,
        metrics: {},
        hooks: [],
        aggregate: 0
    });

    /*
     * Copyright (c) 2019, salesforce.com, inc.
     * All rights reserved.
     * SPDX-License-Identifier: MIT
     * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
    */
    const handler = (event, state) => {
        switch (event.nodeType) {
            case 'start_describe_definition': {
                const { nodeName, mode } = event;
                const currentDescribeBlock = state.currentDescribeBlock;
                const describeBlock = makeDescribe(nodeName, currentDescribeBlock, mode);
                currentDescribeBlock.children.push(describeBlock);
                state.currentDescribeBlock = describeBlock;
                break;
            }
            case 'start_benchmark_definition': {
                const { nodeName, mode } = event;
                const currentDescribeBlock = state.currentDescribeBlock;
                const benchmarkBlock = makeBenchmark(nodeName, currentDescribeBlock, mode);
                currentDescribeBlock.children.push(benchmarkBlock);
                state.currentDescribeBlock = benchmarkBlock;
                break;
            }
            case 'finish_describe_definition':
            case 'finish_benchmark_definition': {
                const currentDescribeBlock = state.currentDescribeBlock;
                if (!currentDescribeBlock) {
                    throw new Error(`"currentDescribeBlock" has to be there since we're finishing its definition.`);
                }
                if (currentDescribeBlock.type === "benchmark" && !currentDescribeBlock.run) {
                    throw new Error(`Benchmark "${currentDescribeBlock.name}" must have a 'run()' function or contain benchmarks inside.`);
                }
                if (currentDescribeBlock.parent) {
                    state.currentDescribeBlock = currentDescribeBlock.parent;
                }
                break;
            }
            case 'add_hook': {
                const { currentDescribeBlock } = state;
                const { fn, hookType: type } = event;
                if (fn && type) {
                    currentDescribeBlock.hooks.push({ fn, type });
                }
                break;
            }
            case 'run_benchmark': {
                const currentDescribeBlock = state.currentDescribeBlock;
                const { fn } = event;
                if (fn) {
                    const benchmark = makeBenchmarkRun(fn, currentDescribeBlock);
                    currentDescribeBlock.run = benchmark;
                }
                break;
            }
        }
    };

    /*
     * Copyright (c) 2019, salesforce.com, inc.
     * All rights reserved.
     * SPDX-License-Identifier: MIT
     * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
    */
    var DEFAULT_STATE = Object.freeze({
        benchmarkName: "",
        useMacroTaskAfterBenchmark: true,
        maxDuration: 1000 * 20,
        minSampleCount: 30,
        iterations: 0,
        results: [],
        executedTime: 0,
        executedIterations: 0,
    });

    /*
     * Copyright (c) 2019, salesforce.com, inc.
     * All rights reserved.
     * SPDX-License-Identifier: MIT
     * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
    */
    function cloneState(obj) {
        const stateClone = Object.assign({}, obj);
        if (stateClone.children) {
            stateClone.children = stateClone.children.map((obj) => cloneState(obj));
        }
        if (stateClone.run) {
            stateClone.run = Object.assign({}, stateClone.run);
        }
        return stateClone;
    }

    /*
     * Copyright (c) 2019, salesforce.com, inc.
     * All rights reserved.
     * SPDX-License-Identifier: MIT
     * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
    */
    const eventHandlers = [handler];
    const ROOT_DESCRIBE_BLOCK_NAME = typeof BEST_CONFIG !== 'undefined' ? BEST_CONFIG.benchmarkName : 'ROOT_DESCRIBE_BLOCK';
    const ROOT_DESCRIBE_BLOCK = makeDescribe(ROOT_DESCRIBE_BLOCK_NAME);
    const STATE = Object.assign({}, DEFAULT_STATE, {
        currentDescribeBlock: ROOT_DESCRIBE_BLOCK,
        rootDescribeBlock: ROOT_DESCRIBE_BLOCK,
    });
    const getBenckmarkState = () => cloneState(STATE);
    const getBenchmarkRootNode = () => getBenckmarkState().rootDescribeBlock;
    const initializeBenchmarkConfig = (newOpts) => {
        if (newOpts.iterations !== undefined) {
            if (newOpts.iterateOnClient === undefined) {
                newOpts.iterateOnClient = true;
            }
            newOpts.minSampleCount = newOpts.iterations;
            newOpts.maxDuration = 1;
        }
        return Object.assign(STATE, newOpts);
    };
    // PROTECTED: Should only be used by the primitives
    function dispatch(event) {
        try {
            for (const handler of eventHandlers) {
                handler(event, STATE);
            }
        }
        catch (err) {
            STATE.benchmarkDefinitionError = err;
        }
    }

    /*
     * Copyright (c) 2019, salesforce.com, inc.
     * All rights reserved.
     * SPDX-License-Identifier: MIT
     * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
    */
    /*
     * This code is a slight modification of VueJS next-tick
     * https://github.com/vuejs/vue/blob/dev/src/core/util/next-tick.js
     *
     */
    function isNative(Ctor) {
        return typeof Ctor === 'function' && /native code/.test(Ctor.toString());
    }
    const callbacks = [];
    let pending = false;
    function flushCallbacks() {
        pending = false;
        const copies = callbacks.slice(0);
        callbacks.length = 0;
        for (let i = 0; i < copies.length; i++) {
            copies[i]();
        }
    }
    function handleError(e, ctx, type) {
        console.error(e, ctx, type);
    }
    let microTimerFunc;
    let macroTimerFunc;
    let useMacroTask = false;
    // Determine (macro) Task defer implementation.
    // Technically setImmediate should be the ideal choice, but it's only available
    // in IE. The only polyfill that consistently queues the callback after all DOM
    // events triggered in the same loop is by using MessageChannel.
    /* istanbul ignore if */
    if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
        macroTimerFunc = () => {
            setImmediate(flushCallbacks);
        };
    }
    else if (typeof MessageChannel !== 'undefined' &&
        (isNative(MessageChannel) ||
            // PhantomJS
            MessageChannel.toString() === '[object MessageChannelConstructor]')) {
        const channel = new MessageChannel();
        const port = channel.port2;
        channel.port1.onmessage = flushCallbacks;
        macroTimerFunc = () => {
            port.postMessage(1);
        };
    }
    else {
        /* istanbul ignore next */
        macroTimerFunc = () => {
            setTimeout(flushCallbacks, 0);
        };
    }
    // Determine MicroTask defer implementation.
    /* istanbul ignore next, $flow-disable-line */
    if (typeof Promise !== 'undefined' && isNative(Promise)) {
        const p = Promise.resolve();
        microTimerFunc = () => {
            p.then(flushCallbacks);
        };
    }
    else {
        // fallback to macro
        microTimerFunc = macroTimerFunc;
    }
    /*
     * Wrap a function so that if any code inside triggers state change,
     * the changes are queued using a Task instead of a MicroTask.
     */
    function withMacroTask(fn) {
        return (fn._withTask ||
            (fn._withTask = function () {
                useMacroTask = true;
                const res = fn.apply(null, arguments);
                useMacroTask = false;
                return res;
            }));
    }
    function nextTick(cb, ctx) {
        let _resolve;
        callbacks.push(() => {
            if (cb) {
                try {
                    cb.call(ctx);
                }
                catch (e) {
                    handleError(e, ctx, 'nextTick');
                }
            }
            else if (_resolve) {
                _resolve(ctx);
            }
        });
        if (!pending) {
            pending = true;
            if (useMacroTask) {
                macroTimerFunc();
            }
            else {
                microTimerFunc();
            }
        }
        return cb ? null : new Promise(resolve => {
            _resolve = resolve;
        });
    }
    const time = window.performance.now.bind(window.performance);
    const formatTime = (t) => Math.round(t * 1000) / 1000;
    const raf = window && window.requestAnimationFrame ? window.requestAnimationFrame : nextTick;

    /*
     * Copyright (c) 2019, salesforce.com, inc.
     * All rights reserved.
     * SPDX-License-Identifier: MIT
     * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
    */
    var BenchmarkMeasureType;
    (function (BenchmarkMeasureType) {
        BenchmarkMeasureType["Execute"] = "BEST/execute";
        BenchmarkMeasureType["Before"] = "BEST/before";
        BenchmarkMeasureType["After"] = "BEST/after";
    })(BenchmarkMeasureType || (BenchmarkMeasureType = {}));
    const _initHandlers = () => Object.values(HOOKS).reduce((o, k) => {
        o[k] = [];
        return o;
    }, {});
    const _initHooks = (hooks) => hooks.reduce((m, { type, fn }) => {
        m[type].push(fn);
        return m;
    }, _initHandlers());
    const _forceGC = () => window.gc && window.gc();
    function startMeasure(markName, type) {
        performance.mark(`${type}/${markName}`);
    }
    function endMeasure(markName, type) {
        const eventName = `${type}/${markName}`;
        performance.measure(eventName, eventName);
        performance.clearMarks(eventName);
        performance.clearMeasures(eventName);
    }
    const executeBenchmark = async (benchmarkNode, markName, { useMacroTaskAfterBenchmark }) => {
        // Force garbage collection before executing an iteration (--js-flags=--expose-gc)
        _forceGC();
        return new Promise((resolve, reject) => {
            raf(async () => {
                benchmarkNode.startedAt = formatTime(time());
                startMeasure(markName, BenchmarkMeasureType.Execute);
                try {
                    await benchmarkNode.fn();
                    benchmarkNode.metrics.script = formatTime(time() - benchmarkNode.startedAt);
                    if (useMacroTaskAfterBenchmark) {
                        withMacroTask(async () => {
                            await nextTick();
                            benchmarkNode.aggregate = formatTime(time() - benchmarkNode.startedAt);
                            endMeasure(markName, BenchmarkMeasureType.Execute);
                            resolve();
                        })();
                    }
                    else {
                        benchmarkNode.aggregate = formatTime(time() - benchmarkNode.startedAt);
                        endMeasure(markName, BenchmarkMeasureType.Execute);
                        resolve();
                    }
                }
                catch (e) {
                    benchmarkNode.aggregate = -1;
                    endMeasure(markName, BenchmarkMeasureType.Execute);
                    reject();
                }
            });
        });
    };
    const runBenchmarkIteration = async (node, opts) => {
        const { hooks, children, run } = node;
        const hookHandlers = _initHooks(hooks);
        // -- Before All ----
        for (const hook of hookHandlers[HOOKS.BEFORE_ALL]) {
            await hook();
        }
        // -- For each children ----
        if (children) {
            for (const child of children) {
                // -- Traverse Child ----
                node.startedAt = formatTime(time());
                await runBenchmarkIteration(child, opts);
                node.aggregate = formatTime(time() - node.startedAt);
            }
        }
        if (run) {
            // -- Before ----
            const markName = run.parent.name;
            if (process.env.NODE_ENV !== 'production') {
                startMeasure(markName, BenchmarkMeasureType.Before);
            }
            for (const hook of hookHandlers[HOOKS.BEFORE]) {
                await hook();
            }
            if (process.env.NODE_ENV !== 'production') {
                endMeasure(markName, BenchmarkMeasureType.Before);
            }
            // -- Run ----
            node.startedAt = formatTime(time());
            await executeBenchmark(run, markName, opts);
            node.aggregate = formatTime(time() - node.startedAt);
            // -- After ----
            if (process.env.NODE_ENV !== 'production') {
                startMeasure(markName, BenchmarkMeasureType.After);
            }
            for (const hook of hookHandlers[HOOKS.AFTER]) {
                await hook();
            }
            if (process.env.NODE_ENV !== 'production') {
                endMeasure(markName, BenchmarkMeasureType.After);
            }
        }
        // -- After All ----
        for (const hook of hookHandlers[HOOKS.AFTER_ALL]) {
            await hook();
        }
        return node;
    };

    /*
     * Copyright (c) 2019, salesforce.com, inc.
     * All rights reserved.
     * SPDX-License-Identifier: MIT
     * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
    */
    function normalizeResults(benchmarkState) {
        const { benchmarkName, executedIterations, executedTime: aggregate, results } = benchmarkState;
        return {
            benchmarkName,
            executedIterations,
            aggregate,
            results,
        };
    }

    /*
     * Copyright (c) 2019, salesforce.com, inc.
     * All rights reserved.
     * SPDX-License-Identifier: MIT
     * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
    */
    function validateState(benchmarkState) {
        const { rootDescribeBlock, currentDescribeBlock, benchmarkDefinitionError } = benchmarkState;
        if (benchmarkDefinitionError) {
            return; // Nothing to do; there is already an error
        }
        if (rootDescribeBlock !== currentDescribeBlock) {
            benchmarkState.benchmarkDefinitionError = new Error('Benchmark parsing error');
        }
        if (rootDescribeBlock.children.length === 0) {
            benchmarkState.benchmarkDefinitionError = new Error('No benchmarks to run');
        }
    }

    /*
     * Copyright (c) 2019, salesforce.com, inc.
     * All rights reserved.
     * SPDX-License-Identifier: MIT
     * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
    */
    function collectNodeResults(node) {
        const { name, aggregate, startedAt, run, children } = node;
        const type = node.type;
        const resultNode = { type, name, aggregate, startedAt };
        if (run) {
            resultNode.aggregate = run.aggregate;
            resultNode.metrics = run.metrics;
        }
        else if (children) {
            resultNode.nodes = children.map((c) => collectNodeResults(c));
        }
        return resultNode;
    }
    async function runIterations(config) {
        if (config.executedTime < config.maxDuration || config.executedIterations < config.minSampleCount) {
            const { useMacroTaskAfterBenchmark } = config;
            const benchmark = await runBenchmarkIteration(getBenchmarkRootNode(), { useMacroTaskAfterBenchmark });
            const results = collectNodeResults(benchmark);
            config.results.push(results);
            config.executedTime += benchmark.aggregate;
            config.executedIterations += 1;
            if (!config.iterateOnClient) {
                return config;
            }
            return runIterations(config);
        }
        return config;
    }
    async function runBenchmark(benchmarkState) {
        validateState(benchmarkState);
        if (benchmarkState.benchmarkDefinitionError) {
            throw benchmarkState.benchmarkDefinitionError;
        }
        benchmarkState.results = [];
        await runIterations(benchmarkState);
        return normalizeResults(benchmarkState);
    }

    /*
     * Copyright (c) 2019, salesforce.com, inc.
     * All rights reserved.
     * SPDX-License-Identifier: MIT
     * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
    */
    const _dispatchDescribe = (nodeName, blockFn, mode) => {
        dispatch({ nodeName, mode, nodeType: 'start_describe_definition' });
        blockFn();
        dispatch({ nodeName, nodeType: 'finish_describe_definition' });
    };
    const describe = (blockName, blockFn) => _dispatchDescribe(blockName, blockFn);
    describe.only = (blockName, blockFn) => _dispatchDescribe(blockName, blockFn, MODES.ONLY);
    describe.skip = (blockName, blockFn) => _dispatchDescribe(blockName, blockFn, MODES.SKIP);
    const _dispatchBenchmark = (nodeName, blockFn, mode) => {
        dispatch({ nodeName, mode, nodeType: 'start_benchmark_definition' });
        blockFn();
        dispatch({ nodeName, nodeType: 'finish_benchmark_definition' });
    };
    const benchmark = (benchmarkName, fn) => _dispatchBenchmark(benchmarkName, fn);
    benchmark.only = (benchmarkName, fn) => _dispatchBenchmark(benchmarkName, fn, MODES.ONLY);
    benchmark.skip = (benchmarkName, fn) => _dispatchBenchmark(benchmarkName, fn, MODES.SKIP);
    const _addHook = (fn, hookType) => dispatch({ nodeName: 'hook', fn, hookType, nodeType: 'add_hook' });
    const afterAll = (fn) => _addHook(fn, HOOKS.AFTER_ALL);
    const run = (fn) => dispatch({ nodeName: 'run', fn, nodeType: RUN_BENCHMARK });

    /*
     * Copyright (c) 2019, salesforce.com, inc.
     * All rights reserved.
     * SPDX-License-Identifier: MIT
     * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
    */
    const setupBenchmark = (config) => initializeBenchmarkConfig(config);
    const runBenchmark$1 = async (config) => {
        if (config) {
            setupBenchmark(config);
        }
        const benchmarkState = getBenckmarkState();
        const benchmarkResults = await runBenchmark(benchmarkState);
        return benchmarkResults;
    };
    // Expose BEST API
    const BEST = { setupBenchmark, runBenchmark: runBenchmark$1 };
    window.BEST = BEST;
    window.process = { env: { NODE_ENV: 'development' } };
    // Auto-load
    window.addEventListener('load', async () => {
        const config = setupBenchmark(window.BEST_CONFIG);
        if (config.autoStart) {
            window.BEST_RESULTS = await runBenchmark$1();
        }
    });

    describe('my-app', () => {
        // eslint-disable-next-line no-undef
        benchmark('create_and_render', () => {
            let element;
            // eslint-disable-next-line no-undef
            run(() => {
                element = lwc.createElement('my-app', { is: MyApp });
                element.flavor = 'red';
                document.body.appendChild(element);
            });
            afterAll(() => {
                return element && element.parentElement.removeChild(element);
            });
        });
    });

}(lwc, MyApp));
