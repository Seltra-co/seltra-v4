//seltra-web/backend/src/ai/agents/image-generator.ts
import { fal } from '@fal-ai/client'
//Image Generator Agent (using Fal.ai's image generation API for free fallbacks when Pollinations.ai hits rate limits)

fal.config({
  credentials: process.env.FAL_KEY,
})

export async function generateProductImage(
  productName: string,
  productDescription: string,
  businessType: string,
): Promise<string | null> {
  try {
    const prompt = `Professional product photography of ${productName}. ${productDescription.slice(0, 100)}. Clean white or gradient background, studio lighting, commercial quality, ${businessType} product, high resolution`

    const result = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt,
        image_size: 'square_hd',
        num_inference_steps: 4,
        num_images: 1,
      },
    })

    const imageUrl = (result.data as { images: Array<{ url: string }> }).images?.[0]?.url
    return imageUrl || null
  } catch (err) {
    console.error(`Image generation failed for ${productName}:`, err)
    return null
  }
}