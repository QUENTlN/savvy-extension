// Centralized State Management for the sidebar

export const Store = {
  // Centralized state
  state: {
    sessions: [],
    currentSession: null,
    currentView: 'sessions',
    currentRulesView: 'list',
    currentSellerEditing: null,
    currentProduct: null,
    scrapedData: null,
    currency: '€',
    isLoading: false,
    currentOptimizationResult: null,
    viewingHistory: false,
    hasOptimizationHistory: false,
    rateLimit: null, // { limit, remaining, reset }
  },

  // Subscribers for state changes
  listeners: [],

  // ---- GETTERS ----

  /**
   * Get session by ID or current session
   * @param {string} [id] - Session ID (defaults to currentSession)
   * @returns {Object|undefined} Session object
   */
  getSession(id) {
    return this.state.sessions.find(s => s.id === (id || this.state.currentSession));
  },

  /**
   * Get product by ID from current session
   * @param {string} productId - Product ID
   * @returns {Object|undefined} Product object
   */
  getProduct(productId) {
    const session = this.getSession();
    return session?.products?.find(p => p.id === productId);
  },

  /**
   * Get current session object
   * @returns {Object|undefined} Current session
   */
  getCurrentSession() {
    return this.getSession(this.state.currentSession);
  },

  // ---- MUTATIONS ----

  /**
   * Update state with partial updates
   * @param {Object} updates - State updates to apply
   * @param {boolean} [skipRender=false] - Skip notifying listeners
   */
  setState(updates, skipRender = false) {
    Object.assign(this.state, updates);
    if (!skipRender) this.notify();
  },

  /**
   * Sync state with background via API call
   * @param {Promise} apiCall - Promise from SidebarAPI
   * @returns {Promise} Resolved API response
   */
  async sync(apiCall) {
    this.setState({ isLoading: true }, true);
    try {
      const response = await apiCall;
      if (response.sessions !== undefined) {
        this.setState({
          sessions: response.sessions,
          currentSession: response.currentSession,
          isLoading: false,
        });
      } else {
        this.setState({ isLoading: false }, true);
      }
      return response;
    } catch (error) {
      this.setState({ isLoading: false }, true);
      throw error;
    }
  },

  /**
   * Navigate to a view with optional state updates
   * @param {string} view - View name
   * @param {Object} [updates={}] - Additional state updates
   */
  navigate(view, updates = {}) {
    this.setState({ currentView: view, ...updates });
  },

  // ---- SUBSCRIPTIONS ----

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },

  /**
   * Notify all listeners of state change
   */
  notify() {
    this.listeners.forEach(listener => listener(this.state));
  },

  /**
   * Initialize store with data from background
   * @param {Object} data - Initial data { sessions, currentSession }
   */
  init(data) {
    this.setState({
      sessions: data.sessions || [],
      currentSession: data.currentSession || null,
    }, true);
  }
};
