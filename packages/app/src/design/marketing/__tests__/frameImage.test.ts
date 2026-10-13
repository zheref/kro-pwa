import { describe, expect, it } from 'vitest'
import { frameImageProps } from '../frameImage'

describe('frameImageProps', () => {
  it('reserves the box with explicit dimensions and decodes off the main thread', () => {
    const props = frameImageProps({
      src: '/a.png',
      width: 300,
      height: 600,
    })
    expect(props).toMatchObject({ width: 300, height: 600, decoding: 'async' })
  })

  it('lazy-loads by default and leaves the alt to the frame that knows it', () => {
    const props = frameImageProps({ src: '/a.png', width: 1, height: 1 })
    expect(props.loading).toBe('lazy')
    expect('alt' in props).toBe(false)
    expect(props.fetchPriority).toBeUndefined()
  })

  it('loads eagerly at high priority when the image is above the fold', () => {
    const props = frameImageProps({
      src: '/a.png',
      width: 1,
      height: 1,
      priority: true,
    })
    expect(props.loading).toBe('eager')
    expect(props.fetchPriority).toBe('high')
  })
})
