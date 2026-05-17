/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(tabs)` | `/(tabs)/history` | `/(tabs)/home` | `/_sitemap` | `/auth/register` | `/auth/verify` | `/history` | `/home` | `/onboarding` | `/trip/active`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}
