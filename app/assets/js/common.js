/**
 * Ultra-Advanced PattiBytes Core System
 * Modern ES6+ with advanced features, performance optimization
 */

// Advanced Performance Observer
class PerformanceTracker {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.init();
    }

    init() {
        if ('PerformanceObserver' in window) {
            this.observeNavigation();
            this.observePaint();
            this.observeLCP();
            this.observeFID();
            this.observeCLS();
        }
    }

    observeNavigation() {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                this.metrics.set('navigation', {
                    domContentLoaded: entry.domContentLoadedEventEnd - entry.navigationStart,
                    loadComplete: entry.loadEventEnd - entry.navigationStart,
                    firstByte: entry.responseStart - entry.navigationStart
                });
            });
        });
        observer.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', observer);
    }

    observePaint() {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                this.metrics.set(entry.name, entry.startTime);
            });
        });
        observer.observe({ entryTypes: ['paint'] });
        this.observers.set('paint', observer);
    }

    observeLCP() {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.metrics.set('lcp', lastEntry.startTime);
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', observer);
    }

    observeFID() {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                this.metrics.set('fid', entry.processingStart - entry.startTime);
            });
        });
        observer.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', observer);
    }

    observeCLS() {
        const observer = new PerformanceObserver((list) => {
            let cumulativeScore = 0;
            const entries = list.getEntries();
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    cumulativeScore += entry.value;
                }
            });
            this.metrics.set('cls', cumulativeScore);
        });
        observer.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', observer);
    }

    getMetrics() {
        return Object.fromEntries(this.metrics);
    }
}

// Advanced State Management System
class StateManager {
    constructor() {
        this.state = new Proxy({}, {
            set: (target, key, value) => {
                const oldValue = target[key];
                target[key] = value;
                this.notifySubscribers(key, value, oldValue);
                return true;
            }
        });
        this.subscribers = new Map();
        this.middleware = [];
        this.history = [];
        this.maxHistorySize = 50;
    }

    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.subscribers.get(key);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.subscribers.delete(key);
                }
            }
        };
    }

    setState(updates) {
        const prevState = { ...this.state };
        
        // Apply middleware
        let processedUpdates = updates;
        for (const middleware of this.middleware) {
            processedUpdates = middleware(processedUpdates, this.state);
        }

        // Update state
        Object.assign(this.state, processedUpdates);

        // Add to history
        this.addToHistory(prevState, { ...this.state });
    }

    getState(key) {
        return key ? this.state[key] : { ...this.state };
    }

    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }

    addToHistory(prevState, newState) {
        this.history.push({
            timestamp: Date.now(),
            prevState,
            newState
        });

        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    notifySubscribers(key, value, oldValue) {
        const callbacks = this.subscribers.get(key);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(value, oldValue);
                } catch (error) {
                    console.error('State subscriber error:', error);
                }
            });
        }
    }

    undo() {
        if (this.history.length > 0) {
            const lastEntry = this.history.pop();
            Object.assign(this.state, lastEntry.prevState);
        }
    }

    getHistory() {
        return [...this.history];
    }
}

// Advanced Animation System
class AnimationSystem {
    constructor() {
        this.animations = new Map();
        this.rafId = null;
        this.isRunning = false;
    }

    animate(element, keyframes, options = {}) {
        const animationId = this.generateId();
        
        const animation = {
            id: animationId,
            element,
            keyframes,
            options: {
                duration: 1000,
                easing: 'ease',
                fill: 'forwards',
                ...options
            },
            startTime: null,
            currentTime: 0
        };

        this.animations.set(animationId, animation);

        if (!this.isRunning) {
            this.start();
        }

        return {
            id: animationId,
            pause: () => this.pause(animationId),
            resume: () => this.resume(animationId),
            cancel: () => this.cancel(animationId),
            finish: () => this.finish(animationId)
        };
    }

    start() {
        this.isRunning = true;
        this.rafId = requestAnimationFrame((timestamp) => this.tick(timestamp));
    }

