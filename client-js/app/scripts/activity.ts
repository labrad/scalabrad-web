/**
 * State needed to render the ui for an activity in our app.
 */
export interface ActivityState {
  elem: HTMLElement;
  route: string
  breadcrumbs?: {name: string; isLink: boolean; url?: string}[];
  breadcrumbExtras?: {name: string; isLink: boolean; url?: string}[];
}

/**
 * Activity represents a screen in our app, rendered when we visit a url.
 *
 * Because activities may require communication with the server to load data
 * before the ui can be rendered, starting an activity returns a Promise that
 * will resolve with the full ActivityState when the ui is ready to be rendered.
 * In addition to loading data, we may subscribe to notifications, set up event
 * listeners, etc.
 *
 * Similarly, stopping the activity in preparation for transitioning to a new
 * activity may require communication, and so it similarly returns a Promise
 * that will resolve when all cleanup tasks are complete.
 */
export interface Activity {

  /**
   * Start the activity. Returns a Promise that will resolve with ActivityState
   * when the activity has been initialized.
   */
  start(): Promise<ActivityState>;

  /**
   * Stop the activity. Returns a Promise that will resolve when cleanup tasks
   * are done.
   */
  stop(): Promise<void>;
}
