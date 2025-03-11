import { App, Plugin } from 'vue';
import { GameAnalyticsOptions } from './types';
import { GameAnalyticsPlugin } from './core/plugin';
import { registerDirectives } from './directives';
import { generateUUID } from './utils';

// Export types
export * from './types';

// Export composables
export * from './composables';

// Export utility functions
export { generateUUID } from './utils';

/**
 * Vue 3 Game Analytics Plugin
 */
const VueGameAnalytics: Plugin = {
  install(app: App, options: GameAnalyticsOptions) {
    // Register the core plugin
    app.use(GameAnalyticsPlugin, options);
    
    // Register directives
    registerDirectives(app);
  }
};

export default VueGameAnalytics;