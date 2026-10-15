import base from "./playwright.config";

// The windows of the app are shown on the screen, for watching a test or finding why it fails
process.env.E2E_HEADED = "1";

export default base;
