export interface AreaMapping {
  filePatterns: string[];
  testTags: string[];
}

export interface TestMappingConfig {
  mappings: Record<string, AreaMapping>;
  priorities: {
    critical: string[];
    high: string[];
    medium: string[];
    low: string[];
  };
}

const testMapping: TestMappingConfig = {
  mappings: {
    authentication: {
      filePatterns: [
        'src/auth/**',
        'src/login/**',
        'src/components/LoginForm/**',
      ],
      testTags: ['@auth', '@login', '@authentication'],
    },
    checkout: {
      filePatterns: [
        'src/checkout/**',
        'src/payment/**',
        'src/cart/**',
      ],
      testTags: ['@checkout', '@payment', '@cart'],
    },
    userProfile: {
      filePatterns: [
        'src/profile/**',
        'src/settings/**',
        'src/user/**',
      ],
      testTags: ['@profile', '@settings', '@user'],
    },
    dashboard: {
      filePatterns: [
        'src/dashboard/**',
        'src/analytics/**',
      ],
      testTags: ['@dashboard', '@analytics'],
    },
  },

  priorities: {
    critical: ['authentication', 'checkout'],
    high: ['userProfile', 'dashboard'],
    medium: [],
    low: [],
  },
};

export default testMapping;
