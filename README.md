This repository:

* Contains officially released packages and serves as the source for CI/CD.
* Includes metadata files of official releases (like `package.json`) to support Dependabot.
  * The npm `pdfjs` module is limited and does not include the Viewer. To ensure Dependabot continues functioning, we include the metadata files.
* It is **not used** for development — only for deployment and security notifications.

# How to Update the PDF.js Library

## 1. Download the Latest Release

Get the latest release from the official Mozilla PDF.js repository:

- Go to [https://github.com/mozilla/pdf.js/releases](https://github.com/mozilla/pdf.js/releases)
- Download the archive: `http://pdfjs-{latest-version}-dist.zip`

## 2. Update the `dist` Folder

Create a branch from the latest master
Branch naming feature/{author}{JIRA_TICKET_ID}-pdfjs-{pdfjs_version} (e.g. feature/alex/EM360-4607-pdfjs-5.3.93)

Replace the contents of the `dist` folder with the latest library files:

- Repository: [Webinfinity/pdf.js – dist folder](https://github.com/Webinfinity/pdf.js/tree/master/dist)

## 3. Update `package.json` Files

Replace the following files in the Webinfinity repo with those from the corresponding Mozilla release:

- [`package.json`](https://github.com/Webinfinity/pdf.js/blob/master/package.json)
- [`package-lock.json`](https://github.com/Webinfinity/pdf.js/blob/master/package-lock.json)

https://github.com/mozilla/pdf.js/blob/{pdfjs_version}/package.json 
https://github.com/mozilla/pdf.js/blob/{pdfjs_version}/package-lock.json
(e.g https://github.com/mozilla/pdf.js/blob/v5.4.296/package.json and https://github.com/mozilla/pdf.js/blob/v5.4.296/package-lock.json)

Use the versions from the corresponding Mozilla PDF.js release.

## 4. Update `pdfjs.config`

Replace the `pdfjs.config` file with the version from the Mozilla release:

- [`pdfjs.config`](https://github.com/mozilla/pdf.js/blob/master/pdfjs.config)

## 5. Push and merge the new branch into master branch

To push use: git push -u origin {new_branch_name}
(e.g. git push -u origin feature/alex/EM360-5636-pdfjs-5.4.296)

Create a pull request into https://github.com/Webinfinity/pdf.js (master branch)
## 6. Create a DevOps Ticket

Submit an SRE ticket requesting deployment of the updated library to S3:

- For example: `https://cdn.dev.webinfinity.com/pdfjs/{latest-version}`  
- Request deployment to **all environments** (dev, staging, production, etc.)

## 7. Update `PdfViewer.cshtml` Body

Replace the `<body>` container in:

- [`PdfViewer.cshtml`](https://github.com/Webinfinity/ProductX/blob/staging-dev/App/ProductX.Web/Views/App/PdfViewer.cshtml)

with the `<body>` section from:

- [`viewer.html`](https://github.com/Webinfinity/pdf.js/blob/master/dist/web/viewer.html)

## 8. Update `pdfjsVersion` Reference

Update the `pdfjsVersion` value in:

- [`PdfViewer.cshtml`](https://github.com/Webinfinity/ProductX/blob/staging-dev/App/ProductX.Web/Views/App/PdfViewer.cshtml)

to reflect the new version.

## 8. Test Locally

- Run the app locally
- Thoroughly test the updated viewer
- Fix any new issues that arise
