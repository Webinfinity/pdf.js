This repository:

* Contains officially released packages and serves as the source for CI/CD.
* Includes metadata files of official releases (like `package.json`) to support Dependabot.
  * The npm `pdfjs` module is limited and does not include the Viewer. To ensure Dependabot continues functioning, we include the metadata files.
* It is **not used** for development — only for deployment and security notifications.

# How to Update the PDF.js Library

## Automated Update (Recommended)

Use the automated script to update PDF.js. This script handles all steps automatically:

```bash
# On Windows, Mac, or Linux
node scripts/update-pdfjs-version.js -n <name> -t <ticket_id> -v <version>

# Example:
node scripts/update-pdfjs-version.js -n andrei -t em360-6878 -v 4.0.0
```

**Parameters:**
- `-n, --name`: Your name (used in branch name)
- `-t, --ticket`: Ticket ID in format `em360-{numeric-id}`
- `-v, --version`: PDF.js version (e.g., `4.0.0`)

**What the script does:**
1. Pulls latest changes from master
2. Creates a feature branch: `feature/{name}/{ticket_id}-pdfjs-{version}`
3. Downloads the PDF.js release from GitHub
4. Updates the `dist` folder
5. Updates `package.json`, `package-lock.json`, and `pdfjs.config`
6. Creates a commit and pushes to origin

## Manual Update

If you prefer to update manually, follow these steps:

### 1. Download the Latest Release

Get the latest release from the official Mozilla PDF.js repository:

- Go to [https://github.com/mozilla/pdf.js/releases](https://github.com/mozilla/pdf.js/releases)
- Download the archive: `http://pdfjs-{latest-version}-dist.zip`

### 2. Create a Feature Branch

Create a branch from the latest master with the naming format:
```
feature/{author}/{JIRA_TICKET_ID}-pdfjs-{pdfjs_version}
```

Example: `feature/alex/EM360-4607-pdfjs-5.3.93`

### 3. Update the `dist` Folder

Replace the contents of the `dist` folder with the latest library files:

- Repository: [Webinfinity/pdf.js – dist folder](https://github.com/Webinfinity/pdf.js/tree/master/dist)

### 4. Update Metadata Files

Replace the following files in the Webinfinity repo with those from the corresponding Mozilla release:

- [`package.json`](https://github.com/Webinfinity/pdf.js/blob/master/package.json)
- [`package-lock.json`](https://github.com/Webinfinity/pdf.js/blob/master/package-lock.json)
- [`pdfjs.config`](https://github.com/Webinfinity/pdf.js/blob/master/pdfjs.config)

Mozilla source URLs:
- `https://github.com/mozilla/pdf.js/blob/v{version}/package.json`
- `https://github.com/mozilla/pdf.js/blob/v{version}/package-lock.json`
- `https://github.com/mozilla/pdf.js/blob/v{version}/pdfjs.config`

### 5. Commit and Push

```bash
git add --all
git commit -m "em360-{TICKET_ID} pdf.js upgraded to v{version}"
git push -u origin feature/{author}/{TICKET_ID}-pdfjs-{version}
```

Example:
```bash
git push -u origin feature/alex/EM360-5636-pdfjs-5.4.296
```

### 6. Create a Pull Request

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

## 9. Deploy to S3 Using AWS CLI

Use the AWS CLI to upload the dist folder to your environment. Path structure: `/pdfjs/{version}/{content of the dist folder}`

Replace `{YOUR_PROFILE_NAME}` with your AWS profile name and `{version}` with the PDF.js version (e.g., `6.1.200`).

**Note:** Commands may vary depending on your AWS login setup and profile configuration.

### Copy Commands

Use for **new version deployments** or when you want to preserve existing S3 files:

```bash
aws s3 cp dist s3://wi-content-dev/pdfjs/{version}/ --recursive --profile YOUR_PROFILE_NAME
aws s3 cp dist s3://wi-content-f1/pdfjs/{version}/ --recursive --profile YOUR_PROFILE_NAME
aws s3 cp dist s3://wi-content-qa/pdfjs/{version}/ --recursive --profile YOUR_PROFILE_NAME
aws s3 cp dist s3://wi-content-prelive/pdfjs/{version}/ --recursive --profile YOUR_PROFILE_NAME
aws s3 cp dist s3://wi-content-sandbox/pdfjs/{version}/ --recursive --profile YOUR_PROFILE_NAME
```

### Sync Commands

Use to **update an existing version** and remove deleted/obsolete files:

```bash
aws s3 sync dist s3://wi-content-dev/pdfjs/{version}/ --delete --profile YOUR_PROFILE_NAME
aws s3 sync dist s3://wi-content-f1/pdfjs/{version}/ --delete --profile YOUR_PROFILE_NAME
aws s3 sync dist s3://wi-content-qa/pdfjs/{version}/ --delete --profile YOUR_PROFILE_NAME
aws s3 sync dist s3://wi-content-prelive/pdfjs/{version}/ --delete --profile YOUR_PROFILE_NAME
aws s3 sync dist s3://wi-content-sandbox/pdfjs/{version}/ --delete --profile YOUR_PROFILE_NAME
```

### Utility Commands

```bash
aws s3 ls s3://wi-content-dev/pdfjs/ --profile YOUR_PROFILE_NAME
aws s3 ls s3://wi-content-dev/pdfjs/{version}/ --recursive --profile YOUR_PROFILE_NAME
```
