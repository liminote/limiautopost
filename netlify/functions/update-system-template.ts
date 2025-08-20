const { Handler } = require('@netlify/functions')
const { put } = require('@netlify/blobs')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { cardId, platform, templateTitle, templateFeatures, prompt, updatedAt } = JSON.parse(event.body || '{}')
    
    if (!cardId || !platform || !templateTitle || !templateFeatures || !prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    // 儲存到 Netlify Blobs
    await put('system-templates', cardId, JSON.stringify({
      platform,
      templateTitle,
      templateFeatures,
      prompt,
      updatedAt
    }), {
      metadata: { 
        contentType: 'application/json',
        lastModified: new Date().toISOString()
      }
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'System template updated successfully' 
      })
    }
  } catch (error) {
    console.error('Error updating system template:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
