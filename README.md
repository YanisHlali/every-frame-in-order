# 🎞️ Frame – Every Frame In Order

> 🧪 Live demo: [@TwinPeaksShot](https://x.com/TwinPeaksShot)

This project automates the extraction, posting, and tracking of every single frame from a video episode, frame by frame, on Twitter. It's designed to work with **any series** or video content, by simply adapting the metadata and database contents. The current repository is set up for a specific show, but the system itself is generic.

It combines Puppeteer, Firebase, Google Drive, and the Twitter API (via cookies) to orchestrate the entire process.

## 🛠️ Tech stack

* **Next.js 15**
* **TypeScript**
* **Tailwind CSS**
* **Firebase Admin SDK**
* **Google Drive API**
* **Twitter via Puppeteer + cookies**
* **Vercel Cron**
* **Vercel Analytics**

---

## ⚙️ Features

* Extracts all frames from a video episode.
* Uploads to Google Drive, organized by episode.
* Stores metadata (frames, timestamps, links) in Firebase Firestore.
* Automatically and periodically posts frames to Twitter via a custom API.
* Integrates with Vercel (cron scheduler).
* Tracks website analytics with Vercel Analytics.

---

## 🚀 Installation & Usage Steps

### 1. Obtain the episode

Download the video file of the episode you want to process.

### 2. Extract frames

Use the `extract_frames.sh` script to extract every image from the episode in `.jpg` or `.png` format.

```bash
bash extract_frames.sh path/to/episode.mp4
```

> 💡 Each image should be named in a consistent format (e.g. `frame_000001.jpg`).

### 3. Upload to Google Drive

Images must be uploaded to a dedicated Google Drive folder for the project. The script uses the Google Drive API to handle uploads and fetch public URLs.

#### 🗃️ Frame organization schema on Drive

```
Drive root
└── Twin Peaks
    └── Twin_Peaks_S01E01                      # Main folder for the episode
        ├── Twin_Peaks_S01_E01_1               # Subfolder with 100 frames
        │   ├── frame_0001.png
        │   └── ...
        └── Twin_Peaks_S01_E01_2
            ├── frame_0101.png
            └── ...
```

> 📂 Each subfolder matches a `folderId` referenced in Firestore.

### 4. Configure Firebase

Create a Firestore database in the [Firebase Console](https://console.firebase.google.com/), then:

* Create a `series` collection to hold your data.
* Provide a **Service Account JSON** encoded in base64.

#### 📁 Firestore database schema

```
series (collection)
├── [series-id] (document)
    ├── title: string                     # Show title
    ├── metadata: { totalSeasons: number }
    ├── current: { seasonId: string, episodeId: string }
    └── seasons: {
         [season-id]: {
           episodes: {
             [episode-id]: {
               episodeNumber: number,
               folderIds: string[],     # Drive folders with the frames
               totalFiles: number,
               indexFolder: number,
               lastIndex: number
             }
           }
         }
       }
```

> 🔹 The `current` field tracks the currently publishing episode.

### 5. Fill in the `.env` file

Create a `.env` file at the root of the project with the following variables:

```env
CRON_SECRET=...
GOOGLE_APPLICATION_CREDENTIALS_BASE64=...
FIREBASE_SERVICE_ACCOUNT_BASE64=...
COOKIES_BASE64=...
SERIES_ID=your-series-id
```

* `CRON_SECRET`: Shared secret to secure cron requests.
* `GOOGLE_APPLICATION_CREDENTIALS_BASE64`: Credentials for Google Drive API access.
* `FIREBASE_SERVICE_ACCOUNT_BASE64`: Encoded Firebase service account.
* `COOKIES_BASE64`: Exported Twitter cookies, base64-encoded.
* `SERIES_ID`: The `series` document ID in Firestore.

> ℹ️ You can use:

```bash
npm run cookies              # Generates cookies.b64 from cookies.json
npm run put-cookies-in-env   # Automatically updates COOKIES_BASE64 in .env
```

### 6. Deployment

Deploy the project on Vercel:

```bash
vercel deploy
```

The `vercel.json` file sets up a cron job to post an image every 10 minutes:

```json
"crons": [
  {
    "path": "/api/tweet",
    "schedule": "*/10 * * * *"
  }
]
```

---

## 🗓️ Useful scripts

```bash
npm run dev                   # Starts Next.js locally
npm run build                 # Production build
npm run clone-database        # Clones a Firestore document for testing
npm run cookies               # Converts cookies.json to base64
npm run put-cookies-in-env    # Auto-injects into .env
```

---

## 📁 Project structure

```
src/
├── config/           # Firebase & Google configs
├── lib/              # Twitter clients
├── pages/api/        # /api/tweet route
├── scheduler/        # Vercel cron entry
├── services/         # Business logic (drive, firestore, tweets)
├── utils/            # Manual scripts (export, cookies)
```