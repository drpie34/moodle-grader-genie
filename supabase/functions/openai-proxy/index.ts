import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Get the API key from environment
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

// Log if we have a server-side API key (for debugging)
console.log(`Server has API key: ${OPENAI_API_KEY ? 'Yes' : 'No'}`)

// CORS headers to allow requests from any origin (including localhost)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-openai-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  // Make sure the request is POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    // Get request body
    const requestData = await req.json()
    
    // Log the incoming request (for debugging)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))
    console.log('Request model:', requestData.model)
    
    // Check if the client is providing their own API key
    const clientApiKey = req.headers.get('x-openai-key')
    const apiKey = clientApiKey || OPENAI_API_KEY
    
    // Check if we have a valid API key
    if (!apiKey) {
      console.error('No API key available')
      return new Response(JSON.stringify({ 
        error: 'No API key available',
        hasServerKey: !!OPENAI_API_KEY,
        hasClientKey: !!clientApiKey
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    console.log('Using API key:', apiKey ? `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 4)}` : 'none')

    // Forward request to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestData),
    })
    
    // Log the OpenAI response status
    console.log('OpenAI API response status:', response.status)

    // Get response body as JSON
    const responseData = await response.json()
    
    // If there's an error, log it
    if (responseData.error) {
      console.error('OpenAI API error:', responseData.error)
    }

    // Return response with CORS headers
    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})