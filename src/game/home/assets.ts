import { art } from './art';
export type HomeAsset = { svg: string; url?: never } | { url: string; svg?: never };
/** Replace a part with {url:'/art/...png'} without changing scene or character behavior. */
export const homeAssets: Record<keyof typeof art, HomeAsset> = Object.fromEntries(
  Object.entries(art).map(([key, svg]) => [key, { svg }]),
) as Record<keyof typeof art, HomeAsset>;
export const homeBackground = '/art/home-room.png';
