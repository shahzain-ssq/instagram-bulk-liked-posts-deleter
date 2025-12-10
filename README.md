# Instagram Auto-Unlike Liked Posts (100-per-batch)

This project provides a **Tampermonkey userscript** that automates unliking your Instagram **liked posts** from the **Your Activity → Interactions → Likes** page.

The script:

- Automatically enters **Select** mode  
- Selects up to **100 posts per batch** (Instagram’s UI limit)  
- Clicks the bulk **Unlike** button  
- Confirms the popup dialog  
- Waits for Instagram’s toast: **“You unliked X posts.”**  
- **Reloads the page** and repeats  
- Continues until no more liked posts remain  

> ⚠️ Use at your own risk. Automated interactions may violate Instagram’s terms or temporarily rate-limit your account.

---

## Features

✔ Fully automated workflow  
✔ Handles Instagram’s 100-selection limit  
✔ Works through all your liked posts batch-by-batch  
✔ Auto-detects the toast notification before proceeding  
✔ Auto-reloads page and resumes from where it left off  
✔ No manual clicking required after initial setup  

---

## Requirements

- A desktop browser:
  - **Chrome**, **Firefox**, **Edge**, or any Chromium-based browser
- **Tampermonkey** (recommended) or Violentmonkey userscript manager
- Instagram account logged in on the desktop site

---

## Installation

### 1. Install Tampermonkey
- Chrome Web Store / Firefox Add-ons / Edge Add-ons → search **Tampermonkey**
- Install and enable the extension

### 2. Create the userscript
1. Click the Tampermonkey icon  
2. Choose **Create a new script…**  
3. Delete the default content  
4. Paste the contents of `script.js` from this repository  
5. Save (`Ctrl+S`)

### 3. Ensure the `@match` URL fits your Instagram Likes page

The script is configured to run on:

https://www.instagram.com/your_activity/interactions/likes/*


If your URL structure differs, adjust accordingly.

---

## Usage

1. **Open Instagram** on a desktop browser  
2. Navigate to:  
   **Profile → Your activity → Interactions → Likes**
3. The script will:
   - Wait for the **Select** button  
   - Enter Select mode  
   - Begin selecting posts (up to 100 each cycle)  
   - Unlike → confirm → detect toast → reload  
4. The process repeats automatically  
5. When fewer than 100 posts remain, the script completes and stops

You can monitor progress using:

- The on-page behavior  
- The browser console logs (`F12` → Console), prefixed with:

[IG-Unliker]


---

## Configuration (Optional)

These options are located at the top of `script.js`:

- `CLICK_DELAY_MS` – Delay between selecting individual posts  
- `LOAD_DELAY_MS` – Delay after scrolling while waiting for new posts to load  
- `STABLE_LIMIT` – Number of “no new posts” loops before assuming end-of-list  
- `BATCH_LIMIT` – Max number of posts per batch (keep at **100**)  
- `AFTER_TOAST_EXTRA` – Extra wait time after Instagram displays the toast  

Increase delays if Instagram is slow to load posts.

---

## Troubleshooting

### Script does not run
- Make sure you are on the correct Likes page  
- Ensure Tampermonkey is enabled  
- Ensure the script is enabled in Tampermonkey  
- Confirm your UI language is English (script relies on matching the word **“Select”**)

### Script cannot find the Select button
- Refresh the page  
- Ensure UI is set to English  
- Make sure Instagram's layout matches the expected structure

### Script stops early
- Instagram may temporarily block actions due to rate limits  
- Increase delay timings to reduce pressure on the UI  
- Refresh and allow the script to resume

---

## Disclaimer

This project is **not affiliated with Instagram or Meta**.  
By using this script, you acknowledge that:

- You are automating interactions that Instagram does not officially support  
- Instagram may temporarily limit your actions  
- You are responsible for any consequences related to your account

---

## License

MIT License — free to use, modify, and distribute.
