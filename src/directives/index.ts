import { App } from 'vue';
import { createTrackDirective } from './track';

/**
 * Register all directives
 * @param app Vue application instance
 */
export function registerDirectives(app: App): void {
  // Register v-track directive
  app.directive('track', createTrackDirective());
}

export * from './track';