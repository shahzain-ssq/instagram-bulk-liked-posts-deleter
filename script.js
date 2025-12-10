// ==UserScript==
// @name         Instagram auto-unlike liked posts (100-per-batch)
// @namespace    ig-bulk-unlike
// @version      1.0
// @description  Auto select + unlike liked posts in batches of 100, auto-reload between batches.
// @match        https://www.instagram.com/your_activity/interactions/likes/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const CLICK_DELAY_MS    = 200;   // delay between selecting posts
  const LOAD_DELAY_MS     = 2000;  // delay after scroll to let new rows load
  const STABLE_LIMIT      = 3;     // "no new work" loops before end-of-list in this load
  const BATCH_LIMIT       = 100;   // Instagram max selection
  const AFTER_TOAST_EXTRA = 2000;  // extra delay after toast appears

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function log(...args) {
    console.log('[IG-Unliker]', ...args);
  }

  function findSelectButton() {
    const spans = Array.from(document.querySelectorAll('span'));
    for (const span of spans) {
      if (span.textContent.trim() === 'Select') {
        const parent = span.closest('div[style*="cursor: pointer"]') || span.parentElement;
        return parent || span;
      }
    }
    return null;
  }

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

  async function waitForUnlikeToast(timeoutMs = 60) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const candidates = Array.from(
        document.querySelectorAll('p._abmp, div[role="alert"]')
      );
      const toast = candidates.find((el) =>
        el.textContent.trim().toLowerCase().startsWith('you unliked')
      );
      if (toast) {
        log('Toast detected:', toast.textContent.trim());
        return true;
      }
      await sleep(50);
    }
    log('Toast not detected in time; continuing anyway.');
    return false;
  }

  // Select up to BATCH_LIMIT new unchecked posts
  async function selectBatch() {
    let totalNewlySelected = 0;
    let lastTotalBoxes = 0;
    let stableRounds = 0;

    log('Starting new selection batch…');

    while (true) {
      const boxes = Array.from(
        document.querySelectorAll('[data-testid="bulk_action_checkbox"]')
      );

      log(`Boxes: ${boxes.length}, selected this batch: ${totalNewlySelected}`);

      let selectedThisRound = 0;

      for (const box of boxes) {
        if (totalNewlySelected >= BATCH_LIMIT) {
          log(`Reached batch limit of ${BATCH_LIMIT}.`);
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
        log(`Selected post ${totalNewlySelected} in this batch`);
        await sleep(CLICK_DELAY_MS);
      }

      if (totalNewlySelected >= BATCH_LIMIT) {
        return { selectedInBatch: totalNewlySelected, endOfList: false };
      }

      if (boxes.length === lastTotalBoxes && selectedThisRound === 0) {
        stableRounds++;
        log(`No new posts this loop. Stable rounds: ${stableRounds}/${STABLE_LIMIT}`);
      } else {
        stableRounds = 0;
      }

      lastTotalBoxes = boxes.length;

      if (stableRounds >= STABLE_LIMIT) {
        log(
          `No new unchecked posts after ${STABLE_LIMIT} checks. Selected ${totalNewlySelected} posts in this batch.`
        );
        return { selectedInBatch: totalNewlySelected, endOfList: true };
      }

      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(LOAD_DELAY_MS);
    }
  }

  async function runOnceOnThisPage() {
    log('Waiting for Select button…');

    // Wait until Instagram renders the Select button
    let tries = 0;
    while (tries < 30) {
      const selectBtn = findSelectButton();
      if (selectBtn) {
        selectBtn.click();
        log('Clicked "Select", starting main loop.');
        break;
      }
      tries++;
      await sleep(1000);
    }

    const { selectedInBatch, endOfList } = await selectBatch();

    if (selectedInBatch === 0) {
      log('No posts selected on this page. Stopping.');
      return;
    }

    log(`Batch selected: ${selectedInBatch} posts.`);

    const bulkUnlike = findBulkUnlikeButton();
    if (!bulkUnlike) {
      log('Bulk "Unlike" button not found; stopping.');
      return;
    }

    bulkUnlike.scrollIntoView({ block: 'center' });
    bulkUnlike.click();
    log('Clicked bulk "Unlike", waiting for popup…');

    await sleep(1500);

    const popupUnlike = findPopupUnlikeButton();
    if (popupUnlike) {
      popupUnlike.click();
      log('Clicked popup "Unlike", waiting for toast…');
    } else {
      log('Popup "Unlike" not found (maybe skipped).');
    }

    await waitForUnlikeToast();
    await sleep(AFTER_TOAST_EXTRA);

    log(`Finished unliking this batch of ${selectedInBatch} posts.`);

    // If we unliked 100 (or more, theoretically), assume IG limit
    // → hard reload and let the userscript run again on the next page load.
    if (selectedInBatch >= BATCH_LIMIT && !endOfList) {
      log('Batch was full (100). Reloading page for next batch…');
    } else {
      log('Last batch was < 100 or end of list detected. Stopping.');
    }
    location.reload();
  }

  // Kick off when DOM is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    runOnceOnThisPage();
  } else {
    window.addEventListener('DOMContentLoaded', runOnceOnThisPage);
  }
})();
