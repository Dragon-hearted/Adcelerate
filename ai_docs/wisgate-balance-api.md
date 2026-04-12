# Query Balance

> Retrieve the current balance and quota information for the authenticated user

## Overview

This endpoint allows you to check your available balance, package balance, cash balance, and token balance.

**Note:** "The request parameters and response format are automatically generated from the OpenAPI specification. All parameters, their types, descriptions, defaults, and examples are pulled directly from `openapi.json`."

## OpenAPI

```yaml
GET /v1/users/me/balance
openapi: 3.1.0
info:
  title: WisGate OpenAPI Spec
  description: >-
    WisGate is an AI inference API relay service that provides unified,
    OpenAI-style REST access to multiple AI models through a single, consistent
    interface
  version: 1.0.0
servers:
  - url: https://api.wisgate.ai
    description: Production server
security:
  - bearerAuth: []
paths:
  /v1/users/me/balance:
    get:
      tags:
        - User
      summary: Check balance
      description: >-
        Retrieve the current balance and quota information for the authenticated
        user.
      operationId: getUserBalance
      responses:
        '200':
          description: Successful response containing balance information
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BalanceResponse'
        '401':
          description: Unauthorized - Invalid or missing API key
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
components:
  schemas:
    BalanceResponse:
      type: object
      properties:
        available_balance:
          type: number
          description: Total available balance (cash_balance + package_balance)
        package_balance:
          type: number
          description: Balance from purchased packages
        cash_balance:
          type: number
          description: Regular cash quota balance
        token_balance:
          type: number
          description: Available balance for the specific token used (if applicable)
        is_token_unlimited_quota:
          type: boolean
          description: Whether the token has unlimited quota
      required:
        - available_balance
        - package_balance
        - cash_balance
        - token_balance
        - is_token_unlimited_quota
    Error:
      type: object
      properties:
        error:
          $ref: '#/components/schemas/ErrorDetail'
      required:
        - error
    ErrorDetail:
      type: object
      properties:
        message:
          type: string
          description: A human-readable error message
        type:
          type: string
          description: The type of error
        param:
          type: string
          description: The parameter that caused the error, if applicable
        code:
          type: string
          description: The error code
      required:
        - message
        - type
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: >-
        Bearer token authentication. Include your API key in the Authorization
        header as 'Bearer YOUR_API_KEY'
```
