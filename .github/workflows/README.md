# CI/CD Workflows for Twitter API Proxy

This directory contains GitHub Actions workflows for continuous integration and deployment to Deno
Deploy.

## Workflows

### CI/CD (`ci.yml`)

This workflow runs on:

- Push to the `main` branch
- Pull requests to the `main` branch

It performs the following steps:

1. Runs tests, linting, and format checking
2. If the event is a push to `main`, deploys to the staging environment on Deno Deploy

### Production Deployment (`deploy-production.yml`)

This workflow is manually triggered and deploys to the production environment on Deno Deploy.

To deploy to production:

1. Go to the "Actions" tab in the GitHub repository
2. Select "Deploy to Production" from the workflows list
3. Click "Run workflow"
4. Type "yes" in the confirmation field
5. Click "Run workflow" to start the deployment

## Required Secrets

The following secrets need to be configured in your GitHub repository:

- `DENO_DEPLOY_TOKEN`: A token for authenticating with Deno Deploy

## Environment Variables

The workflows set the following environment variables:

- `ENVIRONMENT`: Set to either "staging" or "production" depending on the deployment target

## Project Configuration

The deployment uses the configuration from:

- `deno.json`: For import maps and other Deno settings
- `main.ts`: As the entrypoint for the application

## Customization

You may need to customize the following values in the workflow files:

- `project` in the Deploy step: Replace with your actual Deno Deploy project names
- Add additional environment variables as needed for your application