    tick(timestamp) {
        for (const [id, animation] of this.animations) {
            if (!animation.startTime) {
                animation.startTime = timestamp;
            }

            animation.currentTime = timestamp - animation.startTime;
            const progress = Math.min(animation.currentTime / animation.options.duration, 1);
            
            // Apply easing
            const easedProgress = this.applyEasing(progress, animation.options.easing);
            
            // Interpolate values
            this.applyKeyframes(animation.element, animation.keyframes, easedProgress);

            if (progress >= 1) {
                this.animations.delete(id);
                if (animation.options.onComplete) {
                    animation.options.onComplete();
                }
            }
        }

        if (this.animations.size > 0) {
            this.rafId = requestAnimationFrame((timestamp) => this.tick(timestamp));
        } else {
            this.isRunning = false;
        }
    }

    applyEasing(progress, easing) {
        switch (easing) {
            case 'ease-in':
                return progress * progress;
            case 'ease-out':
                return 1 - Math.pow(1 - progress, 2);
            case 'ease-in-out':
                return progress < 0.5 
                    ? 2 * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            case 'bounce':
                return this.bounceEase(progress);
            case 'elastic':
                return this.elasticEase(progress);
            default:
                return progress;
        }
    }

    bounceEase(t) {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        return t < 0.5
            ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
            : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    }

    elasticEase(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0
            ? 0
            : t === 1
            ? 1
            : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    }

    applyKeyframes(element, keyframes, progress) {
        for (const [property, values] of Object.entries(keyframes)) {
            if (Array.isArray(values) && values.length === 2) {
                const [start, end] = values;
                const current = this.interpolate(start, end, progress);
                element.style[property] = current;
            }
        }
    }

    interpolate(start, end, progress) {
        if (typeof start === 'number' && typeof end === 'number') {
            return start + (end - start) * progress;
        }
        
        if (typeof start === 'string' && typeof end === 'string') {
            // Handle color interpolation
            if (start.startsWith('#') && end.startsWith('#')) {
                return this.interpolateColor(start, end, progress);
            }
            
            // Handle unit-based values (px, %, rem, etc.)
            const startValue = parseFloat(start);
            const endValue = parseFloat(end);
            const unit = start.replace(/[0-9.-]/g, '');
            
            if (!isNaN(startValue) && !isNaN(endValue)) {
                const currentValue = startValue + (endValue - startValue) * progress;
                return currentValue + unit;
            }
        }
        
        return progress < 0.5 ? start : end;
    }

    interpolateColor(start, end, progress) {
        const startRgb = this.hexToRgb(start);
        const endRgb = this.hexToRgb(end);
        
        if (startRgb && endRgb) {
            const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * progress);
            const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * progress);
            const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * progress);
            
            return this.rgbToHex(r, g, b);
        }
        
        return progress < 0.5 ? start : end;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    cancel(animationId) {
        this.animations.delete(animationId);
    }

    pause(animationId) {
        const animation = this.animations.get(animationId);
        if (animation) {
            animation.paused = true;
        }
    }

    resume(animationId) {
        const animation = this.animations.get(animationId);
        if (animation) {
            animation.paused = false;
        }
    }

    finish(animationId) {
        const animation = this.animations.get(animationId);
        if (animation) {
            this.applyKeyframes(animation.element, animation.keyframes, 1);
            this.animations.delete(animationId);
            if (animation.options.onComplete) {
                animation.options.onComplete();
            }
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Advanced Intersection Observer Manager
class ViewportObserver {
    constructor() {
        this.observers = new Map();
        this.elements = new WeakMap();
    }

    observe(element, options = {}) {
        const config = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1,
            ...options
        };

        const key = JSON.stringify(config);
        
        if (!this.observers.has(key)) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const callbacks = this.elements.get(entry.target);
                    if (callbacks) {
                        callbacks.forEach(callback => callback(entry));
                    }
                });
            }, config);
            
            this.observers.set(key, observer);
        }

        const observer = this.observers.get(key);
        
        if (!this.elements.has(element)) {
            this.elements.set(element, new Set());
        }

        const callback = options.callback || (() => {});
        this.elements.get(element).add(callback);
        observer.observe(element);

        return () => {
            const callbacks = this.elements.get(element);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    observer.unobserve(element);
                    this.elements.delete(element);
                }
            }
        };
    }

    lazyLoad(elements, options = {}) {
        elements.forEach(element => {
            this.observe(element, {
                ...options,
                callback: (entry) => {
                    if (entry.isIntersecting) {
                        const src = element.dataset.src || element.dataset.lazySrc;
                        if (src) {
                            if (element.tagName === 'IMG') {
                                element.src = src;
                                element.removeAttribute('data-src');
                                element.removeAttribute('data-lazy-src');
                            } else {
                                element.style.backgroundImage = `url(${src})`;
                            }
                        }
                        
                        // Auto-unobserve after loading
                        this.observers.forEach(observer => observer.unobserve(element));
                    }
                }
            });
        });
    }

    animateOnScroll(elements, animationClass = 'animate-fade-in-up') {
        elements.forEach(element => {
            this.observe(element, {
                threshold: 0.2,
                callback: (entry) => {
                    if (entry.isIntersecting) {
                        element.classList.add(animationClass);
                        // Auto-unobserve after animation
                        setTimeout(() => {
                            this.observers.forEach(observer => observer.unobserve(element));
                        }, 1000);
                    }
                }
            });
        });
    }
}

