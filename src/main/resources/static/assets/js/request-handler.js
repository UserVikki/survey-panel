/**
 * Robust Request Handler with Retry, Queue, and Offline Support
 * Ensures no requests are lost even in case of network issues
 */

class RequestHandler {
    constructor() {
        this.requestQueue = [];
        this.isOnline = navigator.onLine;
        this.maxRetries = 3;
        this.retryDelay = 1000; // Start with 1 second
        this.maxRetryDelay = 30000; // Max 30 seconds

        // Load pending requests from localStorage
        this.loadPendingRequests();

        // Setup online/offline listeners
        this.setupNetworkListeners();

        // Process queue periodically
        this.startQueueProcessor();
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            console.log('Network connection restored');
            this.isOnline = true;
            this.processQueue();
        });

        window.addEventListener('offline', () => {
            console.log('Network connection lost');
            this.isOnline = false;
        });
    }

    startQueueProcessor() {
        // Process queue every 5 seconds
        setInterval(() => {
            if (this.isOnline && this.requestQueue.length > 0) {
                this.processQueue();
            }
        }, 5000);
    }

    /**
     * Make a fetch request with automatic retry and queuing
     */
    async fetch(url, options = {}) {
        const requestId = this.generateRequestId();
        const requestData = {
            id: requestId,
            url: url,
            options: options,
            timestamp: new Date().toISOString(),
            retryCount: 0
        };

        try {
            return await this.executeRequest(requestData);
        } catch (error) {
            console.error(`Request failed: ${url}`, error);

            // Add to queue for retry
            this.addToQueue(requestData);

            // If it's a critical request (POST, PUT, DELETE), save to localStorage
            if (options.method && ['POST', 'PUT', 'DELETE'].includes(options.method.toUpperCase())) {
                this.savePendingRequests();
            }

            throw error;
        }
    }

    async executeRequest(requestData, isRetry = false) {
        const { url, options, retryCount } = requestData;

        try {
            console.log(`${isRetry ? 'Retrying' : 'Executing'} request: ${url} (attempt ${retryCount + 1})`);

            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const fetchOptions = {
                ...options,
                signal: controller.signal
            };

            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            // Check if response is OK
            if (!response.ok) {
                // Handle specific error codes
                if (response.status === 401) {
                    console.log('Unauthorized - redirecting to login');
                    localStorage.removeItem('jwtToken');
                    window.location.href = '/login';
                    throw new Error('Unauthorized');
                }

                if (response.status >= 500) {
                    // Server error - retry
                    throw new Error(`Server error: ${response.status}`);
                }

                if (response.status === 429) {
                    // Too many requests - wait longer before retry
                    throw new Error('Rate limited');
                }
            }

            // Request successful - remove from queue if it was queued
            this.removeFromQueue(requestData.id);

            return response;

        } catch (error) {
            console.error(`Request execution failed: ${url}`, error);

            // Determine if we should retry
            if (this.shouldRetry(error, retryCount)) {
                requestData.retryCount = retryCount + 1;

                // Calculate exponential backoff delay
                const delay = Math.min(
                    this.retryDelay * Math.pow(2, retryCount),
                    this.maxRetryDelay
                );

                console.log(`Will retry after ${delay}ms`);

                await this.sleep(delay);
                return await this.executeRequest(requestData, true);
            }

            throw error;
        }
    }

    shouldRetry(error, retryCount) {
        if (retryCount >= this.maxRetries) {
            return false;
        }

        // Retry on network errors
        if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
            return true;
        }

        // Retry on timeout
        if (error.name === 'AbortError') {
            return true;
        }

        // Retry on server errors
        if (error.message.includes('Server error') || error.message.includes('Rate limited')) {
            return true;
        }

        return false;
    }

    addToQueue(requestData) {
        // Check if request is already in queue
        const existingIndex = this.requestQueue.findIndex(r => r.id === requestData.id);

        if (existingIndex === -1) {
            this.requestQueue.push(requestData);
            console.log(`Added request to queue: ${requestData.url} (queue size: ${this.requestQueue.length})`);
        }
    }

    removeFromQueue(requestId) {
        const index = this.requestQueue.findIndex(r => r.id === requestId);
        if (index !== -1) {
            this.requestQueue.splice(index, 1);
            this.savePendingRequests();
            console.log(`Removed request from queue (queue size: ${this.requestQueue.length})`);
        }
    }

    async processQueue() {
        if (this.requestQueue.length === 0) {
            return;
        }

        console.log(`Processing request queue (${this.requestQueue.length} pending)`);

        // Process requests one at a time
        const request = this.requestQueue[0];

        try {
            await this.executeRequest(request, true);
        } catch (error) {
            console.error('Failed to process queued request', error);

            // If max retries exceeded, remove from queue and log
            if (request.retryCount >= this.maxRetries) {
                console.error('Max retries exceeded for request:', request);
                this.removeFromQueue(request.id);
                this.logFailedRequest(request);
            }
        }
    }

    savePendingRequests() {
        try {
            // Only save critical requests (POST, PUT, DELETE)
            const criticalRequests = this.requestQueue.filter(r => {
                const method = r.options.method?.toUpperCase();
                return method && ['POST', 'PUT', 'DELETE'].includes(method);
            });

            if (criticalRequests.length > 0) {
                localStorage.setItem('pendingRequests', JSON.stringify(criticalRequests));
                console.log(`Saved ${criticalRequests.length} pending requests to localStorage`);
            }
        } catch (error) {
            console.error('Failed to save pending requests', error);
        }
    }

    loadPendingRequests() {
        try {
            const saved = localStorage.getItem('pendingRequests');
            if (saved) {
                const requests = JSON.parse(saved);
                this.requestQueue = requests;
                console.log(`Loaded ${requests.length} pending requests from localStorage`);

                // Clear from localStorage after loading
                localStorage.removeItem('pendingRequests');

                // Process immediately if online
                if (this.isOnline) {
                    this.processQueue();
                }
            }
        } catch (error) {
            console.error('Failed to load pending requests', error);
        }
    }

    logFailedRequest(request) {
        // Log failed request for manual recovery
        const failedRequests = JSON.parse(localStorage.getItem('failedRequests') || '[]');
        failedRequests.push({
            ...request,
            failedAt: new Date().toISOString()
        });

        // Keep only last 100 failed requests
        if (failedRequests.length > 100) {
            failedRequests.shift();
        }

        localStorage.setItem('failedRequests', JSON.stringify(failedRequests));
        console.error('Request permanently failed and logged:', request.url);
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get queue status
    getQueueStatus() {
        return {
            pending: this.requestQueue.length,
            isOnline: this.isOnline,
            requests: this.requestQueue.map(r => ({
                id: r.id,
                url: r.url,
                method: r.options.method,
                retryCount: r.retryCount,
                timestamp: r.timestamp
            }))
        };
    }

    // Get failed requests for admin review
    getFailedRequests() {
        return JSON.parse(localStorage.getItem('failedRequests') || '[]');
    }

    // Clear failed requests
    clearFailedRequests() {
        localStorage.removeItem('failedRequests');
    }
}

// Create global instance
window.requestHandler = new RequestHandler();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RequestHandler;
}

