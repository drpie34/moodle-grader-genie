import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Get the API key from environment
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

// Log if we have a server-side API key (for debugging)
console.log(`Server has API key: ${OPENAI_API_KEY ? 'Yes' : 'No'}`)

// CORS headers to allow requests from specific domains
const corsHeaders = {
  // Allow requests from both localhost and Netlify domains
  'Access-Control-Allow-Origin': '*', // Allowing all origins for now
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-openai-key, x-supabase-auth, x-use-server-key, origin, referer',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400' // Cache preflight requests for 24 hours
}

serve(async (req) => {
  // Log request origin for debugging
  const origin = req.headers.get('origin') || 'unknown';
  const referer = req.headers.get('referer') || 'unknown';
  console.log(`Request from origin: ${origin}, referer: ${referer}`);

  // Handle CORS preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    // Return the CORS headers immediately for preflight requests
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        // Explicitly set the origin from the request (if different from *)
        'Access-Control-Allow-Origin': origin !== 'unknown' ? origin : '*'
      }
    });
  }
  
  // Make sure the request is POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed',
      cors: true,
      origin: origin
    }), {
      status: 405,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin !== 'unknown' ? origin : '*'
      }
    })
  }

  try {
    // Get request body
    const requestData = await req.json()
    
    // Log the incoming request (for debugging)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))
    console.log('Request model:', requestData.model)
    
    // Detect if this is an image-based request
    const hasImageContent = requestData.messages?.some((msg: any) => 
      msg.content?.some?.((item: any) => item.type === 'image_url')
    );
    
    if (hasImageContent) {
      console.log('Image content detected in request');
    }
    
    // Check if the client is providing their own API key
    const clientApiKey = req.headers.get('x-openai-key')
    let apiKey = clientApiKey || OPENAI_API_KEY
    
    // Check for special headers that indicate we should use the server key
    const isDeploymentRequest = req.headers.get('x-supabase-auth') === 'deployment'
    const useServerKeyRequested = req.headers.get('x-use-server-key') === 'true'
    
    // Log detailed authentication information
    console.log('Client provided API key:', !!clientApiKey)
    console.log('Server has API key:', !!OPENAI_API_KEY)
    console.log('Authorization header present:', !!req.headers.get('authorization'))
    console.log('Is deployment environment request:', isDeploymentRequest)
    console.log('Client requested server key:', useServerKeyRequested)
    
    // ALWAYS use server key if client requests it or it's a deployment request
    if ((useServerKeyRequested || isDeploymentRequest) && OPENAI_API_KEY) {
      console.log('Using server API key as requested')
      apiKey = OPENAI_API_KEY
    }
    
    // For deployment environments, we'll allow access even without proper auth
    if (isDeploymentRequest) {
      console.log('Allowing access for deployment environment')
      // ALWAYS use server key for deployment requests
      if (OPENAI_API_KEY) {
        console.log('Using server API key for deployment environment')
        apiKey = OPENAI_API_KEY
      }
    }
    
    // CRITICAL: Always use server API key if available
    if (OPENAI_API_KEY && (!apiKey || apiKey.length < 20)) {
      console.log('Using server API key as fallback')
      apiKey = OPENAI_API_KEY
    }
    
    // Check if we have a valid API key
    if (!apiKey) {
      console.error('No API key available')
      return new Response(JSON.stringify({ 
        error: 'No OpenAI API key available. Please check server configuration.',
        hasServerKey: !!OPENAI_API_KEY,
        hasClientKey: !!clientApiKey,
        isDeployment: isDeploymentRequest,
        authHeader: !!req.headers.get('authorization'),
        cors: true,
        origin: origin,
        isImageRequest: hasImageContent
      }), {
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin !== 'unknown' ? origin : '*'
        }
      })
    }
    
    // Log which API key we're using without revealing full key
    console.log('Using API key:', apiKey ? `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 4)}` : 'none')
    console.log('Using server key:', apiKey === OPENAI_API_KEY)

    let responseData;
    let responseStatus = 200;
    
    try {
      // CRITICAL: Verify API key is valid before attempting to call OpenAI
      if (!apiKey || apiKey.length < 30) {
        throw new Error('Invalid API key format. Key appears to be malformed.');
      }
      
      console.log('Making request to OpenAI with valid API key');
      
      // Use appropriate OpenAI endpoint based on requestData
      let openaiEndpoint = 'https://api.openai.com/v1/chat/completions';
      
      console.log(`Using OpenAI endpoint: ${openaiEndpoint}`);
      
      // Forward request to OpenAI
      const response = await fetch(openaiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestData),
      });
      
      // Store status for later use
      responseStatus = response.status;
      
      // Log the OpenAI response status
      console.log('OpenAI API response status:', responseStatus);
      
      // For non-200 responses, provide more detailed error information
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error response:', errorText);
        
        // Return a proper error response with CORS headers
        return new Response(errorText, {
          status: responseStatus,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin !== 'unknown' ? origin : '*'
          }
        });
      }
      
      // Get response body as JSON
      responseData = await response.json();
      
      // If there's an error, log it
      if (responseData.error) {
        console.error('OpenAI API error:', responseData.error);
      } else if (hasImageContent) {
        console.log('Successfully processed image-based request');
      }
    } catch (openaiError) {
      console.error('Error calling OpenAI:', openaiError);
      
      return new Response(JSON.stringify({
        error: 'Error calling OpenAI API',
        message: openaiError.message,
        stack: openaiError.stack,
        timestamp: new Date().toISOString(),
        isImageRequest: hasImageContent
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return response with CORS headers, using the actual origin
    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      // Use the specific origin from the request if available
      'Access-Control-Allow-Origin': origin !== 'unknown' ? origin : '*'
    };
    
    console.log('Sending response with headers:', Object.keys(responseHeaders));
    
    return new Response(JSON.stringify(responseData), {
      status: responseStatus,
      headers: responseHeaders
    })
  } catch (error) {
    console.error('Error:', error)
    const errorHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      // Use the specific origin from the request if available
      'Access-Control-Allow-Origin': origin !== 'unknown' ? origin : '*'
    };
    
    return new Response(JSON.stringify({ 
      error: error.message,
      cors: true,
      origin: origin
    }), {
      status: 500,
      headers: errorHeaders
    })
  }
})