// Advanced Touch Gesture Handler
class GestureHandler {
    constructor(element) {
        this.element = element;
        this.gestures = new Map();
        this.activePointers = new Map();
        this.init();
    }

    init() {
        this.element.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        this.element.addEventListener('pointermove', this.handlePointerMove.bind(this));
        this.element.addEventListener('pointerup', this.handlePointerUp.bind(this));
        this.element.addEventListener('pointercancel', this.handlePointerCancel.bind(this));
    }

    on(gesture, callback) {
        if (!this.gestures.has(gesture)) {
            this.gestures.set(gesture, new Set());
        }
        this.gestures.get(gesture).add(callback);

        return () => {
            const callbacks = this.gestures.get(gesture);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.gestures.delete(gesture);
                }
            }
        };
    }

    emit(gesture, data) {
        const callbacks = this.gestures.get(gesture);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    handlePointerDown(event) {
        this.activePointers.set(event.pointerId, {
            id: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            currentX: event.clientX,
            currentY: event.clientY,
            startTime: Date.now()
        });
    }

    handlePointerMove(event) {
        const pointer = this.activePointers.get(event.pointerId);
        if (!pointer) return;

        pointer.currentX = event.clientX;
        pointer.currentY = event.clientY;

        const deltaX = pointer.currentX - pointer.startX;
        const deltaY = pointer.currentY - pointer.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Pan gesture
        if (distance > 10) {
            this.emit('pan', {
                deltaX,
                deltaY,
                distance,
                direction: this.getDirection(deltaX, deltaY)
            });
        }

        // Pinch gesture (if multiple pointers)
        if (this.activePointers.size === 2) {
            const pointers = Array.from(this.activePointers.values());
            const distance = this.getDistance(pointers[0], pointers[1]);
            
            this.emit('pinch', {
                distance,
                scale: distance / this.initialDistance
            });
        }
    }

    handlePointerUp(event) {
        const pointer = this.activePointers.get(event.pointerId);
        if (!pointer) return;

        const deltaTime = Date.now() - pointer.startTime;
        const deltaX = pointer.currentX - pointer.startX;
        const deltaY = pointer.currentY - pointer.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Tap gesture
        if (distance < 10 && deltaTime < 300) {
            this.emit('tap', {
                x: pointer.currentX,
                y: pointer.currentY
            });
        }

        // Swipe gesture
        if (distance > 50 && deltaTime < 500) {
            this.emit('swipe', {
                direction: this.getDirection(deltaX, deltaY),
                distance,
                velocity: distance / deltaTime
            });
        }

        this.activePointers.delete(event.pointerId);
    }

    handlePointerCancel(event) {
        this.activePointers.delete(event.pointerId);
    }

    getDirection(deltaX, deltaY) {
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        
        if (angle >= -45 && angle <= 45) return 'right';
        if (angle >= 45 && angle <= 135) return 'down';
        if (angle >= 135 || angle <= -135) return 'left';
        if (angle >= -135 && angle <= -45) return 'up';
        
        return 'unknown';
    }

    getDistance(pointer1, pointer2) {
        const deltaX = pointer2.currentX - pointer1.currentX;
        const deltaY = pointer2.currentY - pointer1.currentY;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }
}

