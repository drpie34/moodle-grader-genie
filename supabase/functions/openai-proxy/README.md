# OpenAI Proxy Supabase Edge Function

This Edge Function acts as a secure proxy for OpenAI API calls, allowing the application to make OpenAI requests without exposing the API key to the client.

## Setup Instructions

### 1. Install Supabase CLI

If you haven't already, install the Supabase CLI:

```bash
# Using npm
npm install -g supabase

# Or using bun
bun install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Set up your OpenAI API key as a secret

Run the following command to set your OpenAI API key as a secret:

```bash
supabase secrets set OPENAI_API_KEY=sk-your-api-key-here
```

Replace `sk-your-api-key-here` with your actual OpenAI API key.

### 4. Deploy the function

From your project root directory:

```bash
supabase functions deploy openai-proxy
```

### 5. Verify the function is working

You can test the function using curl:

```bash
curl -X POST https://owaqnztggyxahjhbcylj.supabase.co/functions/v1/openai-proxy \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hello"}]}'
```

## Security Considerations

- The OpenAI API key is stored as a secret and never exposed to clients
- Requests are authenticated using Supabase's built-in security
- The function only accepts POST requests, matching OpenAI's API design
- Error handling prevents leaking sensitive information

## Usage in the Application

The application uses this function by:
1. Making requests to the Supabase Function URL instead of directly to OpenAI
2. Not requiring users to provide their own API keys
3. Maintaining the same request/response format as the OpenAI API for compatibility