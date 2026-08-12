export const init = jest.fn();
export const captureMessage = jest.fn();
export const captureException = jest.fn();
export const addBreadcrumb = jest.fn();

const sentryMock = { init, captureMessage, captureException, addBreadcrumb };
export default sentryMock;
