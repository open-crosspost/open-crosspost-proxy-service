# Social Media API Proxy Project Brief

## Project Overview

A secure proxy for social media APIs that allows authorized frontends to perform actions on behalf
of users who have granted permission. The system securely stores OAuth tokens, handles refreshes,
enforces rate limits, and supports all major API functions including media uploads. Initially
focused on Twitter, the architecture is designed to be platform-agnostic to support additional
social media platforms in the future.

## Core Requirements

1. **Secure Authentication**
   - Implement OAuth 2.0 flow with social media platforms
   - Securely store and manage user tokens
   - Support token refresh and revocation
   - Authenticate client applications with API keys
   - Support NEAR wallet signature-based authentication

2. **Comprehensive API Support**
   - Support all major social media actions (post, repost, like, reply, etc.)
   - Handle media uploads for posts
   - Support post deletion and management
   - Enable interaction with social media content

3. **Security & Performance**
   - Encrypt sensitive data at rest and in transit
   - Implement proper rate limiting (both platform API and client-side)
   - Enforce strict CORS policies for client applications
   - Optimize for performance

4. **Reliability & Monitoring**
   - Implement circuit breaking for platform APIs
   - Provide graceful error handling
   - Log all operations for monitoring
   - Set up health checks and alerts

## Technical Stack

- **Deno**: Runtime, package manager, and development environment
- **Deno Deploy**: Edge runtime for JavaScript/TypeScript applications
- **Deno KV**: Built-in key-value storage for tokens and configuration
- **TypeScript**: Primary development language
- **Hono**: HTTP framework for routing
- **twitter-api-v2**: Twitter API communication
- **jose**: JWT handling
- **zod**: Type validation and schema definition

## Project Goals

1. Create a secure, reliable proxy for social media API operations
2. Simplify social media integration for authorized client applications
3. Ensure proper handling of user authentication and permissions
4. Maintain high performance and availability
5. Implement comprehensive security measures
6. Support core social media API functions for posting and interaction
7. Design a platform-agnostic architecture that can be extended to multiple social media platforms

## Success Criteria

1. Successfully authenticate users with social media platforms
2. Securely store and manage user tokens
3. Process all supported API actions
4. Handle media uploads properly
5. Enforce appropriate rate limits
6. Restrict access to authorized applications only
7. Maintain high availability and performance
8. Properly log and monitor all operations
9. Support multiple social media platforms through a unified interface
