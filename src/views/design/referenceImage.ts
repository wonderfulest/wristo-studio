const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024

/** Decode only a local file; never fetch image URLs supplied in a prompt. */
export async function prepareReferenceImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Choose a PNG or JPEG image.')
  if (file.size > MAX_FILE_BYTES) throw new Error('Choose an image smaller than 10 MB.')
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Unable to read this image. Please select it again.'))
    reader.onabort = () => reject(new Error('Image reading was interrupted.'))
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unable to read this image.'))
    reader.readAsDataURL(file)
  })
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('This image could not be decoded. Choose a valid PNG or JPEG.'))
    img.src = data
  })
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) {
    throw new Error('This image is too large to process. Choose a smaller image.')
  }
  // Re-encode every image to strip metadata and ensure the submitted format is genuine.
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image preparation is unavailable in this browser.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  let result = canvas.toDataURL(file.type, 0.9)
  const decodedBytes = (value: string) => Math.ceil((value.split(',')[1]?.length ?? 0) * 3 / 4)
  if (decodedBytes(result) > MAX_PAYLOAD_BYTES) result = canvas.toDataURL('image/jpeg', 0.85)
  if (!/^data:image\/(png|jpeg);base64,/.test(result) || decodedBytes(result) > MAX_PAYLOAD_BYTES) {
    throw new Error('This image is too large to upload. Choose a simpler or smaller image.')
  }
  return result
}
