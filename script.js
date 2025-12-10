(async () => {
  const CLICK_DELAY_MS    = 200;   // delay between selecting posts
  const LOAD_DELAY_MS     = 2000;  // delay after scroll to let new rows load
  const STABLE_LIMIT      = 3;     // "no new work" loops before end-of-list
  const BATCH_LIMIT       = 100;   // Instagram selection cap per batch
  const EXTRA_AFTER_TOAST = 2000;  // extra wait after seeing "You unliked ..." toast
  const REENTER_SELECT_MS = 1500;  // wait after clicking Select again

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function findBulkUnlikeButton() {
    const candidates = Array.from(
      document.querySelectorAll('div[role="button"][aria-label="Unlike"]')
    );
    for (const el of candidates) {
      const style = getComputedStyle(el);
      if (style.pointerEvents !== 'none' && style.cursor === 'pointer') {
        return el;
      }
    }
    return null;
  }

  function findPopupUnlikeButton() {
    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
    for (const dialog of dialogs) {
      const buttons = Array.from(dialog.querySelectorAll('button'));
      for (const btn of buttons) {
        const text = btn.innerText.trim().toLowerCase();
        if (text === 'unlike') return btn;
      }
    }
    return null;
  }

  // Find the "Select" control (blue text "Select")
  function findSelectButton() {
    const spans = Array.from(document.querySelectorAll('span'));
    for (const span of spans) {
      if (span.textContent.trim() === 'Select') {
        // Prefer the flexbox div that has cursor: pointer
        const parent = span.closest('div[style*="cursor: pointer"]') || span.parentElement;
        return parent || span;
      }
    }
    return null;
  }

  // Wait until an IG toast that starts with "You unliked" appears
  async function waitForUnlikeToast(timeoutMs = 60000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const candidates = Array.from(
        document.querySelectorAll('p._abmp, div[role="alert"]')
      );
      const toast = candidates.find(el =>
        el.textContent.trim().toLowerCase().startsWith('you unliked')
      );
      if (toast) {
        console.log('🔔 Detected toast:', toast.textContent.trim());
        return true;
      }
      await sleep(500);
    }
    console.log('⏱️ Toast not detected within timeout, continuing anyway.');
    return false;
  }

  // Select up to BATCH_LIMIT *new* unchecked posts.
  // Returns { selectedInBatch, endOfList }.
  async function selectBatch() {
    let totalNewlySelected = 0;
    let lastTotalBoxes = 0;
    let stableRounds = 0;

    console.log('▶ Starting new selection batch…');

    while (true) {
      const boxes = Array.from(
        document.querySelectorAll('[data-testid="bulk_action_checkbox"]')
      );

      console.log(
        `🧾 Boxes in DOM: ${boxes.length}, selected in this batch: ${totalNewlySelected}`
      );

      let selectedThisRound = 0;

      for (const box of boxes) {
        if (totalNewlySelected >= BATCH_LIMIT) {
          console.log(`⛔ Reached batch limit of ${BATCH_LIMIT}.`);
          break;
        }

        const outlineIcon = box.querySelector(
          'div[style*="circle__outline__24-4x.png"]'
        );
        if (!outlineIcon) continue; // already checked

        let container = box;
        while (
          container &&
          !container.querySelector(
            'div[role="button"][aria-label="Image of Post"], div[role="button"][aria-label="Image with button"]'
          )
        ) {
          container = container.parentElement;
        }
        if (!container) continue;

        const tile = container.querySelector(
          'div[role="button"][aria-label="Image of Post"], div[role="button"][aria-label="Image with button"]'
        );
        if (!tile) continue;

        tile.scrollIntoView({ block: 'center' });
        tile.click();

        totalNewlySelected++;
        selectedThisRound++;
        console.log(`✅ Newly selected post ${totalNewlySelected} in this batch`);
        await sleep(CLICK_DELAY_MS);
      }

      if (totalNewlySelected >= BATCH_LIMIT) {
        return { selectedInBatch: totalNewlySelected, endOfList: false };
      }

      if (boxes.length === lastTotalBoxes && selectedThisRound === 0) {
        stableRounds++;
        console.log(
          `⚖️ No new selectable posts this loop. Stable rounds: ${stableRounds}/${STABLE_LIMIT}`
        );
      } else {
        stableRounds = 0;
      }

      lastTotalBoxes = boxes.length;

      if (stableRounds >= STABLE_LIMIT) {
        console.log(
          `🏁 No new unchecked posts after ${STABLE_LIMIT} checks. Selected ${totalNewlySelected} posts in this batch.`
        );
        return { selectedInBatch: totalNewlySelected, endOfList: true };
      }

      console.log('↘ Scrolling to bottom for more posts in this batch…');
      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(LOAD_DELAY_MS);
    }
  }

  let totalUnliked = 0;

  while (true) {
    const { selectedInBatch, endOfList } = await selectBatch();

    if (selectedInBatch === 0) {
      console.log('✨ No more posts to select in this batch.');
      break;
    }

    console.log(`🟦 Batch selected: ${selectedInBatch} posts.`);

    const bulkUnlike = findBulkUnlikeButton();
    if (!bulkUnlike) {
      console.log('❌ Could not find bulk "Unlike" button. Stopping.');
      break;
    }

    bulkUnlike.scrollIntoView({ block: 'center' });
    bulkUnlike.click();
    console.log('💔 Clicked bulk "Unlike"… waiting for popup.');

    await sleep(1500); // let popup appear

    const popupUnlike = findPopupUnlikeButton();
    if (popupUnlike) {
      popupUnlike.click();
      console.log('✅ Clicked popup "Unlike". Waiting for toast…');
    } else {
      console.log('⚠️ Popup "Unlike" button not found (maybe IG skipped the popup?).');
    }

    await waitForUnlikeToast();
    await sleep(EXTRA_AFTER_TOAST);

    totalUnliked += selectedInBatch;
    console.log(`📉 Total posts unliked so far: ${totalUnliked}`);

    // If we know we’re at the end AND this batch was < 100, we’re really done
    if (endOfList && selectedInBatch < BATCH_LIMIT) {
      console.log('🏁 Reached end of liked posts list.');
      break;
    }

    // Re-enter Select mode for the next batch
    const selectBtn = findSelectButton();
    if (selectBtn) {
      selectBtn.scrollIntoView({ block: 'center' });
      selectBtn.click();
      console.log('🟦 Re-entered "Select" mode for next batch.');
      await sleep(REENTER_SELECT_MS);
    } else {
      console.log('⚠️ Could not find "Select" button to start next batch. Stopping.');
      break;
    }

    console.log('🔁 Starting next batch…');
  }

  console.log(`✅ DONE. Total posts unliked: ${totalUnliked}`);
})();
