import { runFill, type AttachInput, type FillOptions, type FillResultEntry } from "@applydesk/shared";
import type { StandardAnswers } from "@applydesk/shared";

// Unlisted script (PROJECT_SPEC.md §5.3: injected only when the user clicks,
// never a persistent content script). Loaded once via
// browser.scripting.executeScript({ files: [...] }), then invoked with
// dynamic args via a second, tiny executeScript({ func }) call — see
// entrypoints/popup/App.tsx. This split is required because `files`
// injection can't take arguments, and `func` injection can't import modules.
declare global {
  interface Window {
    __applydeskFill?: (
      answers: StandardAnswers,
      attach: AttachInput,
      options?: FillOptions,
    ) => FillResultEntry[];
  }
}

export default defineUnlistedScript(() => {
  window.__applydeskFill = (answers, attach, options) => runFill(document, answers, attach, options);
});
