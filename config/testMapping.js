/**
 * Maps code areas to test patterns
 * Customize this based on your application structure
 */
module.exports = {
  mappings: {
    authentication: {
      filePatterns: [
        'src/auth/**',
        'src/login/**',
        'src/components/LoginForm/**'
      ],
      testTags: ['@auth', '@login', '@authentication']
    },
    checkout: {
      filePatterns: [
        'src/checkout/**',
        'src/payment/**',
        'src/cart/**'
      ],
      testTags: ['@checkout', '@payment', '@cart']
    },
    userProfile: {
      filePatterns: [
        'src/profile/**',
        'src/settings/**',
        'src/user/**'
      ],
      testTags: ['@profile', '@settings', '@user']
    },
    dashboard: {
      filePatterns: [
        'src/dashboard/**',
        'src/analytics/**'
      ],
      testTags: ['@dashboard', '@analytics']
    },
    // Add more areas as needed
  },

  /**
   * Priority levels for test execution
   * Higher priority tests run first
   */
  priorities: {
    critical: ['authentication', 'checkout'],
    high: ['userProfile', 'dashboard'],
    medium: [],
    low: []
  }
};