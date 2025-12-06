# Netlify Deployment Guide for Aether Frontend

This guide provides step-by-step instructions for deploying the Aether frontend application to Netlify and configuring it to communicate with the backend API.

## Prerequisites

Before you begin, ensure you have the following:

- A GitHub, GitLab, or Bitbucket account with the `aether-frontend` repository.
- A Netlify account.

## Step 1: Create a New Site from Git

1.  **Log in to Netlify**: Open your Netlify dashboard.
2.  **Add New Site**: Click the "Add new site" button and select "Import an existing project" from the dropdown menu.
3.  **Connect to Your Git Provider**: Choose the Git provider where your repository is hosted and authorize Netlify to access your repositories.
4.  **Select Your Repository**: Find and select the `aether-frontend` repository.

## Step 2: Configure Build Settings

Netlify will automatically detect that you're deploying a Next.js application and suggest the correct build settings. The settings should be as follows:

-   **Build command**: `npm run build`
-   **Publish directory**: `.next`

Confirm these settings and proceed to the next step.

## Step 3: Set Environment Variables

This is a critical step to ensure the frontend can communicate with your backend API.

1.  **Go to Site Settings**: After creating the site, navigate to your site's dashboard and click on "Site settings."
2.  **Environment Variables**: In the side menu, go to "Build & deploy" > "Environment."
3.  **Add New Variables**: Click "Edit variables" and add the following variables (ensure they are applied to **All scopes**):
    -   **Key**: `NEXT_PUBLIC_API_URL`
    -   **Value**: `https://api.cogito.cv`
    -   **Key**: `NEXT_PUBLIC_WS_URL`
    -   **Value**: `wss://api.cogito.cv`

    **Optional Variables:**
    -   **Key**: `NEXT_PUBLIC_ENABLE_LOGGING`
        -   **Value**: `true` or `false` (Default: `true`)
    -   **Key**: `NEXT_PUBLIC_LOG_LEVEL`
        -   **Value**: `debug`, `info`, `warn`, or `error` (Default: `info` in production)
    -   **Key**: `NEXT_PUBLIC_ACCESS_CODE_HASH`
        -   **Value**: (SHA-256 hash of the access code if you want to restrict access)

4.  **Save**: Click "Save" to add the environment variables.

## Step 4: Deploy Your Site

1.  **Go to the Deploys Tab**: Navigate to the "Deploys" tab in your site's dashboard.
2.  **Trigger Deploy**: Click the "Trigger deploy" button and select "Deploy site" from the dropdown.
3.  **Monitor the Deploy**: Netlify will start building and deploying your site. You can monitor the progress in the deploy logs.

## Step 5: Verify the Deployment

1.  **Open Your Site**: Once the deployment is complete, Netlify will provide you with a URL for your live site. Click on it to open it in your browser.
2.  **Check for Errors**: Open the browser's developer console and check for any errors.
3.  **Test API Communication**: The application should be communicating with the backend at `https://api.cogito.cv`. You can verify this by checking the network requests in the developer console.

Congratulations! Your Aether frontend is now deployed on Netlify.