// Advanced Web Workers Manager
class WorkerManager {
    constructor() {
        this.workers = new Map();
        this.taskQueue = [];
        this.maxWorkers = navigator.hardwareConcurrency || 4;
        this.activeWorkers = 0;
    }

    createWorker(script, name) {
        const blob = new Blob([script], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        
        worker.onmessage = (event) => {
            this.handleMessage(name, event.data);
        };
        
        worker.onerror = (error) => {
            console.error(`Worker ${name} error:`, error);
        };

        this.workers.set(name, worker);
        return worker;
    }

    executeTask(workerName, task, data) {
        return new Promise((resolve, reject) => {
            const taskId = this.generateId();
            const taskData = {
                id: taskId,
                task,
                data,
                resolve,
                reject
            };

            if (this.activeWorkers < this.maxWorkers) {
                this.runTask(workerName, taskData);
            } else {
                this.taskQueue.push({ workerName, taskData });
            }
        });
    }

    runTask(workerName, taskData) {
        const worker = this.workers.get(workerName);
        if (!worker) {
            taskData.reject(new Error(`Worker ${workerName} not found`));
            return;
        }

        this.activeWorkers++;
        
        const taskMap = this.workers.get(`${workerName}_tasks`) || new Map();
        taskMap.set(taskData.id, taskData);
        this.workers.set(`${workerName}_tasks`, taskMap);

        worker.postMessage({
            id: taskData.id,
            task: taskData.task,
            data: taskData.data
        });
    }

    handleMessage(workerName, message) {
        const taskMap = this.workers.get(`${workerName}_tasks`);
        if (!taskMap) return;

        const task = taskMap.get(message.id);
        if (!task) return;

        if (message.error) {
            task.reject(new Error(message.error));
        } else {
            task.resolve(message.result);
        }

        taskMap.delete(message.id);
        this.activeWorkers--;

        // Process next task in queue
        if (this.taskQueue.length > 0) {
            const { workerName: nextWorkerName, taskData } = this.taskQueue.shift();
            this.runTask(nextWorkerName, taskData);
        }
    }

    terminateWorker(name) {
        const worker = this.workers.get(name);
        if (worker) {
            worker.terminate();
            this.workers.delete(name);
            this.workers.delete(`${name}_tasks`);
        }
    }

    terminateAll() {
        this.workers.forEach((worker, name) => {
            if (!name.endsWith('_tasks')) {
                worker.terminate();
            }
        });
        this.workers.clear();
        this.taskQueue = [];
        this.activeWorkers = 0;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Initialize Global Systems
window.PattiApp = {
    // Core Systems
    performance: new PerformanceTracker(),
    state: new StateManager(),
    animations: new AnimationSystem(),
    viewport: new ViewportObserver(),
    workers: new WorkerManager(),
    
    // App State
    currentUser: null,
    language: localStorage.getItem('pattibytes-lang') || 'pa',
    theme: localStorage.getItem('pattibytes-theme') || 'light',
    isOnline: navigator.onLine,
    notifications: [],
    settings: JSON.parse(localStorage.getItem('pattibytes-settings') || '{}'),
    
    // Feature Flags
    features: {
        lazyLoading: true,
        animations: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        webWorkers: 'Worker' in window,
        offlineMode: 'serviceWorker' in navigator,
        notifications: 'Notification' in window,
        geolocation: 'geolocation' in navigator
    },

    // Utility Methods
    utils: {
        debounce: (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        throttle: (func, limit) => {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            }
        },

        formatDate: (date, locale = 'en-IN') => {
            return new Intl.DateTimeFormat(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(new Date(date));
        },

        timeAgo: (date) => {
            const now = new Date();
            const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
            
            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
            
            return new Intl.DateTimeFormat('en-IN').format(new Date(date));
        },

        generateId: () => Date.now().toString(36) + Math.random().toString(36).substr(2),

        sanitizeHTML: (str) => {
            const temp = document.createElement('div');
            temp.textContent = str;
            return temp.innerHTML;
        },

        copyToClipboard: async (text) => {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                // Fallback
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                return success;
            }
        },

        $: (selector, context = document) => context.querySelector(selector),
        $$: (selector, context = document) => Array.from(context.querySelectorAll(selector))
    }
};

// Initialize Enhanced Toast System
class UltraToast {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.maxToasts = 5;
        this.positions = {
            'top-right': 'top: 20px; right: 20px;',
            'top-left': 'top: 20px; left: 20px;',
            'bottom-right': 'bottom: 20px; right: 20px;',
            'bottom-left': 'bottom: 20px; left: 20px;',
            'top-center': 'top: 20px; left: 50%; transform: translateX(-50%);',
            'bottom-center': 'bottom: 20px; left: 50%; transform: translateX(-50%);'
        };
        this.defaultPosition = 'top-right';
        this.init();
    }

    init() {
        this.createContainer();
    }

    createContainer() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.className = 'ultra-toast-container';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'true');
        this.container.style.cssText = `
            position: fixed;
            ${this.positions[this.defaultPosition]}
            z-index: 10000;
            pointer-events: none;
            max-width: 420px;
            width: 100%;
        `;
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', options = {}) {
        const config = {
            duration: 4000,
            position: this.defaultPosition,
            closable: true,
            actions: [],
            avatar: null,
            title: null,
            ...options
        };

        // Limit number of toasts
        if (this.toasts.size >= this.maxToasts) {
            const oldestToast = this.toasts.keys().next().value;
            this.remove(oldestToast);
        }

        const id = window.PattiApp.utils.generateId();
        const toast = this.createToast(id, message, type, config);
        
        this.toasts.set(id, toast);
        this.container.appendChild(toast.element);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.element.classList.add('ultra-toast-show');
        });

        // Auto remove
        if (config.duration > 0) {
            toast.autoRemoveTimer = setTimeout(() => {
                this.remove(id);
            }, config.duration);
        }

        return {
            id,
            remove: () => this.remove(id),
            update: (newMessage, newType) => this.update(id, newMessage, newType)
        };
    }

    createToast(id, message, type, config) {
        const element = document.createElement('div');
        element.className = `ultra-toast ultra-toast-${type}`;
        element.setAttribute('role', 'alert');
        element.setAttribute('data-toast-id', id);
        element.style.cssText = `
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            box-shadow: var(--shadow-xl);
            margin-bottom: 12px;
            transform: translateX(400px);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            pointer-events: auto;
            overflow: hidden;
            position: relative;
        `;

        const content = this.createToastContent(message, type, config);
        element.appendChild(content);

        // Add progress bar
        if (config.duration > 0) {
            const progressBar = document.createElement('div');
            progressBar.className = 'ultra-toast-progress';
            progressBar.style.cssText = `
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: var(--primary);
                width: 100%;
                transform-origin: left;
                animation: toast-progress ${config.duration}ms linear;
            `;
            element.appendChild(progressBar);
        }

        return {
            element,
            type,
            config,
            autoRemoveTimer: null
        };
    }

    createToastContent(message, type, config) {
        const content = document.createElement('div');
        content.className = 'ultra-toast-content';
        content.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            position: relative;
        `;

        // Avatar or icon
        const iconContainer = document.createElement('div');
        iconContainer.className = 'ultra-toast-icon';
        iconContainer.style.cssText = `
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: bold;
            flex-shrink: 0;
        `;

        if (config.avatar) {
            iconContainer.innerHTML = `<img src="${config.avatar}" alt="" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            const icons = {
                success: { icon: '✓', bg: 'var(--success)', color: 'white' },
                error: { icon: '✕', bg: 'var(--error)', color: 'white' },
                warning: { icon: '⚠', bg: 'var(--warning)', color: 'white' },
                info: { icon: 'ℹ', bg: 'var(--info)', color: 'white' },
                loading: { icon: '⟳', bg: 'var(--primary)', color: 'white' }
            };
            
            const iconData = icons[type] || icons.info;
            iconContainer.style.background = iconData.bg;
            iconContainer.style.color = iconData.color;
            iconContainer.textContent = iconData.icon;
            
            if (type === 'loading') {
                iconContainer.style.animation = 'rotate360 1s linear infinite';
            }
        }

        content.appendChild(iconContainer);

        // Text content
        const textContainer = document.createElement('div');
        textContainer.className = 'ultra-toast-text';
        textContainer.style.cssText = `
            flex: 1;
            min-width: 0;
        `;

        if (config.title) {
            const title = document.createElement('div');
            title.className = 'ultra-toast-title';
            title.style.cssText = `
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 4px;
                font-size: 14px;
            `;
            title.textContent = config.title;
            textContainer.appendChild(title);
        }

        const messageElement = document.createElement('div');
        messageElement.className = 'ultra-toast-message';
        messageElement.style.cssText = `
            color: var(--text-secondary);
            font-size: 13px;
            line-height: 1.4;
            word-break: break-word;
        `;
        messageElement.textContent = message;
        textContainer.appendChild(messageElement);

        // Actions
        if (config.actions && config.actions.length > 0) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'ultra-toast-actions';
            actionsContainer.style.cssText = `
                display: flex;
                gap: 8px;
                margin-top: 8px;
            `;

            config.actions.forEach(action => {
                const button = document.createElement('button');
                button.textContent = action.label;
                button.style.cssText = `
                    padding: 4px 8px;
                    border: 1px solid var(--border-light);
                    border-radius: 6px;
                    background: var(--surface);
                    color: var(--text-primary);
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                `;
                button.addEventListener('click', action.handler);
                actionsContainer.appendChild(button);
            });

            textContainer.appendChild(actionsContainer);
        }

        content.appendChild(textContainer);

        // Close button
        if (config.closable) {
            const closeButton = document.createElement('button');
            closeButton.className = 'ultra-toast-close';
            closeButton.innerHTML = '×';
            closeButton.setAttribute('aria-label', 'Close notification');
            closeButton.style.cssText = `
                position: absolute;
                top: 8px;
                right: 8px;
                width: 24px;
                height: 24px;
                border: none;
                background: var(--surface-hover);
                color: var(--text-tertiary);
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                transition: all 0.2s;
            `;
            closeButton.addEventListener('click', () => this.remove(id));
            content.appendChild(closeButton);
        }

        return content;
    }

    remove(id) {
        const toast = this.toasts.get(id);
        if (!toast) return;

        // Clear auto-remove timer
        if (toast.autoRemoveTimer) {
            clearTimeout(toast.autoRemoveTimer);
        }

        // Animate out
        toast.element.classList.remove('ultra-toast-show');
        toast.element.classList.add('ultra-toast-hide');

        setTimeout(() => {
            if (toast.element.parentNode) {
                toast.element.parentNode.removeChild(toast.element);
            }
            this.toasts.delete(id);
        }, 400);
    }

    update(id, newMessage, newType) {
        const toast = this.toasts.get(id);
        if (!toast) return;

        const messageElement = toast.element.querySelector('.ultra-toast-message');
        if (messageElement) {
            messageElement.textContent = newMessage;
        }

        if (newType && newType !== toast.type) {
            toast.element.className = `ultra-toast ultra-toast-${newType} ultra-toast-show`;
            toast.type = newType;
        }
    }

    clear() {
        this.toasts.forEach((_, id) => this.remove(id));
    }

    setPosition(position) {
        if (this.positions[position]) {
            this.defaultPosition = position;
            if (this.container) {
                this.container.style.cssText = `
                    position: fixed;
                    ${this.positions[position]}
                    z-index: 10000;
                    pointer-events: none;
                    max-width: 420px;
                    width: 100%;
                `;
            }
        }
    }
}

// Add toast progress animation
const style = document.createElement('style');
style.textContent = `
    @keyframes toast-progress {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
    }
    
    .ultra-toast-show {
        transform: translateX(0) !important;
    }
    
    .ultra-toast-hide {
        transform: translateX(400px) !important;
        opacity: 0 !important;
    }
`;
document.head.appendChild(style);

// Initialize Ultra Toast
window.UltraToast = new UltraToast();

// Export for compatibility
window.Toast = window.UltraToast;

console.log('🚀 Ultra-Modern PattiBytes Core System Loaded!');
